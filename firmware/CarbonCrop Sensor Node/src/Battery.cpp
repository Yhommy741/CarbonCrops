#include "Battery.h"

#include <math.h>

#include "Filter.h"
#include "PinConfig.h"

static_assert(BATTERY_ADC_SAMPLES >= 1 && BATTERY_ADC_SAMPLES <= FILTER_MAX_VALUES,
              "BATTERY_ADC_SAMPLES must be 1..FILTER_MAX_VALUES");

void batteryBegin() {
    pinMode(PIN_BATTERY_ADC, INPUT);
    analogReadResolution(12);
    analogSetPinAttenuation(PIN_BATTERY_ADC, ADC_11db);
}

float batteryReadVoltage() {
    float mv[BATTERY_ADC_SAMPLES];
    for (uint8_t i = 0; i < BATTERY_ADC_SAMPLES; i++) {
        // analogReadMilliVolts() applies the chip's factory (eFuse) calibration,
        // far more accurate than raw * 3.3 / 4095
        mv[i] = (float)analogReadMilliVolts(PIN_BATTERY_ADC);
        delayMicroseconds(BATTERY_ADC_INTERVAL_US);
    }

    // Trimmed mean: drop noise spikes at both ends, average the rest
    FilterResult f = filterApply(mv, BATTERY_ADC_SAMPLES, FilterType::TrimmedMean,
                                 1, BATTERY_ADC_TRIM);
    if (!f.ok) return NAN;

    float batteryV = (f.value / 1000.0f) * BATTERY_DIVIDER_RATIO;
    return batteryV * BATTERY_CAL_SCALE + BATTERY_CAL_OFFSET_V;
}

float batteryVoltageToPercent(float voltage) {
    if (isnan(voltage)) return NAN;
    float mv = voltage * 1000.0f;

    // Table is sorted high -> low voltage; clamp outside it
    if (mv >= BATTERY_OCV_TABLE[0].mv) return BATTERY_OCV_TABLE[0].percent;
    const BatteryOcvPoint &last = BATTERY_OCV_TABLE[BATTERY_OCV_TABLE_LEN - 1];
    if (mv <= last.mv) return last.percent;

    for (size_t i = 1; i < BATTERY_OCV_TABLE_LEN; i++) {
        const BatteryOcvPoint &hi = BATTERY_OCV_TABLE[i - 1];
        const BatteryOcvPoint &lo = BATTERY_OCV_TABLE[i];
        if (mv >= lo.mv) {
            float t = (mv - lo.mv) / (float)(hi.mv - lo.mv);
            return lo.percent + t * (hi.percent - lo.percent);
        }
    }
    return 0.0f;   // not reached
}

BatteryResult batteryRead() {
    BatteryResult r;
    r.voltage = batteryReadVoltage();
    r.percent = batteryVoltageToPercent(r.voltage);

    if      (isnan(r.voltage) || r.voltage <= BATTERY_EMPTY_V) r.status = BatteryStatus::Empty;
    else if (r.voltage <= BATTERY_CRITICAL_V)                  r.status = BatteryStatus::Critical;
    else if (r.voltage <= BATTERY_LOW_V)                       r.status = BatteryStatus::Low;
    else                                                       r.status = BatteryStatus::Ok;
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
