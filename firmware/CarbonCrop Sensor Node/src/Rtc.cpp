#include "Rtc.h"

#include <sys/time.h>

#include "NodeConfig.h"

// Days since 1970-01-01 for a civil date (Howard Hinnant's algorithm)
static int32_t daysFromCivil(int y, unsigned m, unsigned d) {
    y -= m <= 2;
    const int era = (y >= 0 ? y : y - 399) / 400;
    const unsigned yoe = (unsigned)(y - era * 400);
    const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
    const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + (int32_t)doe - 719468;
}

// Placeholder: set the ESP32 system clock from the firmware build time (local time)
void rtcBegin() {
    static const char kMonths[] = "JanFebMarAprMayJunJulAugSepOctNovDec";
    char mon[4] = {0};
    int day, year, hh, mm, ss;
    sscanf(__DATE__, "%3s %d %d", mon, &day, &year);
    sscanf(__TIME__, "%d:%d:%d", &hh, &mm, &ss);
    unsigned month = (unsigned)((strstr(kMonths, mon) - kMonths) / 3 + 1);

    time_t local = (time_t)daysFromCivil(year, month, day) * 86400 +
                   hh * 3600 + mm * 60 + ss;
    timeval tv = {local - LOCAL_UTC_OFFSET_S, 0};
    settimeofday(&tv, nullptr);
}

time_t rtcNow() {
    return time(nullptr);
}

void rtcFormatLocal(time_t utc, char *buf, size_t len) {
    time_t local = utc + LOCAL_UTC_OFFSET_S;
    tm t;
    gmtime_r(&local, &t);
    strftime(buf, len, "%Y-%m-%d %H:%M:%S", &t);
}
