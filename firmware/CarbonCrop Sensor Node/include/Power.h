#pragma once
// =============================================================================
//  Power.h — power switches of the GPS and LoRa modules, and deep sleep
//
//  The GPS and E220 are powered through MOSFETs (PIN_FET_GPS / PIN_FET_LORA,
//  PinConfig.h). The ultrasonic sensor has its own power pin (Ultrasonic.h).
//  During deep sleep the MOSFET gates are held LOW so the modules stay off.
// =============================================================================
#include <Arduino.h>

// Release the deep-sleep hold and switch both modules off.
// Call first thing in setup(), on every wake.
void powerBegin();

// Switch a module's power. Doesn't wait: after switching on, wait
// POWER_SETTLE_MS before talking to the module.
void powerGps(bool on);
void powerLora(bool on);

#define POWER_SETTLE_MS  100UL   // supply settle time after a MOSFET switches on

// Switch both modules off, hold the MOSFET gates LOW and deep-sleep for
// sleepUs. Call the drivers' *End() functions first so no pin feeds an
// unpowered module. Does not return: the next wake starts in setup().
[[noreturn]] void powerDeepSleep(uint64_t sleepUs);
