#pragma once
// =============================================================================
//  BatteryConfig.h — battery characteristics and voltage sense settings
//
//  Battery voltage is read through a resistor divider on PIN_BATTERY_ADC:
//
//      BAT+ ──[ R_TOP ]──┬──[ R_BOTTOM ]── GND
//                        └── ADC pin
//
//      V_battery = V_adc * (R_TOP + R_BOTTOM) / R_BOTTOM
// =============================================================================
#include <Arduino.h>

// ---- Voltage divider --------------------------------------------------------
// 100k/100k halves 4.2 V to 2.1 V, which stays in the ESP32 ADC's linear range
// at 11 dB attenuation. High values keep the quiescent drain low (~21 uA).
// Add ~100 nF from the ADC pin to GND to steady the reading.
constexpr float BATTERY_R_TOP_OHM    = 100000.0f;
constexpr float BATTERY_R_BOTTOM_OHM = 100000.0f;
constexpr float BATTERY_DIVIDER_RATIO =
    (BATTERY_R_TOP_OHM + BATTERY_R_BOTTOM_OHM) / BATTERY_R_BOTTOM_OHM;

// ---- ADC reading ------------------------------------------------------------
constexpr uint8_t BATTERY_ADC_SAMPLES = 16;   // averaged per reading
// Correction after the divider ratio: V = V_measured * SCALE + OFFSET
// Calibrate by comparing against a multimeter at two battery voltages.
constexpr float BATTERY_CAL_SCALE    = 1.0f;
constexpr float BATTERY_CAL_OFFSET_V = 0.0f;

// ---- Battery chemistry: 1S Li-ion (18650, 3.7 V nominal) --------------------
constexpr float BATTERY_FULL_V     = 4.20f;
constexpr float BATTERY_EMPTY_V    = 3.00f;  // stop measuring / deep sleep
constexpr float BATTERY_LOW_V      = 3.40f;  // report low-battery warning
constexpr float BATTERY_CRITICAL_V = 3.30f;  // skip LoRa TX, sleep longer
constexpr uint16_t BATTERY_CAPACITY_MAH = 3000;

// ---- Voltage -> state of charge -------------------------------------------
// Open-circuit discharge curve for a typical Li-ion cell at ~25 °C.
// Must be sorted from high to low voltage. Interpolate linearly between rows.
// Read the voltage while the radio is idle; TX current pulls it down.
struct BatteryCurvePoint {
    float voltage;
    uint8_t percent;
};

constexpr BatteryCurvePoint BATTERY_CURVE[] = {
    {4.20f, 100},
    {4.10f,  90},
    {4.00f,  80},
    {3.92f,  70},
    {3.86f,  60},
    {3.80f,  50},
    {3.75f,  40},
    {3.70f,  30},
    {3.65f,  20},
    {3.55f,  10},
    {3.40f,   5},
    {3.00f,   0},
};

constexpr size_t BATTERY_CURVE_LEN =
    sizeof(BATTERY_CURVE) / sizeof(BATTERY_CURVE[0]);
