#pragma once
// =============================================================================
//  AppConfig.h — timing of the measurement sequence (run by src/App.cpp)
//
//  One cycle = one LoRa packet:
//
//      read GPS
//      repeat APP_SAMPLES_PER_PACKET times:              (default 10)
//          read RTC              -> timestamp of this sample
//          power on ultrasonic   -> wait HCSR04_WARMUP_MS
//          read ultrasonic APP_ULTRASONIC_READS times    (default 10)
//                                   APP_ULTRASONIC_READ_INTERVAL_MS apart
//          filter                -> keep only valid readings, median (APP_ULTRASONIC_FILTER)
//          calibrate             -> HCSR04.h scale/offset, then water level
//          wait until APP_SAMPLE_INTERVAL_MS after this sample started
//      send packet  [GPS] { [time][water level] x N }
//      wait APP_PACKET_PAUSE_MS, then start the next cycle
//
//  With the defaults: one sample every 10 s, one packet every ~100 s.
// =============================================================================
#include <Arduino.h>
#include "CarbonCropPacket.h"
#include "Filter.h"
#include "HCSR04.h"

// ---- Sampling ---------------------------------------------------------------
// Samples per packet (1..ccp::MAX_SAMPLES = 10)
#define APP_SAMPLES_PER_PACKET  10

// Time from the start of one sample to the start of the next [ms]
#define APP_SAMPLE_INTERVAL_MS  10000UL

// ---- Ultrasonic readings per sample -----------------------------------------------
// One sample = APP_ULTRASONIC_READS single readings, filtered into one water level
#define APP_ULTRASONIC_READS             10
#define APP_ULTRASONIC_READ_INTERVAL_MS  500UL   // between readings

// ---- Filtering the readings of one sample (Filter.h) --------------------------------
// Mean, Median (robust against single bad echoes) or TrimmedMean
#define APP_ULTRASONIC_FILTER      FilterType::Median
#define APP_ULTRASONIC_TRIM_COUNT  2   // TrimmedMean only: readings dropped at each end
// Fewest valid readings for a usable sample; fewer = sent as "no reading"
#define APP_ULTRASONIC_MIN_VALID   5

// ---- Sending ----------------------------------------------------------------
// Extra wait after a packet is sent, before the next cycle's GPS read [ms].
// 0 = keep the samples evenly spaced across packets.
#define APP_PACKET_PAUSE_MS  0UL

// ---- Start-up -----------------------------------------------------------------
// Wait after boot before the first cycle [ms] (time to open the serial monitor)
#define APP_STARTUP_DELAY_MS  2000UL

// ---- Checks -------------------------------------------------------------------
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

static_assert(APP_SAMPLE_INTERVAL_MS > APP_ULTRASONIC_SAMPLE_MS,
              "APP_SAMPLE_INTERVAL_MS is shorter than the ultrasonic readings of one sample");
