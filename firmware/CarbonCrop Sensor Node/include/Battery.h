#pragma once
// =============================================================================
//  Battery.h — 1S LiFePO4 battery: voltage and state of charge (SoC)
//
//  Voltage is read through a resistor divider on PIN_BATTERY_ADC:
//
//      BAT+ ──[ R_TOP ]──┬──[ R_BOTTOM ]── GND
//                        ├── ADC pin
//                        └──[ 100 nF ]──── GND   (steadies the reading)
//
//      V_battery = V_adc * (R_TOP + R_BOTTOM) / R_BOTTOM
//
//  SoC comes from the cell's open-circuit voltage (OCV) through the lookup
//  table below, with linear interpolation between its 5 % steps.
//
//  ACCURACY: LiFePO4 has a very flat curve. Between ~30 % and ~90 % the
//  voltage only moves ~130 mV (about 2 mV per 1 %), so a 10 mV reading error
//  is already ~5 % SoC. For a good reading:
//    - read at rest: radio and sensor off, ideally >= a few minutes after
//      charging or a heavy load (charging/load shift the voltage by 10-50 mV)
//    - calibrate the ADC with a multimeter (BATTERY_CAL_SCALE / OFFSET)
//    - trust the low end (< 20 %) and the "full" end most; the middle is a
//      rough estimate. A coulomb counter (e.g. INA219) is needed for better.
// =============================================================================
#include <Arduino.h>

// ---- Voltage divider ----------------------------------------------------------
// 100k/100k halves 3.65 V to 1.83 V: inside the ESP32 ADC's most linear range
// (~0.15-2.45 V at 11 dB). High values keep the drain low (~18 uA).
#define BATTERY_R_TOP_OHM     100000.0f
#define BATTERY_R_BOTTOM_OHM  100000.0f
#define BATTERY_DIVIDER_RATIO \
    ((BATTERY_R_TOP_OHM + BATTERY_R_BOTTOM_OHM) / BATTERY_R_BOTTOM_OHM)

// ---- ADC reading ----------------------------------------------------------------
// Readings per measurement (<= FILTER_MAX_VALUES), combined with a trimmed mean
// that drops the BATTERY_ADC_TRIM lowest and highest (noise spikes)
#define BATTERY_ADC_SAMPLES      32
#define BATTERY_ADC_TRIM         4
#define BATTERY_ADC_INTERVAL_US  200   // between readings

// Correction after the divider ratio: V = V_measured * SCALE + OFFSET.
// Calibrate with a multimeter at two battery voltages (e.g. 3.0 V and 3.4 V):
//   scale  = (true2 - true1) / (read2 - read1)
//   offset = true1 - read1 * scale
#define BATTERY_CAL_SCALE     1.0f
#define BATTERY_CAL_OFFSET_V  0.0f

// ---- LiFePO4 cell (1S, 3.2 V nominal) --------------------------------------------
#define BATTERY_CHARGE_V    3.65f   // charger end voltage (reads high while charging)
#define BATTERY_LOW_V       3.20f   // ~20 %: report low battery
#define BATTERY_CRITICAL_V  3.00f   // ~10 %: skip LoRa TX, sleep longer
#define BATTERY_EMPTY_V     2.80f   // ~5 %: stop, protect the cell (BMS cut-off ~2.5 V)

// ---- OCV -> SoC lookup table (rested cell, ~25 °C) --------------------------------
// Typical LiFePO4 open-circuit voltage, every 5 %. Sorted high -> low voltage.
// Values in mV so the table is exact; replace with your cell's datasheet curve
// if you have it. Above the first row = 100 %, below the last = 0 %.
// (A table can't be a #define, so this one stays a constexpr array.)
struct BatteryOcvPoint {
    uint16_t mv;
    uint8_t  percent;
};

constexpr BatteryOcvPoint BATTERY_OCV_TABLE[] = {
    {3400, 100},
    {3375,  95},
    {3350,  90},
    {3335,  85},
    {3320,  80},
    {3310,  75},
    {3300,  70},
    {3285,  65},
    {3270,  60},
    {3265,  55},
    {3260,  50},
    {3255,  45},
    {3250,  40},
    {3235,  35},
    {3220,  30},
    {3210,  25},
    {3200,  20},
    {3150,  15},
    {3000,  10},
    {2800,   5},
    {2500,   0},
};

#define BATTERY_OCV_TABLE_LEN \
    (sizeof(BATTERY_OCV_TABLE) / sizeof(BATTERY_OCV_TABLE[0]))

// ---- API --------------------------------------------------------------------------
enum class BatteryStatus : uint8_t {
    Ok,         // above BATTERY_LOW_V
    Low,        // <= BATTERY_LOW_V
    Critical,   // <= BATTERY_CRITICAL_V
    Empty,      // <= BATTERY_EMPTY_V
};

struct BatteryResult {
    float         voltage;   // battery voltage [V] after divider + calibration, NAN if failed
    float         percent;   // 0.0-100.0 % from BATTERY_OCV_TABLE
    BatteryStatus status;
};

// Configure the ADC pin (12 bit, 11 dB attenuation). Call once in setup().
void batteryBegin();

// Battery voltage [V]: BATTERY_ADC_SAMPLES calibrated readings (eFuse),
// trimmed mean, divider ratio and BATTERY_CAL_*.
float batteryReadVoltage();

// 0.0-100.0 % from a rested-cell voltage, interpolated in BATTERY_OCV_TABLE.
float batteryVoltageToPercent(float voltage);

// Read voltage, percent and status in one call. Read while the radio is idle.
BatteryResult batteryRead();

const char *batteryStatusName(BatteryStatus status);
