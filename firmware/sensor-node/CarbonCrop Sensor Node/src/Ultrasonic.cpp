#include "Ultrasonic.h"
#include "PinConfig.h"

#include <algorithm>
#include <math.h>

namespace {

// Echo timeout: round trip to the max distance at a cold 0 °C, plus margin.
constexpr unsigned long ECHO_TIMEOUT_US =
    (unsigned long)(2.0f * ULTRASONIC_MAX_DISTANCE_CM / 100.0f /
                    speedOfSoundMps(0.0f) * 1e6f) + 2000UL;

float applyFilter(float *values, uint8_t n) {
    std::sort(values, values + n);

    switch (ULTRASONIC_FILTER) {
        case DistanceFilter::Median:
            return (n % 2) ? values[n / 2]
                           : 0.5f * (values[n / 2 - 1] + values[n / 2]);

        case DistanceFilter::TrimmedMean: {
            uint8_t trim = ULTRASONIC_TRIM_COUNT;
            if (n <= 2 * trim) trim = 0;      // not enough samples to trim
            float sum = 0.0f;
            for (uint8_t i = trim; i < n - trim; i++) sum += values[i];
            return sum / (n - 2 * trim);
        }

        case DistanceFilter::Mean:
        default: {
            float sum = 0.0f;
            for (uint8_t i = 0; i < n; i++) sum += values[i];
            return sum / n;
        }
    }
}

}  // namespace

void ultrasonicBegin() {
    pinMode(PIN_ULTRASONIC_POWER, OUTPUT);
    pinMode(PIN_ULTRASONIC_TRIG, OUTPUT);
    pinMode(PIN_ULTRASONIC_ECHO, INPUT);
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
    ultrasonicPowerOff();
}

void ultrasonicPowerOn() {
    digitalWrite(PIN_ULTRASONIC_POWER, HIGH);
    delay(ULTRASONIC_WARMUP_MS);
}

void ultrasonicPowerOff() {
    // Keep TRIG low so the unpowered sensor is not fed through its input pin
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
    digitalWrite(PIN_ULTRASONIC_POWER, LOW);
}

float ultrasonicReadOnceCm(float temperatureC, unsigned long *echoUsOut) {
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_ULTRASONIC_TRIG, HIGH);
    delayMicroseconds(ULTRASONIC_TRIG_PULSE_US);
    digitalWrite(PIN_ULTRASONIC_TRIG, LOW);

    unsigned long echoUs = pulseIn(PIN_ULTRASONIC_ECHO, HIGH, ECHO_TIMEOUT_US);
    if (echoUsOut) *echoUsOut = echoUs;
    if (echoUs == 0) return NAN;  // timeout, no echo

    // cm = us * (m/s) * 1e-4 / 2   (round trip -> one way)
    float distanceCm = echoUs * speedOfSoundMps(temperatureC) * 1e-4f / 2.0f;

    if (distanceCm < ULTRASONIC_MIN_DISTANCE_CM ||
        distanceCm > ULTRASONIC_MAX_DISTANCE_CM) {
        return NAN;
    }
    return distanceCm;
}

bool ultrasonicMeasure(UltrasonicResult &result, float temperatureC) {
    float valid[ULTRASONIC_SAMPLE_COUNT];
    uint8_t n = 0;

    result.temperatureC = temperatureC;

    ultrasonicPowerOn();
    for (uint8_t i = 0; i < ULTRASONIC_SAMPLE_COUNT; i++) {
        float d = ultrasonicReadOnceCm(temperatureC, &result.echoUs[i]);
        result.samplesCm[i] = d;
        result.sampleTime[i] = time(nullptr);
        if (!isnan(d)) valid[n++] = d;

        if (i < ULTRASONIC_SAMPLE_COUNT - 1) delay(ULTRASONIC_SAMPLE_DELAY_MS);
    }
    ultrasonicPowerOff();

    result.validCount = n;
    result.ok = (n >= ULTRASONIC_MIN_VALID_SAMPLES);

    if (!result.ok) {
        result.distanceCm = NAN;
        result.waterLevelCm = NAN;
        return false;
    }

    float filtered = applyFilter(valid, n);
    result.distanceCm = filtered * DISTANCE_CAL_SCALE + DISTANCE_CAL_OFFSET_CM;
    result.waterLevelCm = SENSOR_TO_SOIL_CM - result.distanceCm;
    return true;
}
