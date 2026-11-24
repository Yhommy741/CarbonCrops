#pragma once
// =============================================================================
//  Ultrasonic.h — HC-SR04 type ultrasonic sensor: raw distance only
//
//  One reading per call, no filtering or calibration. Repeating, filtering
//  and calibrating are done by the caller (src/App.cpp). Constants: HCSR04.h
// =============================================================================
#include <Arduino.h>
#include "HCSR04.h"

// Configure POWER/TRIG/ECHO pins (sensor starts powered off). Call once in setup().
void ultrasonicBegin();

// Switch sensor VCC (PIN_ULTRASONIC_POWER). Doesn't wait: after power on,
// wait HCSR04_WARMUP_MS before the first ultrasonicReadCm().
void ultrasonicPowerOn();
void ultrasonicPowerOff();

// One reading: distance from the sensor face [cm], or NAN when there is no
// echo or it is outside HCSR04_MIN/MAX_DISTANCE_CM. Blocks up to ~30 ms.
float ultrasonicReadCm(float temperatureC = HCSR04_TEMPERATURE_C);
