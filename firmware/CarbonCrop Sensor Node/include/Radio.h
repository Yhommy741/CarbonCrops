#pragma once
// =============================================================================
//  Radio.h — EBYTE E220 LoRa link of the sensor node (send only)
//
//  Wraps the shared E220 driver (shared/drivers/E220.h) on Serial2 with the
//  pins from PinConfig.h and the channel from LoRaConfig.h. The module must
//  be powered (powerLora(true)) and settled before radioBegin().
// =============================================================================
#include <Arduino.h>

// Start the UART, wait for the module and make sure it is on E220_CHANNEL.
// Returns false if the module doesn't answer (it may still send).
bool radioBegin();

// Send one buffer (<= 200 bytes). Returns false on AUX timeout.
bool radioSend(const void *data, size_t len);

// Stop the UART and float every E220 pin, so nothing feeds the module after
// its power is cut. Call before powerDeepSleep().
void radioEnd();
