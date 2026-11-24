#pragma once
// =============================================================================
//  Filter.h — turn several noisy readings into one value
//
//  Generic: works on any float readings (ultrasonic distance, battery, ...).
//  Invalid readings are passed as NAN and ignored.
// =============================================================================
#include <Arduino.h>

enum class FilterType : uint8_t {
    Mean,          // average of all valid readings
    Median,        // middle value: robust against single bad readings
    TrimmedMean,   // drop the lowest/highest trimCount, then average
};

// Most readings one call can take
#define FILTER_MAX_VALUES 32

struct FilterResult {
    float   value;        // filtered value, NAN if !ok
    uint8_t validCount;   // readings that weren't NAN
    bool    ok;           // validCount >= minValid
};

// Filter values[0..n-1] (n <= FILTER_MAX_VALUES). NAN values are skipped.
// minValid: fewest valid readings for a usable result.
// trimCount: readings dropped at each end (TrimmedMean only).
// values is not modified.
FilterResult filterApply(const float *values, uint8_t n, FilterType type,
                         uint8_t minValid = 1, uint8_t trimCount = 0);

const char *filterTypeName(FilterType type);
