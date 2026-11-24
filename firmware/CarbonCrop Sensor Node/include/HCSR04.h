#pragma once
// =============================================================================
//  HCSR04.h — setup and calibration constants of the ultrasonic sensor
//  (HC-SR04 type: HC-SR04 / HC-SR04P / JSN-SR04T / AJ-SR04M)
//
//  Ultrasonic.cpp only uses the timing/range values to take one raw reading.
//  Calibration is applied by src/App.cpp after filtering, then the water
//  level is calculated from the pipe installation (PipeConfig.h):
//
//      distance    = filtered_raw * HCSR04_CAL_SCALE + HCSR04_CAL_OFFSET_CM
//      water level = PIPE_SENSOR_TO_GROUND_CM - distance
// =============================================================================
#include <Arduino.h>

// ---- Speed of sound ---------------------------------------------------------
// Changes ~0.6 m/s per °C (~0.17 %/°C): a 10 °C error gives ~1.7 cm at 1 m.
// Set to the expected air temperature at the field, or pass a measured value
// to ultrasonicReadCm() once a temperature sensor is added.
#define HCSR04_TEMPERATURE_C  30.0f

// Speed of sound in air [m/s] at temperature tempC [°C]
// (a function can't be a #define value, so this stays constexpr)
constexpr float hcsr04SpeedOfSoundMps(float tempC) {
    return 331.3f + 0.606f * tempC;
}

// ---- Timing -------------------------------------------------------------------
#define HCSR04_TRIG_PULSE_US  20      // trigger pulse: JSN-SR04T ~20 us, HC-SR04 10 us
#define HCSR04_WARMUP_MS      500UL   // after power on, before the first reading

// ---- Valid range ----------------------------------------------------------------
// Readings outside this window are returned as NAN (no echo / blind zone)
#define HCSR04_MIN_DISTANCE_CM  20.0f    // JSN-SR04T blind zone (HC-SR04: ~2 cm)
#define HCSR04_MAX_DISTANCE_CM  450.0f

// ---- Calibration ------------------------------------------------------------------
// Linear correction of the filtered distance. Find these by measuring two
// known distances with a ruler:
//   scale  = (true2 - true1) / (read2 - read1)
//   offset = true1 - read1 * scale
#define HCSR04_CAL_SCALE      1.0f
#define HCSR04_CAL_OFFSET_CM  0.0f

// Sensor-to-ground distance (for the water level): see PipeConfig.h
