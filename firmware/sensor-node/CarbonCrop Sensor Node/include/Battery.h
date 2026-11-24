#pragma once
// =============================================================================
//  Battery.h — battery voltage and state of charge from the divider ADC
// =============================================================================
#include <Arduino.h>
#include "BatteryConfig.h"

enum class BatteryStatus : uint8_t {
    Ok,         // above BATTERY_LOW_V
    Low,        // <= BATTERY_LOW_V
    Critical,   // <= BATTERY_CRITICAL_V
    Empty,      // <= BATTERY_EMPTY_V
};

struct BatteryResult {
    float         voltage;   // battery voltage [V] after divider + calibration
    uint8_t       percent;   // 0–100 from BATTERY_CURVE
    BatteryStatus status;
};

// Configure the ADC pin (11 dB attenuation). Call once in setup().
void batteryBegin();

// Average BATTERY_ADC_SAMPLES readings and return the battery voltage [V].
float batteryReadVoltage();

// Convert a battery voltage to 0–100 % using BATTERY_CURVE (linear
// interpolation between points, clamped at both ends).
uint8_t batteryVoltageToPercent(float voltage);

// Read voltage, percent and status in one call.
BatteryResult batteryRead();

const char *batteryStatusName(BatteryStatus status);
