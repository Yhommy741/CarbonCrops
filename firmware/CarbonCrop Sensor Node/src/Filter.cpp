#include "Filter.h"

#include <algorithm>
#include <math.h>

FilterResult filterApply(const float *values, uint8_t n, FilterType type,
                         uint8_t minValid, uint8_t trimCount) {
    // Keep only the valid readings
    float valid[FILTER_MAX_VALUES];
    uint8_t count = 0;
    for (uint8_t i = 0; i < n && i < FILTER_MAX_VALUES; i++) {
        if (!isnan(values[i])) valid[count++] = values[i];
    }

    FilterResult r = {NAN, count, count >= minValid && count > 0};
    if (!r.ok) return r;

    std::sort(valid, valid + count);

    switch (type) {
        case FilterType::Median:
            r.value = (count % 2) ? valid[count / 2]
                                  : 0.5f * (valid[count / 2 - 1] + valid[count / 2]);
            break;

        case FilterType::TrimmedMean: {
            uint8_t trim = trimCount;
            if (count <= 2 * trim) trim = 0;   // not enough readings to trim
            float sum = 0.0f;
            for (uint8_t i = trim; i < count - trim; i++) sum += valid[i];
            r.value = sum / (count - 2 * trim);
            break;
        }

        case FilterType::Mean:
        default: {
            float sum = 0.0f;
            for (uint8_t i = 0; i < count; i++) sum += valid[i];
            r.value = sum / count;
            break;
        }
    }
    return r;
}

const char *filterTypeName(FilterType type) {
    switch (type) {
        case FilterType::Mean:        return "mean";
        case FilterType::Median:      return "median";
        case FilterType::TrimmedMean: return "trimmed mean";
    }
    return "?";
}
