// =============================================================================
//  App.cpp — measurement state machine of the sensor node
//
//   ReadGps ─▶ WaitSample ─▶ ReadRtc ─▶ UltrasonicOn ─▶ ReadUltrasonic ─▶ Filter ─┐
//                 ▲                    (warm-up)       (1 reading,  ↺    (valid    │
//                 │                                     x READS)          only)    │
//                 └─────────────────── more samples ──────────────────────────────┤
//                                                                   packet full    │
//   ReadGps ◀── Pause ◀── Send ◀──────────────────────────────────────────────────┘
//
//  Ultrasonic.h only takes single readings; this file repeats them and hands
//  them to Filter.h. Timing comes from AppConfig.h. Samples start on a fixed
//  schedule (start + i * APP_SAMPLE_INTERVAL_MS), so the time the readings or
//  a send take doesn't make the interval drift. Waits never block loop().
// =============================================================================
#include "App.h"

#include "AppConfig.h"
#include "CarbonCropPacket.h"
#include "E220.h"
#include "Filter.h"
#include "Gps.h"
#include "LoRaConfig.h"
#include "HCSR04.h"
#include "NodeConfig.h"
#include "PinConfig.h"
#include "PipeConfig.h"
#include "Rtc.h"
#include "Ultrasonic.h"

enum class State : uint8_t {
    ReadGps,          // start a new packet: position
    WaitSample,       // wait for the next sample's start time
    ReadRtc,          // timestamp of this sample
    UltrasonicOn,     // power the sensor, wait HCSR04_WARMUP_MS
    ReadUltrasonic,   // one reading, repeated APP_ULTRASONIC_READS times
    Filter,           // valid readings -> filter -> calibrate -> water level
    Send,             // packet full: send over LoRa
    Pause,            // APP_PACKET_PAUSE_MS before the next packet
};

static E220 lora(Serial2, PIN_E220_TXD, PIN_E220_RXD,
                 PIN_E220_M0, PIN_E220_M1, PIN_E220_AUX);

static State    state = State::ReadGps;
static uint32_t nextSampleMs = 0;   // millis() when the next sample starts
static uint32_t waitUntilMs = 0;    // warm-up / between readings / pause
static uint8_t  sampleIdx = 0;      // sample in this packet
static uint16_t txSeq = 0;
static ccp::WaterLevelPacket pkt;

// Readings of the current sample (cm from the sensor face, NAN = invalid)
static float   readingsCm[APP_ULTRASONIC_READS];
static uint8_t readIdx = 0;

static const char *stateName(State s) {
    switch (s) {
        case State::ReadGps:        return "ReadGps";
        case State::WaitSample:     return "WaitSample";
        case State::ReadRtc:        return "ReadRtc";
        case State::UltrasonicOn:   return "UltrasonicOn";
        case State::ReadUltrasonic: return "ReadUltrasonic";
        case State::Filter:         return "Filter";
        case State::Send:           return "Send";
        case State::Pause:          return "Pause";
    }
    return "?";
}

static void enter(State s) {
    state = s;
}

// true once millis() has reached t (safe across the 49-day millis() wrap)
static bool reached(uint32_t t) {
    return (int32_t)(millis() - t) >= 0;
}

// Water level from the calibrated distance (sensor face -> water surface).
// PipeConfig.h: > 0 above the ground, < 0 below it (inside the pipe).
static float waterLevelCm(float distanceCm) {
    return PIPE_SENSOR_TO_GROUND_CM - distanceCm;
}

static int16_t levelCmToMm(float levelCm) {
    if (isnan(levelCm)) return ccp::LEVEL_INVALID;
    return (int16_t)lroundf(levelCm * 10.0f);
}

// ---- Steps -------------------------------------------------------------------

static void stepReadGps() {
    GpsFix fix;
    gpsRead(fix);

    pkt = {};
    pkt.nodeId = NODE_ID;
    pkt.seq    = txSeq;
    pkt.latE6  = fix.valid ? (int32_t)lround(fix.latitude * 1e6) : 0;
    pkt.lonE6  = fix.valid ? (int32_t)lround(fix.longitude * 1e6) : 0;
    pkt.count  = 0;
    sampleIdx  = 0;

    Serial.printf("\n[%s] packet seq=%u  ", stateName(state), pkt.seq);
    if (fix.valid) Serial.printf("GPS %.6f, %.6f\n", fix.latitude, fix.longitude);
    else           Serial.println(F("GPS no fix"));

    enter(State::WaitSample);
}

static void stepReadRtc() {
    pkt.samples[sampleIdx].unixTime = (uint32_t)rtcNow();
    if (USE_DUMMY_DATA) {
        enter(State::Filter);   // no sensor: Filter uses the dummy level
        return;
    }
    ultrasonicPowerOn();
    digitalWrite(PIN_STATUS_LED, HIGH);
    waitUntilMs = millis() + HCSR04_WARMUP_MS;
    enter(State::UltrasonicOn);
}

static void stepUltrasonicOn() {
    if (!reached(waitUntilMs)) return;
    readIdx = 0;
    waitUntilMs = millis();   // first reading right away
    enter(State::ReadUltrasonic);
}

static void stepReadUltrasonic() {
    if (!reached(waitUntilMs)) return;

    readingsCm[readIdx++] = ultrasonicReadCm();   // one reading, NAN = invalid

    if (readIdx < APP_ULTRASONIC_READS) {
        waitUntilMs += APP_ULTRASONIC_READ_INTERVAL_MS;
        return;   // stay here for the next reading
    }
    ultrasonicPowerOff();
    digitalWrite(PIN_STATUS_LED, LOW);
    enter(State::Filter);
}

static void stepFilter() {
    ccp::Sample &s = pkt.samples[sampleIdx];
    char ts[24];
    rtcFormatLocal(s.unixTime, ts, sizeof(ts));
    Serial.printf("  #%u/%u %s  ", sampleIdx + 1, APP_SAMPLES_PER_PACKET, ts);

    if (USE_DUMMY_DATA) {
        s.waterLevelMm = DUMMY_WATER_LEVEL_MM[sampleIdx % DUMMY_WATER_LEVEL_COUNT];
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

    sampleIdx++;
    pkt.count = sampleIdx;

    // Next sample on the fixed schedule; if we're already late, start from now
    nextSampleMs += APP_SAMPLE_INTERVAL_MS;
    if (reached(nextSampleMs)) {
        Serial.println(F("  [warn] sample took longer than APP_SAMPLE_INTERVAL_MS"));
        nextSampleMs = millis();
    }

    enter(sampleIdx >= APP_SAMPLES_PER_PACKET ? State::Send : State::WaitSample);
}

static void stepSend() {
    ccp::finalize(pkt);
    digitalWrite(PIN_STATUS_LED, HIGH);
    bool sent = lora.send(&pkt, sizeof(pkt));
    digitalWrite(PIN_STATUS_LED, LOW);

    Serial.printf("[%s] node=%u seq=%u  %u samples  %u bytes  %s\n",
                  stateName(state), pkt.nodeId, pkt.seq, pkt.count,
                  (unsigned)sizeof(pkt), sent ? "sent" : "FAILED (AUX timeout)");
    txSeq++;

    if (APP_PACKET_PAUSE_MS > 0) {
        waitUntilMs = millis() + APP_PACKET_PAUSE_MS;
        enter(State::Pause);
    } else {
        enter(State::ReadGps);
    }
}

static void stepPause() {
    if (!reached(waitUntilMs)) return;
    if (reached(nextSampleMs)) nextSampleMs = millis();   // keep the schedule after the pause
    enter(State::ReadGps);
}

// ---- Public --------------------------------------------------------------------

void appBegin() {
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);

    Serial.printf("\nCarbonCrop sensor node %u%s\n", NODE_ID,
                  USE_DUMMY_DATA ? "  (dummy water levels)" : "");
    Serial.printf("%u samples per packet, one every %lu s, %u readings each (%s)\n",
                  APP_SAMPLES_PER_PACKET,
                  (unsigned long)(APP_SAMPLE_INTERVAL_MS / 1000),
                  APP_ULTRASONIC_READS, filterTypeName(APP_ULTRASONIC_FILTER));

    rtcBegin();
    gpsBegin();
    ultrasonicBegin();

    if (!lora.begin()) {
        Serial.println(F("E220: AUX stays LOW - check power and wiring"));
    }
    bool changed = false;
    if (!lora.ensureChannel(E220_CHANNEL, &changed)) {
        Serial.println(F("E220: no reply to config read/write"));
    } else if (changed) {
        Serial.printf("E220: channel set to %u (%.3f MHz) and saved\n",
                      E220_CHANNEL, E220_BASE_FREQ_MHZ + E220_CHANNEL);
    }
    E220::Registers reg;
    if (lora.readConfig(reg)) E220::printConfig(Serial, reg, E220_BASE_FREQ_MHZ);

    nextSampleMs = millis() + APP_STARTUP_DELAY_MS;
    enter(State::ReadGps);
}

void appLoop() {
    switch (state) {
        case State::ReadGps:        stepReadGps();        break;
        case State::WaitSample:
            if (reached(nextSampleMs)) enter(State::ReadRtc);
            break;
        case State::ReadRtc:        stepReadRtc();        break;
        case State::UltrasonicOn:   stepUltrasonicOn();   break;
        case State::ReadUltrasonic: stepReadUltrasonic(); break;
        case State::Filter:         stepFilter();         break;
        case State::Send:           stepSend();           break;
        case State::Pause:          stepPause();          break;
    }
}
