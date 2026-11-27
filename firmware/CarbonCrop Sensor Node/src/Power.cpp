#include "Power.h"

#include <driver/gpio.h>
#include <esp_sleep.h>

#include "PinConfig.h"

void powerBegin() {
    gpio_hold_dis((gpio_num_t)PIN_FET_GPS);
    gpio_hold_dis((gpio_num_t)PIN_FET_LORA);
    pinMode(PIN_FET_GPS, OUTPUT);
    pinMode(PIN_FET_LORA, OUTPUT);
    powerGps(false);
    powerLora(false);
}

void powerGps(bool on)  { digitalWrite(PIN_FET_GPS,  on ? HIGH : LOW); }
void powerLora(bool on) { digitalWrite(PIN_FET_LORA, on ? HIGH : LOW); }

void powerDeepSleep(uint64_t sleepUs) {
    powerGps(false);
    powerLora(false);

    // Keep the gates LOW while the digital pads are unpowered
    gpio_hold_en((gpio_num_t)PIN_FET_GPS);
    gpio_hold_en((gpio_num_t)PIN_FET_LORA);
    gpio_deep_sleep_hold_en();

    esp_sleep_enable_timer_wakeup(sleepUs);
    esp_deep_sleep_start();
}
