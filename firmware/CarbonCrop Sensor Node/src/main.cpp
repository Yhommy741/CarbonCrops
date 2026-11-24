#include <Arduino.h>

#include "App.h"

// The measurement sequence lives in App.cpp (state machine) and its timing in
// include/AppConfig.h. Keep loop() free of delay() so the state machine runs.

void setup() {
    Serial.begin(115200);
    delay(500);  // let the serial monitor connect
    appBegin();
}

void loop() {
    appLoop();
}
