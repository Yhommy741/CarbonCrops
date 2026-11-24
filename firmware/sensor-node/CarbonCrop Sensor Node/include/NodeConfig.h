#pragma once
// =============================================================================
//  NodeConfig.h — identity, position and reporting interval of this node
// =============================================================================
#include <Arduino.h>

// Unique per sensor node. The gateway uses it to tell nodes apart.
constexpr uint16_t NODE_ID = 1;

// ---- Position -----------------------------------------------------------------
// TEST PLACEHOLDER: there is no GPS module yet, so the node sends these fixed
// coordinates. Set them to the plot's location, or replace with a GPS reading.
constexpr double NODE_LATITUDE  = 13.736717;
constexpr double NODE_LONGITUDE = 100.523186;

// ---- Clock ----------------------------------------------------------------------
// TEST PLACEHOLDER: there is no RTC module yet. At boot the ESP32 clock is set
// to the firmware build time (__DATE__ __TIME__ on the PC, local time), so
// timestamps are a few seconds behind real time and restart on every reset.
constexpr int32_t LOCAL_UTC_OFFSET_S = 7 * 3600;   // Thailand, UTC+7

// ---- Dummy data (LoRa link test) -------------------------------------------------
// true: skip the ultrasonic sensor and send fixed test values, so only the
// E220 link is being tested. false: send real ultrasonic readings.
constexpr bool USE_DUMMY_DATA = true;

// Time of sample #1 = 2026-11-23 12:00:00 (UTC+7); each next sample +1 s
constexpr uint32_t DUMMY_START_UNIX = 1795410000;

// Water level of samples #1-#10 [mm]: + above soil, - below soil
constexpr int16_t DUMMY_WATER_LEVEL_MM[10] = {
    -61, -64, -64, -97, -89, -86, -73, -77, -70, -66};

// ---- Reporting ------------------------------------------------------------------
// One packet (10 readings) every TX_INTERVAL_MS. A 10-reading measurement
// takes about 5 s, so this must be longer than that.
constexpr uint32_t TX_INTERVAL_MS = 10000;
