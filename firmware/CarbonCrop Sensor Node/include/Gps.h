#pragma once
// =============================================================================
//  Gps.h — position of the node (sent once per packet)
//
//  PLACEHOLDER: there is no GPS module yet. gpsRead() returns the fixed
//  NODE_LATITUDE / NODE_LONGITUDE from NodeConfig.h. Replace the body of
//  Gps.cpp when a GPS module is added; the rest of the firmware only uses
//  these functions.
// =============================================================================
#include <Arduino.h>

struct GpsFix {
    double latitude;    // degrees, + north
    double longitude;   // degrees, + east
    bool   valid;       // false = no fix (the packet then carries 0, 0)
};

// Start the GPS UART (Serial1). The module must be powered (powerGps(true)).
void gpsBegin();

// Stop the UART and float the GPS pins before its power is cut.
void gpsEnd();

// Read the current position. Returns fix.valid.
bool gpsRead(GpsFix &fix);
