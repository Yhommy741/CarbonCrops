#include <Arduino.h>
#include <sys/time.h>
#include <time.h>

#include "PinConfig.h"
#include "MeasurementConfig.h"
#include "NodeConfig.h"
#include "Ultrasonic.h"
#include "E220.h"
#include "CarbonCropPacket.h"
#include "LoRaConfig.h"

// Every TX_INTERVAL_MS (10 s): take 10 ultrasonic readings, print them, and
// send one LoRa packet  [GPS] { [time][water level] x 10 }  through the E220.

static E220 lora(Serial2, PIN_E220_TXD, PIN_E220_RXD,
                 PIN_E220_M0, PIN_E220_M1, PIN_E220_AUX);
static uint16_t txSeq = 0;

// ---- Clock (placeholder until an RTC module is added) ------------------------

// Days since 1970-01-01 for a civil date (Howard Hinnant's algorithm)
static int32_t daysFromCivil(int y, unsigned m, unsigned d) {
    y -= m <= 2;
    const int era = (y >= 0 ? y : y - 399) / 400;
    const unsigned yoe = (unsigned)(y - era * 400);
    const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + (int32_t)doe - 719468;
}

// Set the ESP32 system clock from the firmware build time (local time)
static void clockBeginFromBuildTime() {
    static const char kMonths[] = "JanFebMarAprMayJunJulAugSepOctNovDec";
    char mon[4] = {0};
    int day, year, hh, mm, ss;
    sscanf(__DATE__, "%3s %d %d", mon, &day, &year);
    sscanf(__TIME__, "%d:%d:%d", &hh, &mm, &ss);
    unsigned month = (unsigned)((strstr(kMonths, mon) - kMonths) / 3 + 1);

    time_t local = (time_t)daysFromCivil(year, month, day) * 86400 +
                   hh * 3600 + mm * 60 + ss;
    timeval tv = {local - LOCAL_UTC_OFFSET_S, 0};
    settimeofday(&tv, nullptr);
}

static void formatLocalTime(time_t utc, char *buf, size_t len) {
    time_t local = utc + LOCAL_UTC_OFFSET_S;
    tm t;
    gmtime_r(&local, &t);
    strftime(buf, len, "%Y-%m-%d %H:%M:%S", &t);
}

// ---- Measure + send ----------------------------------------------------------

static int16_t toLevelMm(float distanceCm) {
    if (isnan(distanceCm)) return ccp::LEVEL_INVALID;
    float corrected = distanceCm * DISTANCE_CAL_SCALE + DISTANCE_CAL_OFFSET_CM;
    float levelMm = (SENSOR_TO_SOIL_CM - corrected) * 10.0f;
    return (int16_t)lroundf(levelMm);
}

// Send fixed test values: fixed GPS, fixed times, fixed water levels
static void sendDummy() {
    digitalWrite(PIN_STATUS_LED, HIGH);

    ccp::WaterLevelPacket pkt = {};
    pkt.nodeId = NODE_ID;
    pkt.seq    = txSeq++;
    pkt.latE6  = (int32_t)lround(NODE_LATITUDE * 1e6);
    pkt.lonE6  = (int32_t)lround(NODE_LONGITUDE * 1e6);
    pkt.count  = ccp::MAX_SAMPLES;

    Serial.println(F("\nDummy data:"));
    char ts[24];
    for (uint8_t i = 0; i < pkt.count; i++) {
        pkt.samples[i].unixTime     = DUMMY_START_UNIX + i;
        pkt.samples[i].waterLevelMm = DUMMY_WATER_LEVEL_MM[i];

        formatLocalTime(pkt.samples[i].unixTime, ts, sizeof(ts));
        Serial.printf("  #%u %s  water level=%.1f cm\n", i + 1, ts,
                      pkt.samples[i].waterLevelMm / 10.0f);
    }

    ccp::finalize(pkt);
    bool sent = lora.send(&pkt, sizeof(pkt));
    digitalWrite(PIN_STATUS_LED, LOW);

    Serial.printf("[TX] node=%u seq=%u  %u bytes  %s\n", pkt.nodeId, pkt.seq,
                  (unsigned)sizeof(pkt), sent ? "sent" : "FAILED (AUX timeout)");
}

static void measureAndSend() {
    Serial.println(F("\nMeasuring water level..."));
    digitalWrite(PIN_STATUS_LED, HIGH);

    UltrasonicResult r;
    ultrasonicMeasure(r);

    ccp::WaterLevelPacket pkt = {};
    pkt.nodeId = NODE_ID;
    pkt.seq    = txSeq++;
    pkt.latE6  = (int32_t)lround(NODE_LATITUDE * 1e6);
    pkt.lonE6  = (int32_t)lround(NODE_LONGITUDE * 1e6);
    pkt.count  = min<uint8_t>(ULTRASONIC_SAMPLE_COUNT, ccp::MAX_SAMPLES);

    char ts[24];
    for (uint8_t i = 0; i < pkt.count; i++) {
        pkt.samples[i].unixTime     = (uint32_t)r.sampleTime[i];
        pkt.samples[i].waterLevelMm = toLevelMm(r.samplesCm[i]);

        formatLocalTime(r.sampleTime[i], ts, sizeof(ts));
        Serial.printf("  #%u %s  ", i + 1, ts);
        if (r.echoUs[i] == 0)
            Serial.println(F("invalid (no echo / timeout)"));
        else if (isnan(r.samplesCm[i]))
            Serial.printf("invalid (out of range, echo=%lu us)\n", r.echoUs[i]);
        else
            Serial.printf("distance=%.1f cm  water level=%.1f cm\n",
                          r.samplesCm[i], pkt.samples[i].waterLevelMm / 10.0f);
    }

    if (r.ok) {
        Serial.printf("  median water level=%.1f cm  (valid %u/%u)\n",
                      r.waterLevelCm, r.validCount, ULTRASONIC_SAMPLE_COUNT);
    } else {
        Serial.printf("  only %u/%u valid samples\n",
                      r.validCount, ULTRASONIC_SAMPLE_COUNT);
    }

    ccp::finalize(pkt);
    bool sent = lora.send(&pkt, sizeof(pkt));
    digitalWrite(PIN_STATUS_LED, LOW);

    Serial.printf("[TX] node=%u seq=%u  %u bytes  %s\n", pkt.nodeId, pkt.seq,
                  (unsigned)sizeof(pkt), sent ? "sent" : "FAILED (AUX timeout)");
}

void setup() {
    Serial.begin(115200);
    delay(500);  // let the serial monitor connect

    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);

    Serial.printf("\nCarbonCrop sensor node %u\n", NODE_ID);

    clockBeginFromBuildTime();
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
}

void loop() {
    static uint32_t lastTx = 0;
    static bool first = true;

    if (first || millis() - lastTx >= TX_INTERVAL_MS) {
        first = false;
        lastTx = millis();
        if (USE_DUMMY_DATA) sendDummy();
        else                measureAndSend();
    }
}
