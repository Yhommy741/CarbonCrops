#pragma once
// =============================================================================
//  AppConfig.h — timing of the measurement sequence (run by src/App.cpp)
//
//  The node deep-sleeps between samples. Each wake takes one sample; the
//  wake that fills the packet also reads GPS and sends it:
//
//      wake 1 .. N-1   read RTC -> ultrasonic x APP_ULTRASONIC_READS -> filter
//                      -> deep sleep
//      wake N          GPS + LoRa on -> wait for a GPS fix
//                      -> read RTC -> ultrasonic -> filter
//                      -> send packet [GPS] { [time][water level] x N }
//                      -> deep sleep
//
//  N = APP_SAMPLES_PER_PACKET. One wake every APP_SAMPLE_INTERVAL_MS.
//  With the defaults: one sample every 10 min, one packet every hour.
// =============================================================================
#include <Arduino.h>
#include "CarbonCropPacket.h"
#include "Filter.h"
#include "HCSR04.h"

// ---- Sampling ---------------------------------------------------------------
// Samples per packet (1..ccp::MAX_SAMPLES = 10); the last one also sends
#define APP_SAMPLES_PER_PACKET  6

// Time from the start of one wake to the start of the next [ms].
// The awake time is subtracted from the deep sleep, so the period stays fixed.
#define APP_SAMPLE_INTERVAL_MS  (10UL * 60UL * 1000UL)   // 10 min
// #define APP_SAMPLE_INTERVAL_MS  (10UL * 1000UL)       // bench test: 10 s

// Shortest deep sleep, even when a wake took longer than the interval [ms]
#define APP_MIN_SLEEP_MS  1000UL

// ---- GPS (sending wake only) ------------------------------------------------
// Longest wait for a GPS fix [ms]. The GPS is unpowered while asleep, so a
// real module needs a warm/cold start: raise this to ~60000 when it is added.
#define APP_GPS_TIMEOUT_MS  7000UL

// ---- Ultrasonic readings per sample -----------------------------------------
// One sample = APP_ULTRASONIC_READS single readings, filtered into one water level
#define APP_ULTRASONIC_READS             10
#define APP_ULTRASONIC_READ_INTERVAL_MS  500UL   // between readings

// ---- Filtering the readings of one sample (Filter.h) ------------------------
// Mean, Median (robust against single bad echoes) or TrimmedMean
#define APP_ULTRASONIC_FILTER      FilterType::Mean
#define APP_ULTRASONIC_TRIM_COUNT  2   // TrimmedMean only: readings dropped at each end
// Fewest valid readings for a usable sample; fewer = sent as "no reading"
#define APP_ULTRASONIC_MIN_VALID   5

// ---- Checks -----------------------------------------------------------------
static_assert(APP_SAMPLES_PER_PACKET >= 1 &&
              APP_SAMPLES_PER_PACKET <= ccp::MAX_SAMPLES,
              "APP_SAMPLES_PER_PACKET must be 1..10 (one LoRa packet)");

static_assert(APP_ULTRASONIC_READS >= 1 && APP_ULTRASONIC_READS <= FILTER_MAX_VALUES,
              "APP_ULTRASONIC_READS must be 1..FILTER_MAX_VALUES");

static_assert(APP_ULTRASONIC_MIN_VALID >= 1 && APP_ULTRASONIC_MIN_VALID <= APP_ULTRASONIC_READS,
              "APP_ULTRASONIC_MIN_VALID must be 1..APP_ULTRASONIC_READS");

// Time the ultrasonic part of one sample takes (warm-up + readings + ~50 ms margin each)
#define APP_ULTRASONIC_SAMPLE_MS                                              \
    (HCSR04_WARMUP_MS +                                                       \
     (uint32_t)(APP_ULTRASONIC_READS - 1) * APP_ULTRASONIC_READ_INTERVAL_MS + \
     (uint32_t)APP_ULTRASONIC_READS * 50UL)

static_assert(APP_SAMPLE_INTERVAL_MS > APP_ULTRASONIC_SAMPLE_MS + APP_MIN_SLEEP_MS,
              "APP_SAMPLE_INTERVAL_MS is shorter than the ultrasonic readings of one sample");
// The sending wake also waits up to APP_GPS_TIMEOUT_MS for a fix. If it runs
// past the interval, that one sleep is shortened to APP_MIN_SLEEP_MS.
