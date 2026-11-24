#include "Ultrasonic.h"
#include "PinConfig.h"

#include <math.h>

// Echo timeout: round trip to the max distance at a cold 0 °C, plus margin
#define HCSR04_ECHO_TIMEOUT_US                                               \
    ((unsigned long)(2.0f * HCSR04_MAX_DISTANCE_CM / 100.0f /                \
                     hcsr04SpeedOfSoundMps(0.0f) * 1e6f) + 2000UL)

void ultrasonicBegin() {
    pinMode(PIN_ULTRASONIC_POWER, OUTPUT);
    pinMode(PIN_ULTRASONIC_TRIG, OUTPUT);
    pinMode(PIN_ULTRASONIC_ECHO, INPUT);
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
    ultrasonicPowerOff();
}

void ultrasonicPowerOn() {
    digitalWrite(PIN_ULTRASONIC_POWER, HIGH);   // caller waits HCSR04_WARMUP_MS
}

void ultrasonicPowerOff() {
    // Keep TRIG low so the unpowered sensor is not fed through its input pin
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
    digitalWrite(PIN_ULTRASONIC_POWER, LOW);
}

float ultrasonicReadCm(float temperatureC) {
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_ULTRASONIC_TRIG, HIGH);
    delayMicroseconds(HCSR04_TRIG_PULSE_US);
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);

    unsigned long echoUs = pulseIn(PIN_ULTRASONIC_ECHO, HIGH, HCSR04_ECHO_TIMEOUT_US);
    if (echoUs == 0) return NAN;   // timeout, no echo

    // cm = us * (m/s) * 1e-4 / 2   (round trip -> one way)
    float distanceCm = echoUs * hcsr04SpeedOfSoundMps(temperatureC) * 1e-4f / 2.0f;

    if (distanceCm < HCSR04_MIN_DISTANCE_CM || distanceCm > HCSR04_MAX_DISTANCE_CM)
        return NAN;
    return distanceCm;
}
