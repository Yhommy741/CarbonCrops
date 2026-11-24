#pragma once
// =============================================================================
//  Ultrasonic.h — water level measurement with an ultrasonic sensor
// =============================================================================
#include <Arduino.h>
#include <time.h>
#include "MeasurementConfig.h"

struct UltrasonicResult {
    float   samplesCm[ULTRASONIC_SAMPLE_COUNT]; // raw readings, NAN = invalid
    unsigned long echoUs[ULTRASONIC_SAMPLE_COUNT]; // raw echo pulse, 0 = no echo
    time_t  sampleTime[ULTRASONIC_SAMPLE_COUNT];   // system clock at each reading
    uint8_t validCount;      // number of usable samples
    float   distanceCm;      // filtered + calibrated distance (NAN if !ok)
    float   waterLevelCm;    // SENSOR_TO_SOIL_CM - distanceCm (NAN if !ok)
    float   temperatureC;    // temperature used for compensation
    bool    ok;              // validCount >= ULTRASONIC_MIN_VALID_SAMPLES
};

// Configure POWER/TRIG/ECHO pins (sensor starts powered off). Call once in setup().
void ultrasonicBegin();

// Switch sensor VCC (PIN_ULTRASONIC_POWER). On waits ULTRASONIC_WARMUP_MS.
void ultrasonicPowerOn();
void ultrasonicPowerOff();

// One ping. Returns distance in cm, or NAN when there is no echo or the
// result is outside ULTRASONIC_MIN/MAX_DISTANCE_CM.
// If echoUsOut is given it receives the raw echo pulse width (0 = timeout).
float ultrasonicReadOnceCm(float temperatureC = AMBIENT_TEMPERATURE_C,
                           unsigned long *echoUsOut = nullptr);

// Take ULTRASONIC_SAMPLE_COUNT readings (10), waiting
// ULTRASONIC_SAMPLE_DELAY_MS (500 ms) between them, then filter and calibrate.
// Powers the sensor on before and off after. Blocks for about 4.7 s.
// Returns result.ok.
bool ultrasonicMeasure(UltrasonicResult &result,
                       float temperatureC = AMBIENT_TEMPERATURE_C);
