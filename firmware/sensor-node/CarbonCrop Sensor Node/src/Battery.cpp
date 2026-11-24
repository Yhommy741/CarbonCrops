#include "Battery.h"
#include "PinConfig.h"

void batteryBegin() {
    pinMode(PIN_BATTERY_ADC, INPUT);
    analogReadResolution(12);
    // 11 dB lets the pin read up to ~3.1 V; the divider keeps it near 2.1 V.
    analogSetPinAttenuation(PIN_BATTERY_ADC, ADC_11db);
}

float batteryReadVoltage() {
    uint32_t sumMv = 0;
    for (uint8_t i = 0; i < BATTERY_ADC_SAMPLES; i++) {
        // analogReadMilliVolts() uses the chip's factory (eFuse) calibration,
        // which is far more accurate than raw * 3.3 / 4095.
        sumMv += analogReadMilliVolts(PIN_BATTERY_ADC);
        delayMicroseconds(100);
    }
    float adcV = (sumMv / (float)BATTERY_ADC_SAMPLES) / 1000.0f;
    float batteryV = adcV * BATTERY_DIVIDER_RATIO;
    return batteryV * BATTERY_CAL_SCALE + BATTERY_CAL_OFFSET_V;
}

uint8_t batteryVoltageToPercent(float voltage) {
    // Curve is sorted high -> low voltage
    if (voltage >= BATTERY_CURVE[0].voltage) return BATTERY_CURVE[0].percent;
    if (voltage <= BATTERY_CURVE[BATTERY_CURVE_LEN - 1].voltage)
        return BATTERY_CURVE[BATTERY_CURVE_LEN - 1].percent;

    for (size_t i = 1; i < BATTERY_CURVE_LEN; i++) {
        const BatteryCurvePoint &hi = BATTERY_CURVE[i - 1];
        const BatteryCurvePoint &lo = BATTERY_CURVE[i];
        if (voltage >= lo.voltage) {
            float t = (voltage - lo.voltage) / (hi.voltage - lo.voltage);
            float pct = lo.percent + t * (hi.percent - lo.percent);
            return (uint8_t)(pct + 0.5f);
        }
    }
    return 0;  // not reached
}

BatteryResult batteryRead() {
    BatteryResult r;
    r.voltage = batteryReadVoltage();
    r.percent = batteryVoltageToPercent(r.voltage);

    if      (r.voltage <= BATTERY_EMPTY_V)    r.status = BatteryStatus::Empty;
    else if (r.voltage <= BATTERY_CRITICAL_V) r.status = BatteryStatus::Critical;
    else if (r.voltage <= BATTERY_LOW_V)      r.status = BatteryStatus::Low;
    else                                      r.status = BatteryStatus::Ok;
    return r;
}

const char *batteryStatusName(BatteryStatus status) {
    switch (status) {
        case BatteryStatus::Ok:       return "OK";
        case BatteryStatus::Low:      return "LOW";
        case BatteryStatus::Critical: return "CRITICAL";
        case BatteryStatus::Empty:    return "EMPTY";
    }
    return "?";
}
