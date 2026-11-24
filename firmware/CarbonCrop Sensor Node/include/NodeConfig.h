#pragma once
// =============================================================================
//  NodeConfig.h — identity, position and reporting interval of this node
// =============================================================================
#include <Arduino.h>

// Unique per sensor node. The gateway uses it to tell nodes apart.
#define NODE_ID  1

// ---- Position -----------------------------------------------------------------
// TEST PLACEHOLDER: there is no GPS module yet, so the node sends these fixed
// coordinates. Set them to the plot's location, or replace with a GPS reading.
#define NODE_LATITUDE   13.736717
#define NODE_LONGITUDE  100.523186

// ---- Clock ----------------------------------------------------------------------
// TEST PLACEHOLDER: there is no RTC module yet. At boot the ESP32 clock is set
// to the firmware build time (__DATE__ __TIME__ on the PC, local time), so
// timestamps are a few seconds behind real time and restart on every reset.
#define LOCAL_UTC_OFFSET_S  (7 * 3600)   // Thailand, UTC+7

// ---- Dummy data (LoRa link test) -------------------------------------------------
// true: skip the ultrasonic sensor and send these fixed water levels (one per
// sample, repeating), so only the E220 link is being tested. Timestamps still
// come from the clock (Rtc.h). false: real ultrasonic readings.
#define USE_DUMMY_DATA  true

// Dummy water levels [mm]: + above soil, - below soil
// (A list can't be a #define, so this one stays a constexpr array.)
constexpr int16_t DUMMY_WATER_LEVEL_MM[] = {
    -61, -64, -64, -97, -89, -86, -73, -77, -70, -66};
#define DUMMY_WATER_LEVEL_COUNT \
    (sizeof(DUMMY_WATER_LEVEL_MM) / sizeof(DUMMY_WATER_LEVEL_MM[0]))

// Measurement and send timing: see AppConfig.h
