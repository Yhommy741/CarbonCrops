#pragma once
// =============================================================================
//  PinConfig.h — GPIO assignment for the CarbonCrop gateway
//  Board: ESP32 DOIT DevKit V1
// =============================================================================
#include <Arduino.h>

// ---- LoRa module: EBYTE E220 (UART) on Serial2 ------------------------------
// Same wiring as the sensor node. E220 VCC -> 3V3.
constexpr uint8_t PIN_E220_TXD = 16;   // E220 TXD -> ESP32 RX2
constexpr uint8_t PIN_E220_RXD = 17;   // E220 RXD <- ESP32 TX2
constexpr uint8_t PIN_E220_M0  = 32;
constexpr uint8_t PIN_E220_M1  = 33;
constexpr uint8_t PIN_E220_AUX = 34;   // input-only pin, fine for AUX

// ---- Status LED -------------------------------------------------------------
constexpr uint8_t PIN_STATUS_LED = 2;   // on-board blue LED, blinks on RX
