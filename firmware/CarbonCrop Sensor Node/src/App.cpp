// =============================================================================
//  App.cpp — measurement state machine of the sensor node
//
//  Every wake takes one sample, then deep-sleeps. The packet being filled is
//  kept in RTC memory, which survives deep sleep.
//
//  [OpMode::Read]         ReadRtc ─▶ UltrasonicOn ─▶ ReadUltrasonic ─▶ Filter
//                           ─▶ Sleep
//  [OpMode::ReadGpsLora]  PowerSettle ─▶ WaitGps ─▶ (same as Read) ─▶ Send
//                           ─▶ Sleep
//  [OpMode::Sleep]        Sleep
//
//  Hardware lives in the modules: Power (MOSFETs, deep sleep), Radio (E220),
//  Gps, Rtc, Ultrasonic, Filter. Timing: AppConfig.h.
// =============================================================================
#include "App.h"

#include <esp_attr.h>
#include <esp_timer.h>

#include "AppConfig.h"
#include "CarbonCropPacket.h"
#include "Gps.h"
#include "HCSR04.h"
#include "NodeConfig.h"
#include "PinConfig.h"
#include "PipeConfig.h"
#include "Power.h"
#include "Radio.h"
#include "Rtc.h"
#include "Ultrasonic.h"

// ---- Kept through deep sleep (RTC memory; reset on power-on) -----------------
RTC_DATA_ATTR static ccp::WaterLevelPacket rtcPkt;
RTC_DATA_ATTR static uint8_t  rtcSampleIdx = 0;   // samples already in rtcPkt
RTC_DATA_ATTR static uint16_t rtcTxSeq     = 0;
RTC_DATA_ATTR static OpMode   rtcMode      = OpMode::Read;
RTC_DATA_ATTR static bool     rtcAutoCycle = true;

// ---- States within one wake -----------------------------------------------------
enum class State : uint8_t {
    PowerSettle,      // GPS + LoRa just powered: wait POWER_SETTLE_MS, start them
    WaitGps,          // read GPS until a fix or APP_GPS_TIMEOUT_MS
    ReadRtc,          // timestamp of this sample, power on the ultrasonic
    UltrasonicOn,     // wait HCSR04_WARMUP_MS
    ReadUltrasonic,   // APP_ULTRASONIC_READS readings
    Filter,           // filter -> water level -> into rtcPkt
    Send,             // send rtcPkt over LoRa
    Sleep,            // everything off, deep sleep
};

static State    state       = State::Sleep;
static uint32_t waitUntilMs = 0;
static float    readingsCm[APP_ULTRASONIC_READS];
static uint8_t  readIdx     = 0;

// ---- Helpers ------------------------------------------------------------------

static const char *modeName(OpMode m) {
    switch (m) {
        case OpMode::Sleep:       return "SLEEP";
        case OpMode::Read:        return "READ";
        case OpMode::ReadGpsLora: return "READ+GPS+LORA";
    }
    return "?";
}

static bool reached(uint32_t t) {
    return (int32_t)(millis() - t) >= 0;
}

static void blink(uint8_t count) {
    for (uint8_t i = 0; i < count; i++) {
        digitalWrite(PIN_STATUS_LED, HIGH);
        delay(80);
        digitalWrite(PIN_STATUS_LED, LOW);
        delay(120);
    }
}

// The wake that takes the last sample of a packet also sends it
static OpMode autoMode() {
    return (rtcSampleIdx + 1 >= APP_SAMPLES_PER_PACKET) ? OpMode::ReadGpsLora
                                                        : OpMode::Read;
}

static void startPacket() {
    rtcPkt        = {};
    rtcPkt.nodeId = NODE_ID;
    rtcPkt.seq    = rtcTxSeq;
    rtcSampleIdx  = 0;
}

static float waterLevelCm(float distanceCm) {
    return PIPE_SENSOR_TO_GROUND_CM - distanceCm;
}

static int16_t levelCmToMm(float levelCm) {
    if (isnan(levelCm)) return ccp::LEVEL_INVALID;
    return (int16_t)lroundf(levelCm * 10.0f);
}

// ---- Steps --------------------------------------------------------------------

static void stepPowerSettle() {
    if (!reached(waitUntilMs)) return;
    gpsBegin();
    radioBegin();
    waitUntilMs = millis() + APP_GPS_TIMEOUT_MS;
    state = State::WaitGps;
}

static void stepWaitGps() {
    GpsFix fix = {};
    gpsRead(fix);
    if (!fix.valid && !reached(waitUntilMs)) return;   // keep waiting

    rtcPkt.latE6 = fix.valid ? (int32_t)lround(fix.latitude  * 1e6) : 0;
    rtcPkt.lonE6 = fix.valid ? (int32_t)lround(fix.longitude * 1e6) : 0;
    if (fix.valid)
        Serial.printf("[WaitGps] GPS %.6f, %.6f\n", fix.latitude, fix.longitude);
    else
        Serial.println(F("[WaitGps] GPS no fix (timeout)"));

    state = State::ReadRtc;
}

static void stepReadRtc() {
    rtcPkt.samples[rtcSampleIdx].unixTime = (uint32_t)rtcNow();

    if (USE_DUMMY_DATA) {
        state = State::Filter;
        return;
    }
    ultrasonicBegin();
    ultrasonicPowerOn();
    waitUntilMs = millis() + HCSR04_WARMUP_MS;
    state = State::UltrasonicOn;
}

static void stepUltrasonicOn() {
    if (!reached(waitUntilMs)) return;
    readIdx = 0;
    waitUntilMs = millis();   // first reading right away
    state = State::ReadUltrasonic;
}

static void stepReadUltrasonic() {
    if (!reached(waitUntilMs)) return;

    readingsCm[readIdx++] = ultrasonicReadCm();   // one reading, NAN = invalid
    if (readIdx < APP_ULTRASONIC_READS) {
        waitUntilMs += APP_ULTRASONIC_READ_INTERVAL_MS;
        return;   // stay here for the next reading
    }
    ultrasonicPowerOff();
    state = State::Filter;
}

static void stepFilter() {
    ccp::Sample &s = rtcPkt.samples[rtcSampleIdx];
    char ts[24];
    rtcFormatLocal(s.unixTime, ts, sizeof(ts));
    Serial.printf("  #%u/%u %s  ", rtcSampleIdx + 1, APP_SAMPLES_PER_PACKET, ts);

    if (USE_DUMMY_DATA) {
        s.waterLevelMm = DUMMY_WATER_LEVEL_MM[rtcSampleIdx % DUMMY_WATER_LEVEL_COUNT];
        Serial.printf("water level=%.1f cm (dummy)\n", s.waterLevelMm / 10.0f);
    } else {
        FilterResult f = filterApply(readingsCm, APP_ULTRASONIC_READS,
                                     APP_ULTRASONIC_FILTER,
                                     APP_ULTRASONIC_MIN_VALID,
                                     APP_ULTRASONIC_TRIM_COUNT);
        // Calibration (HCSR04.h), then water level (PipeConfig.h); NAN stays NAN
        float distanceCm = f.value * HCSR04_CAL_SCALE + HCSR04_CAL_OFFSET_CM;
        float levelCm    = waterLevelCm(distanceCm);
        s.waterLevelMm   = f.ok ? levelCmToMm(levelCm) : ccp::LEVEL_INVALID;

        if (f.ok)
            Serial.printf("water level=%.1f cm  (distance %.1f cm, %s of %u/%u valid)\n",
                          levelCm, distanceCm, filterTypeName(APP_ULTRASONIC_FILTER),
                          f.validCount, APP_ULTRASONIC_READS);
        else
            Serial.printf("invalid (only %u/%u valid readings, need %u)\n",
                          f.validCount, APP_ULTRASONIC_READS,
                          APP_ULTRASONIC_MIN_VALID);

        Serial.print(F("      readings [cm]:"));
        for (uint8_t i = 0; i < APP_ULTRASONIC_READS; i++) {
            if (isnan(readingsCm[i])) Serial.print(F(" --"));
            else                      Serial.printf(" %.1f", readingsCm[i]);
        }
        Serial.println();
    }

    rtcSampleIdx++;
    rtcPkt.count = rtcSampleIdx;
    state = (rtcMode == OpMode::ReadGpsLora) ? State::Send : State::Sleep;
}

static void stepSend() {
    ccp::finalize(rtcPkt);
    digitalWrite(PIN_STATUS_LED, HIGH);
    bool sent = radioSend(&rtcPkt, sizeof(rtcPkt));
    digitalWrite(PIN_STATUS_LED, LOW);

    Serial.printf("[Send] node=%u seq=%u  %u samples  %u bytes  %s\n",
                  rtcPkt.nodeId, rtcPkt.seq, rtcPkt.count,
                  (unsigned)sizeof(rtcPkt), sent ? "sent" : "FAILED (AUX timeout)");

    rtcTxSeq++;
    startPacket();
    state = State::Sleep;
}

static void stepSleep() {
    // Float every module pin before the power is cut, so nothing leaks into
    // an unpowered module
    ultrasonicEnd();
    gpsEnd();
    radioEnd();
    pinMode(PIN_STATUS_LED, INPUT);

    // Subtract this wake's time (since boot) so wakes stay APP_SAMPLE_INTERVAL_MS apart
    const uint64_t periodUs   = (uint64_t)APP_SAMPLE_INTERVAL_MS * 1000ULL;
    const uint64_t minSleepUs = (uint64_t)APP_MIN_SLEEP_MS * 1000ULL;
    const uint64_t awakeUs    = (uint64_t)esp_timer_get_time();
    const uint64_t sleepUs    = (awakeUs + minSleepUs < periodUs) ? periodUs - awakeUs
                                                                  : minSleepUs;

    Serial.printf("[Sleep] awake %.1f s, deep sleep %.1f s (next: sample %u/%u)\n",
                  awakeUs / 1e6, sleepUs / 1e6,
                  rtcSampleIdx + 1, APP_SAMPLES_PER_PACKET);
    Serial.flush();

    powerDeepSleep(sleepUs);
}

// ---- Public API -----------------------------------------------------------------

void appSetMode(OpMode mode, bool autoCycle) {
    rtcMode      = mode;
    rtcAutoCycle = autoCycle;

    switch (mode) {
        case OpMode::Sleep:
            state = State::Sleep;
            break;

        case OpMode::Read:
            blink(1);
            state = State::ReadRtc;
            break;

        case OpMode::ReadGpsLora:
            blink(2);
            powerGps(true);
            powerLora(true);
            waitUntilMs = millis() + POWER_SETTLE_MS;
            state = State::PowerSettle;
            break;
    }
}

OpMode appGetMode() {
    return rtcMode;
}

void appBegin() {
    powerBegin();
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);
    rtcBegin();

    if (rtcSampleIdx == 0) startPacket();
    if (rtcSampleIdx >= ccp::MAX_SAMPLES) {   // only with a forced Read mode
        Serial.println(F("[warn] packet full without a send - samples dropped"));
        startPacket();
    }
    if (rtcAutoCycle) rtcMode = autoMode();

    Serial.printf("\nCarbonCrop sensor node %u | wake: %s (sample %u/%u)\n",
                  NODE_ID, modeName(rtcMode),
                  rtcSampleIdx + 1, APP_SAMPLES_PER_PACKET);

    appSetMode(rtcMode, rtcAutoCycle);
}

void appLoop() {
    switch (state) {
        case State::PowerSettle:    stepPowerSettle();    break;
        case State::WaitGps:        stepWaitGps();        break;
        case State::ReadRtc:        stepReadRtc();        break;
        case State::UltrasonicOn:   stepUltrasonicOn();   break;
        case State::ReadUltrasonic: stepReadUltrasonic(); break;
        case State::Filter:         stepFilter();         break;
        case State::Send:           stepSend();           break;
        case State::Sleep:          stepSleep();          break;
    }
}
