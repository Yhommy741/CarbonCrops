#include "PowerLogger.h"

#if ENABLE_POWER_LOGGER

#include <Adafruit_INA219.h>
#include <Wire.h>

#include "PinConfig.h"

namespace {
constexpr uint8_t  SAMPLES_PER_ROW    = 10;
constexpr uint32_t SAMPLE_INTERVAL_MS = 10;   // 10 x 10 ms = one row per 100 ms

Adafruit_INA219 ina219;
bool     enabled      = false;
uint32_t startMs      = 0;
uint32_t nextSampleMs = 0;
uint8_t  count        = 0;
float    sumV = 0, sumI = 0, sumP = 0;
}

namespace powerlog {

bool begin() {
    Wire.begin(PIN_INA219_SDA, PIN_INA219_SCL);
    if (!ina219.begin()) {
        Serial.println(F("[PWR] ERROR: INA219 not found - power logging off"));
        return false;
    }
    // 0.1 mA resolution, up to 16 V / 400 mA.
    // If the E220 TX peaks hit the ceiling, use setCalibration_32V_2A().
    ina219.setCalibration_16V_400mA();

    Serial.println(F("Time_s,Voltage_V,Current_mA,Power_mW"));
    startMs = nextSampleMs = millis();
    enabled = true;
    return true;
}

void update() {
    if (!enabled) return;

    uint32_t now = millis();
    if ((int32_t)(now - nextSampleMs) < 0) return;   // not time yet

    nextSampleMs += SAMPLE_INTERVAL_MS;
    // Fell behind (e.g. an MQTT connect blocked for a few seconds): resync
    if ((int32_t)(now - nextSampleMs) >= 0) nextSampleMs = now + SAMPLE_INTERVAL_MS;

    sumV += ina219.getBusVoltage_V();
    sumI += ina219.getCurrent_mA();
    sumP += ina219.getPower_mW();
    if (++count < SAMPLES_PER_ROW) return;

    Serial.printf("%.2f,%.3f,%.2f,%.2f\n", (millis() - startMs) / 1000.0f,
                  sumV / count, sumI / count, sumP / count);
    count = 0;
    sumV = sumI = sumP = 0;
}

}  // namespace powerlog

#else

namespace powerlog {
bool begin() { return false; }
void update() {}
}

#endif
