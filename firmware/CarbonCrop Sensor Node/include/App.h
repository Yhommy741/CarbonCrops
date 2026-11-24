#pragma once
// =============================================================================
//  App.h — the sensor node's measurement state machine (src/App.cpp)
//
//  ReadGps -> { WaitSample -> ReadRtc -> UltrasonicOn
//               -> ReadUltrasonic x APP_ULTRASONIC_READS -> Filter } x N
//          -> Send -> Pause
//  Timing is set in AppConfig.h.
// =============================================================================

// Start the hardware (clock, GPS, ultrasonic, E220). Call once from setup().
void appBegin();

// Run the state machine one step. Call from loop() as often as possible.
void appLoop();
