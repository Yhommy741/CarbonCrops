#pragma once
// =============================================================================
//  App.h — the sensor node's measurement state machine (src/App.cpp)
//
//  One sample per wake, deep sleep in between:
//  [OpMode::Read]        ReadRtc -> UltrasonicOn -> ReadUltrasonic -> Filter -> Sleep
//  [OpMode::ReadGpsLora] PowerSettle -> WaitGps -> (same as Read) -> Send -> Sleep
//  [OpMode::Sleep]       Sleep
//  Timing is set in AppConfig.h.
// =============================================================================
#include <stdint.h>

enum class OpMode : uint8_t {
    Sleep,
    Read,
    ReadGpsLora,
};

// Start the hardware and pick this wake's mode. Call once from setup(),
// on power-on and on every deep-sleep wake.
void appBegin();

// Run the state machine one step. Call from loop() as often as possible.
void appLoop();

// Force a mode. autoCycle = true lets the node pick the next mode by itself
// (Read x (N-1) then ReadGpsLora); false keeps the chosen mode every wake.
void appSetMode(OpMode mode, bool autoCycle = true);

// Mode of the current wake cycle.
OpMode appGetMode();
