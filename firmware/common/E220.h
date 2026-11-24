#pragma once
// =============================================================================
//  E220.h — minimal driver for EBYTE E220 LoRa UART modules (LLCC68)
//  Shared by sensor node and gateway. Header-only.
//
//  Wiring (ESP32):
//      E220 TXD -> ESP32 RX pin      E220 M0  -> GPIO
//      E220 RXD <- ESP32 TX pin      E220 M1  -> GPIO
//      E220 AUX -> GPIO (input)      E220 VCC -> 3V3, GND -> GND
//
//  Uses the module in transparent mode (M0=0, M1=0): bytes written to the
//  UART are sent over the air, and any module on the same address/channel/
//  air rate receives them. Factory defaults on both modules already match.
// =============================================================================
#include <Arduino.h>

class E220 {
public:
    enum Mode : uint8_t {
        Normal   = 0,   // M0=0 M1=0  transparent TX/RX
        WorTx    = 1,   // M0=1 M1=0
        WorRx    = 2,   // M0=0 M1=1
        Config   = 3,   // M0=1 M1=1  configuration / sleep (UART must be 9600)
    };

    // Register dump from readConfig() (addresses 00H-07H)
    struct Registers {
        uint8_t addh, addl, reg0, reg1, chan, reg3, cryptH, cryptL;
    };

    E220(HardwareSerial &serial, int8_t rxPin, int8_t txPin,
         uint8_t m0Pin, uint8_t m1Pin, uint8_t auxPin)
        : serial_(serial), rx_(rxPin), tx_(txPin),
          m0_(m0Pin), m1_(m1Pin), aux_(auxPin) {}

    // Start UART and put the module in Normal mode. Returns false if AUX
    // never goes HIGH (module not powered / not wired).
    bool begin(uint32_t baud = 9600) {
        pinMode(m0_, OUTPUT);
        pinMode(m1_, OUTPUT);
        pinMode(aux_, INPUT);
        serial_.begin(baud, SERIAL_8N1, rx_, tx_);
        return setMode(Normal);
    }

    bool setMode(Mode m) {
        digitalWrite(m0_, (m & 0x01) ? HIGH : LOW);
        digitalWrite(m1_, (m & 0x02) ? HIGH : LOW);
        delay(5);
        bool ok = waitReady(1000);
        delay(20);  // datasheet: wait after AUX HIGH before using new mode
        return ok;
    }

    // AUX is LOW while the module is busy (booting, sending, switching mode)
    bool waitReady(uint32_t timeoutMs) {
        uint32_t start = millis();
        while (digitalRead(aux_) == LOW) {
            if (millis() - start > timeoutMs) return false;
            delay(1);
        }
        return true;
    }

    bool isReady() { return digitalRead(aux_) == HIGH; }

    // Read registers 00H-07H. Switches to Config mode and back to Normal.
    bool readConfig(Registers &out) {
        if (!setMode(Config)) { setMode(Normal); return false; }
        while (serial_.available()) serial_.read();

        const uint8_t cmd[] = {0xC1, 0x00, 0x08};
        serial_.write(cmd, sizeof(cmd));

        uint8_t resp[11];
        size_t n = 0;
        uint32_t start = millis();
        while (n < sizeof(resp) && millis() - start < 500) {
            if (serial_.available()) resp[n++] = serial_.read();
        }
        setMode(Normal);

        if (n != sizeof(resp) || resp[0] != 0xC1 || resp[1] != 0x00 ||
            resp[2] != 0x08) {
            return false;
        }
        memcpy(&out, resp + 3, sizeof(out));
        return true;
    }

    // Write registers starting at startAddr. save=true stores them in the
    // module's flash (C0), false only until power-off (C2).
    // Switches to Config mode and back to Normal.
    bool writeRegisters(uint8_t startAddr, const uint8_t *data, uint8_t len,
                        bool save) {
        if (len == 0 || len > 8) return false;
        if (!setMode(Config)) { setMode(Normal); return false; }
        while (serial_.available()) serial_.read();

        uint8_t cmd[3 + 8] = {(uint8_t)(save ? 0xC0 : 0xC2), startAddr, len};
        memcpy(cmd + 3, data, len);
        serial_.write(cmd, 3 + len);

        // Reply: C1 <addr> <len> <data...>
        uint8_t resp[3 + 8];
        size_t n = 0;
        uint32_t start = millis();
        while (n < (size_t)(3 + len) && millis() - start < 500) {
            if (serial_.available()) resp[n++] = serial_.read();
        }
        setMode(Normal);

        return n == (size_t)(3 + len) && resp[0] == 0xC1 &&
               resp[1] == startAddr && resp[2] == len &&
               memcmp(resp + 3, data, len) == 0;
    }

    // Make sure the module is on `channel`. Writes to flash only when the
    // stored channel differs, so it does not wear the flash on every boot.
    // Returns false if the module did not answer.
    bool ensureChannel(uint8_t channel, bool *changed = nullptr) {
        if (changed) *changed = false;
        Registers r;
        if (!readConfig(r)) return false;
        if (r.chan == channel) return true;
        if (!writeRegisters(0x04, &channel, 1, true)) return false;
        if (changed) *changed = true;
        return true;
    }

    // Send bytes over the air. Blocks until the module has finished sending.
    bool send(const void *data, size_t len) {
        if (!waitReady(1000)) return false;
        serial_.write(static_cast<const uint8_t *>(data), len);
        serial_.flush();      // wait until the UART has shifted out every byte
        delay(5);             // give AUX time to go LOW
        return waitReady(5000);
    }

    HardwareSerial &serial() { return serial_; }

    // Print the register dump in a readable form.
    // baseFreqMHz: 850.125 for E220-900T, 410.125 for E220-400T.
    static void printConfig(Print &p, const Registers &r,
                            float baseFreqMHz = 850.125f) {
        static const char *const kAirRate[] = {
            "2.4k", "2.4k", "2.4k", "4.8k", "9.6k", "19.2k", "38.4k", "62.5k"};
        static const uint32_t kBaud[] = {
            1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200};
        static const uint8_t kSubPacket[] = {200, 128, 64, 32};

        p.printf("E220 config: addr=0x%02X%02X  channel=%u (%.3f MHz)  "
                 "air rate=%s bps  uart=%lu  sub-packet=%u B  %s  RSSI byte=%s\n",
                 r.addh, r.addl, r.chan, baseFreqMHz + r.chan,
                 kAirRate[r.reg0 & 0x07],
                 (unsigned long)kBaud[(r.reg0 >> 5) & 0x07],
                 kSubPacket[(r.reg1 >> 6) & 0x03],
                 (r.reg3 & 0x40) ? "FIXED transmission" : "transparent",
                 (r.reg3 & 0x80) ? "on" : "off");
    }

private:
    HardwareSerial &serial_;
    int8_t  rx_, tx_;
    uint8_t m0_, m1_, aux_;
};
