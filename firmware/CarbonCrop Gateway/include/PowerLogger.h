#pragma once
// =============================================================================
//  PowerLogger.h — INA219 current/voltage logger (lab test of the sensor node)
//  The sensor node's supply runs through the INA219 (VIN+ -> VIN-); the
//  gateway reads it over I2C and prints one CSV row every 100 ms:
//      Time_s,Voltage_V,Current_mA,Power_mW
//  Other gateway log lines don't start with a digit, so the CSV rows are easy
//  to filter out of the serial log.
//  Off by default. The [env:powerlog] environment in platformio.ini turns it
//  on (-D ENABLE_POWER_LOGGER=1): pio run -e powerlog -t upload
// =============================================================================
#include <Arduino.h>

#ifndef ENABLE_POWER_LOGGER
#define ENABLE_POWER_LOGGER 0
#endif

namespace powerlog {
// false = INA219 not found; the gateway keeps running without power logging
bool begin();
// Call every loop(). Non-blocking: takes one sample every 10 ms and prints the
// average of 10 samples as one CSV row.
void update();
}
