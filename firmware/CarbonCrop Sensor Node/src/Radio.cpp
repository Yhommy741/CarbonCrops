#include "Radio.h"

#include "E220.h"
#include "LoRaConfig.h"
#include "PinConfig.h"

static E220 lora(Serial2, PIN_E220_TXD, PIN_E220_RXD,
                 PIN_E220_M0, PIN_E220_M1, PIN_E220_AUX);

bool radioBegin() {
    if (!lora.begin()) {
        Serial.println(F("E220: AUX stays LOW - check power and wiring"));
        return false;
    }
    if (!lora.ensureChannel(E220_CHANNEL)) {
        Serial.println(F("E220: no reply to config read/write"));
        return false;
    }
    return true;
}

bool radioSend(const void *data, size_t len) {
    return lora.send(data, len);
}

void radioEnd() {
    Serial2.end();
    pinMode(PIN_E220_TXD, INPUT);
    pinMode(PIN_E220_RXD, INPUT);
    pinMode(PIN_E220_M0,  INPUT);
    pinMode(PIN_E220_M1,  INPUT);
    pinMode(PIN_E220_AUX, INPUT);
}
