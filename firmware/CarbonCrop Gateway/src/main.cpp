#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <time.h>

#include "PinConfig.h"
#include "NetConfig.h"
#include "E220.h"
#include "CarbonCropPacket.h"
#include "LoRaConfig.h"

// Receive CarbonCrop water level packets from the E220, print them, and publish
// each one as JSON to Mosquitto (MQTT_TOPIC_WATER). services/api/app/mqtt_bridge.py
// stores them in the database.

// Drop a partial packet if no new byte arrives for this long
constexpr uint32_t RX_GAP_TIMEOUT_MS = 500;

static E220 lora(Serial2, PIN_E220_TXD, PIN_E220_RXD,
                 PIN_E220_M0, PIN_E220_M1, PIN_E220_AUX);

static WiFiClient   wifiClient;
static PubSubClient mqtt(wifiClient);

static uint8_t  rxBuf[256];
static size_t   rxLen = 0;
static uint32_t lastByteMs = 0;

// ---- Outbox: packets waiting for MQTT (ring buffer) --------------------------
static ccp::WaterLevelPacket outbox[OUTBOX_SIZE];
static uint8_t outHead = 0, outCount = 0;

static void outboxPush(const ccp::WaterLevelPacket &p) {
    if (outCount == OUTBOX_SIZE) {   // full: drop the oldest
        outHead = (outHead + 1) % OUTBOX_SIZE;
        outCount--;
        Serial.println(F("[MQTT] outbox full, oldest packet dropped"));
    }
    outbox[(outHead + outCount) % OUTBOX_SIZE] = p;
    outCount++;
}

// ---- Printing ------------------------------------------------------------------
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

// ---- MQTT ----------------------------------------------------------------------
// {"gw":"GW-01","node":1,"seq":42,"lat":13.736717,"lon":100.523186,"tz":25200,
//  "samples":[[1795410000,-61],[1795410001,null],...]}
// samples = [unix time (UTC), mm]; tz = local UTC offset in seconds (LOCAL_UTC_OFFSET_S)
static size_t toJson(const ccp::WaterLevelPacket &p, char *buf, size_t len) {
    int n = snprintf(buf, len,
                     "{\"gw\":\"%s\",\"node\":%u,\"seq\":%u,\"lat\":%.6f,\"lon\":%.6f,\"tz\":%ld,\"samples\":[",
                     GATEWAY_ID, p.nodeId, p.seq, p.latE6 / 1e6, p.lonE6 / 1e6, (long)LOCAL_UTC_OFFSET_S);
    for (uint8_t i = 0; i < p.count && n > 0 && (size_t)n < len; i++) {
        const ccp::Sample &s = p.samples[i];
        if (s.waterLevelMm == ccp::LEVEL_INVALID)
            n += snprintf(buf + n, len - n, "%s[%lu,null]", i ? "," : "",
                          (unsigned long)s.unixTime);
        else
            n += snprintf(buf + n, len - n, "%s[%lu,%d]", i ? "," : "",
                          (unsigned long)s.unixTime, s.waterLevelMm);
    }
    if (n > 0 && (size_t)n < len) n += snprintf(buf + n, len - n, "]}");
    return (n > 0 && (size_t)n < len) ? (size_t)n : 0;   // 0 = didn't fit
}

static void flushOutbox() {
    char json[512];
    while (outCount > 0 && mqtt.connected()) {
        const ccp::WaterLevelPacket &p = outbox[outHead];
        size_t len = toJson(p, json, sizeof(json));
        if (len == 0) {
            Serial.println(F("[MQTT] JSON too long, packet dropped"));
        } else if (!mqtt.publish(MQTT_TOPIC_WATER, (const uint8_t *)json, len, false)) {
            Serial.println(F("[MQTT] publish failed, will retry"));
            return;   // keep it in the outbox
        } else {
            Serial.printf("[MQTT] published node=%u seq=%u (%u waiting)\n",
                          p.nodeId, p.seq, outCount - 1);
        }
        outHead = (outHead + 1) % OUTBOX_SIZE;
        outCount--;
    }
}

// Non-blocking: called every loop, retries at most every MQTT_RETRY_MS
static void maintainMqtt() {
    static uint32_t lastTryMs = 0;
    static bool wasWifi = false;

    bool wifiUp = WiFi.status() == WL_CONNECTED;
    if (wifiUp != wasWifi) {
        wasWifi = wifiUp;
        if (wifiUp) Serial.printf("[WiFi] connected, IP %s\n", WiFi.localIP().toString().c_str());
        else Serial.println(F("[WiFi] disconnected"));
    }
    if (!wifiUp) return;   // WiFi.setAutoReconnect handles it

    if (mqtt.connected()) {
        mqtt.loop();
        flushOutbox();
        return;
    }
    if (millis() - lastTryMs < MQTT_RETRY_MS && lastTryMs != 0) return;
    lastTryMs = millis();

    Serial.printf("[MQTT] connecting to %s:%d ... ", MQTT_HOST, MQTT_PORT);
    const char *user = MQTT_USER[0] ? MQTT_USER : nullptr;
    const char *pass = MQTT_PASSWORD[0] ? MQTT_PASSWORD : nullptr;
    if (mqtt.connect("carboncrops-" GATEWAY_ID, user, pass,
                     MQTT_TOPIC_STATUS, 1, true, "offline")) {
        Serial.println(F("ok"));
        mqtt.publish(MQTT_TOPIC_STATUS, "online", true);
        flushOutbox();
    } else {
        Serial.printf("failed (state %d), retry in %lu s\n", mqtt.state(),
                      (unsigned long)(MQTT_RETRY_MS / 1000));
    }
}

// ---- LoRa receive ----------------------------------------------------------------
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
            outboxPush(pkt);
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

    Serial.println(F("\nCarbonCrop gateway " GATEWAY_ID));

    // Bigger UART buffer so packets aren't lost while an MQTT connect blocks
    lora.serial().setRxBufferSize(1024);
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

    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.printf("[WiFi] connecting to \"%s\" ...\n", WIFI_SSID);

    mqtt.setServer(MQTT_HOST, MQTT_PORT);
    mqtt.setBufferSize(640);    // JSON (~300 B) + topic + MQTT header
    mqtt.setSocketTimeout(3);   // don't block LoRa for long if the broker is gone

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

    maintainMqtt();
}
