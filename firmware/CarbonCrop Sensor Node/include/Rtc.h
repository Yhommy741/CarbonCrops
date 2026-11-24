#pragma once
// =============================================================================
//  Rtc.h — real-time clock (time of each sample)
//
//  PLACEHOLDER: there is no RTC module yet. rtcBegin() sets the ESP32 system
//  clock from the firmware build time (__DATE__ __TIME__, local time), so the
//  time is only right if you upload straight after building, and it restarts
//  at every reset. Replace the body of Rtc.cpp when an RTC (e.g. DS3231) is
//  added; the rest of the firmware only uses these functions.
// =============================================================================
#include <Arduino.h>
#include <time.h>

// Start the clock. Call once in setup().
void rtcBegin();

// Current time, seconds since 1970-01-01 UTC
time_t rtcNow();

// "YYYY-MM-DD HH:MM:SS" in local time (LOCAL_UTC_OFFSET_S, NodeConfig.h)
void rtcFormatLocal(time_t utc, char *buf, size_t len);
