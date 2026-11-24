#pragma once
// =============================================================================
//  MeasurementConfig.h — water level measurement settings
//
//  Holds everything that affects how a raw ultrasonic echo becomes a water
//  level: air temperature, sensor mounting, sampling, filtering and
//  calibration. Add new filters or calibration terms here.
// =============================================================================
#include <Arduino.h>

// ---- Air temperature (speed of sound compensation) --------------------------
// Speed of sound changes ~0.6 m/s per °C, about 0.17 %/°C.
// A 10 °C error gives ~1.7 cm error at 1 m.
// Set this to the expected air temperature at the field, or pass a measured
// value to ultrasonicMeasure() once a temperature sensor is added.
constexpr float AMBIENT_TEMPERATURE_C = 30.0f;

// Speed of sound in air [m/s] at temperature tempC [°C]
constexpr float speedOfSoundMps(float tempC) {
    return 331.3f + 0.606f * tempC;
}

// ---- Sensor mounting --------------------------------------------------------
// Distance from the sensor face down to the soil surface (field reference).
//   water level [cm] = SENSOR_TO_SOIL_CM - measured distance
//   > 0  water above soil (flooded)
//   < 0  water below soil (inside the AWD tube, e.g. -15 cm = "dry, irrigate")
constexpr float SENSOR_TO_SOIL_CM = 50.0f;

// ---- Sampling ---------------------------------------------------------------
constexpr uint8_t  ULTRASONIC_SAMPLE_COUNT     = 10;    // readings per command
constexpr uint32_t ULTRASONIC_SAMPLE_DELAY_MS  = 500;   // delay between readings
constexpr uint8_t  ULTRASONIC_TRIG_PULSE_US    = 20;    // trigger pulse width
// JSN-SR04T needs ~20 us; HC-SR04 needs 10 us.
constexpr uint32_t ULTRASONIC_WARMUP_MS        = 500;    // after power on, before 1st ping

// Readings outside this window are treated as invalid (no echo / blind zone)
constexpr float ULTRASONIC_MIN_DISTANCE_CM = 20.0f;     // JSN-SR04T blind zone
constexpr float ULTRASONIC_MAX_DISTANCE_CM = 450.0f;

// Minimum number of valid samples for a measurement to count as OK
constexpr uint8_t ULTRASONIC_MIN_VALID_SAMPLES = 5;

// ---- Filtering --------------------------------------------------------------
enum class DistanceFilter : uint8_t {
    Mean,          // average of all valid samples
    Median,        // middle value — robust against single bad echoes
    TrimmedMean,   // drop the lowest/highest N, then average
};

constexpr DistanceFilter ULTRASONIC_FILTER = DistanceFilter::Median;
constexpr uint8_t ULTRASONIC_TRIM_COUNT = 2;   // used by TrimmedMean (each end)

// ---- Calibration ------------------------------------------------------------
// Linear correction applied to the filtered distance:
//   corrected = raw * DISTANCE_CAL_SCALE + DISTANCE_CAL_OFFSET_CM
// Find these by measuring two known distances with a ruler.
constexpr float DISTANCE_CAL_SCALE     = 1.0f;
constexpr float DISTANCE_CAL_OFFSET_CM = 0.0f;
