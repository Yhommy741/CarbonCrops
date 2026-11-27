#pragma once
// =============================================================================
//  PinConfig.h — GPIO assignment for the CarbonCrop sensor node
//  Board: ESP32 DOIT DevKit V1
//
//  Change pins here only. Every other file reads these names.
//  Check against the schematic in hardware/electronics/ before flashing.
// =============================================================================
#include <Arduino.h>

// ---- Ultrasonic sensor (JSN-SR04T / AJ-SR04M or HC-SR04) -------------------
// If the sensor runs at 5 V, put a voltage divider on ECHO (5 V -> 3.3 V).
// ESP32 GPIOs are NOT 5 V tolerant.
// VCC is powered from a GPIO so the sensor draws nothing between readings.
// A GPIO gives 3.3 V and ~20-40 mA: fine for HC-SR04P / RCWL-1601 (3.3 V
// versions, ~15 mA). A 5 V sensor (HC-SR04, JSN-SR04T) needs a transistor
// or MOSFET switch from 5 V instead.
#define PIN_ULTRASONIC_POWER  27
#define PIN_ULTRASONIC_TRIG   25
#define PIN_ULTRASONIC_ECHO   26

// ---- Battery voltage sense --------------------------------------------------
// Must be an ADC1 pin (GPIO32–39). ADC2 cannot be read while Wi-Fi is on.
// GPIO35 is input-only, which is fine for an ADC.
#define PIN_BATTERY_ADC  35

// ---- LoRa module: EBYTE E220 (UART) on Serial2 ------------------------------
// E220 VCC is switched by a MOSFET on PIN_FET_LORA (see Power.h).
// GPIO34 is input-only, which is fine for AUX.
#define PIN_E220_TXD  16   // E220 TXD -> ESP32 RX2
#define PIN_E220_RXD  17   // E220 RXD <- ESP32 TX2
#define PIN_E220_M0   32
#define PIN_E220_M1   33
#define PIN_E220_AUX  34

// ---- GPS module (UART) on Serial1 -------------------------------------------
// GPS VCC is switched by a MOSFET on PIN_FET_GPS (see Power.h).
#define PIN_GPS_RX  18   // GPS TX -> ESP32 RX1
#define PIN_GPS_TX  19   // GPS RX <- ESP32 TX1

// ---- Power switches (MOSFET gates, HIGH = module on) ------------------------
// Held LOW through deep sleep (gpio_hold_en), so the modules stay off.
// GPIO13/14 are RTC-capable, which the hold needs.
#define PIN_FET_GPS   13
#define PIN_FET_LORA  14

// ---- Status LED -------------------------------------------------------------
#define PIN_STATUS_LED  2   // on-board blue LED on DOIT DevKit V1
