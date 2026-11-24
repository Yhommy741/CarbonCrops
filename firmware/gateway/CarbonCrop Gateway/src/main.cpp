#include <Arduino.h>
#include <time.h>

#include "PinConfig.h"
#include "E220.h"
#include "CarbonCropPacket.h"
#include "LoRaConfig.h"

// Receive CarbonCrop water level packets from the E220 and print them.
// Later: forward to MQTT.

constexpr int32_t LOCAL_UTC_OFFSET_S = 7 * 3600;   // print times in UTC+7

// Drop a partial packet if no new byte arrives for this long
constexpr uint32_t RX_GAP_TIMEOUT_MS = 500;

static E220 lora(Serial2, PIN_E220_TXD, PIN_E220_RXD,
                 PIN_E220_M0, PIN_E220_M1, PIN_E220_AUX);

static uint8_t  rxBuf[256];
static size_t   rxLen = 0;
static uint32_t lastByteMs = 0;

static void formatLocalTime(uint32_t utc, char *buf, size_t len) {
    time_t local = (time_t)utc + LOCAL_UTC_OFFSET_S;
    tm t;
    gmtime_r(&local, &t);
    strftime(buf, len, "%Y-%m-%d %H:%M:%S", &t);
}

static void printPacket(const ccp::WaterLevelPacket &p) {
    Serial.printf("\n[RX] node=%u seq=%u  %u bytes\n", p.nodeId, p.seq,
                  (unsigned)sizeof(p));
    Serial.printf("  GPS  %.6f, %.6f\n", p.latE6 / 1e6, p.lonE6 / 1e6);

    char ts[24];
    for (uint8_t i = 0; i < p.count; i++) {
        formatLocalTime(p.samples[i].unixTime, ts, sizeof(ts));
        Serial.printf("  #%u %s  ", i + 1, ts);
        if (p.samples[i].waterLevelMm == ccp::LEVEL_INVALID)
            Serial.println(F("invalid"));
        else
            Serial.printf("water level=%.1f cm\n",
                          p.samples[i].waterLevelMm / 10.0f);
    }
}

static void dropBytes(size_t n) {
    memmove(rxBuf, rxBuf + n, rxLen - n);
    rxLen -= n;
}

// Find packets in rxBuf: look for the 'CC' header, then check the CRC
static void parseBuffer() {
    constexpr size_t PKT_SIZE = sizeof(ccp::WaterLevelPacket);

    while (rxLen >= 2) {
        // Skip to the next header
        size_t i = 0;
        while (i + 1 < rxLen &&
               !(rxBuf[i] == ccp::MAGIC0 && rxBuf[i + 1] == ccp::MAGIC1)) i++;
        if (i > 0) {
            Serial.printf("[RX] skipped %u stray byte(s)\n", (unsigned)i);
            dropBytes(i);
        }
        if (rxLen < PKT_SIZE) return;   // wait for the rest

        ccp::WaterLevelPacket pkt;
        memcpy(&pkt, rxBuf, PKT_SIZE);
        if (ccp::isValid(pkt)) {
            digitalWrite(PIN_STATUS_LED, HIGH);
            printPacket(pkt);
            digitalWrite(PIN_STATUS_LED, LOW);
            dropBytes(PKT_SIZE);
        } else {
            Serial.println(F("[RX] bad CRC / header - resyncing"));
            dropBytes(1);   // header was a false match, search again
        }
    }
}

void setup() {
    Serial.begin(115200);
    delay(500);

    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, LOW);

    Serial.println(F("\nCarbonCrop gateway"));

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

    Serial.println(F("Listening..."));
}

void loop() {
    HardwareSerial &s = lora.serial();
    while (s.available()) {
        if (rxLen == sizeof(rxBuf)) dropBytes(1);   // overflow: drop oldest
        rxBuf[rxLen++] = (uint8_t)s.read();
        lastByteMs = millis();
    }

    parseBuffer();

    if (rxLen > 0 && millis() - lastByteMs > RX_GAP_TIMEOUT_MS) {
        Serial.printf("[RX] incomplete packet (%u bytes) dropped\n",
                      (unsigned)rxLen);
        rxLen = 0;
    }
}
