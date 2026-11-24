#pragma once
// =============================================================================
//  CarbonCropPacket.h — LoRa packet format shared by sensor node and gateway
//
//  One packet = node GPS position + up to 10 water level samples, each with
//  its own timestamp:
//
//      [GPS] { [time][water level] x 10 }
//
//  Binary, little-endian (ESP32 on both ends), fixed size, CRC16 at the end.
//  Size must stay <= 200 bytes (E220 default sub-packet length).
// =============================================================================
#include <stdint.h>
#include <stddef.h>
#include <string.h>

namespace ccp {

constexpr uint8_t MAGIC0  = 'C';
constexpr uint8_t MAGIC1  = 'C';
constexpr uint8_t VERSION = 1;

constexpr uint8_t TYPE_WATER_LEVEL = 1;

constexpr uint8_t MAX_SAMPLES = 10;

// waterLevelMm value for a sample with no valid echo
constexpr int16_t LEVEL_INVALID = INT16_MIN;

struct __attribute__((packed)) Sample {
    uint32_t unixTime;      // seconds since 1970-01-01 UTC
    int16_t  waterLevelMm;  // + above soil, - below soil, LEVEL_INVALID = none
};

struct __attribute__((packed)) WaterLevelPacket {
    uint8_t  magic[2];      // 'C','C'
    uint8_t  version;       // VERSION
    uint8_t  type;          // TYPE_WATER_LEVEL
    uint16_t nodeId;
    uint16_t seq;           // increments every packet, wraps at 65535
    int32_t  latE6;         // latitude  * 1e6
    int32_t  lonE6;         // longitude * 1e6
    uint8_t  count;         // samples used (<= MAX_SAMPLES)
    Sample   samples[MAX_SAMPLES];
    uint16_t crc;           // CRC16-CCITT over every byte before this field
};

static_assert(sizeof(WaterLevelPacket) <= 200,
              "packet must fit in one E220 sub-packet (200 bytes)");

// CRC16-CCITT (poly 0x1021, init 0xFFFF)
inline uint16_t crc16(const uint8_t *data, size_t len) {
    uint16_t crc = 0xFFFF;
    for (size_t i = 0; i < len; i++) {
        crc ^= (uint16_t)data[i] << 8;
        for (uint8_t b = 0; b < 8; b++)
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : (crc << 1);
    }
    return crc;
}

// Fill header fields and CRC. Call after filling nodeId, seq, GPS and samples.
inline void finalize(WaterLevelPacket &p) {
    p.magic[0] = MAGIC0;
    p.magic[1] = MAGIC1;
    p.version  = VERSION;
    p.type     = TYPE_WATER_LEVEL;
    p.crc = crc16(reinterpret_cast<const uint8_t *>(&p),
                  offsetof(WaterLevelPacket, crc));
}

inline bool isValid(const WaterLevelPacket &p) {
    return p.magic[0] == MAGIC0 && p.magic[1] == MAGIC1 &&
           p.version == VERSION && p.type == TYPE_WATER_LEVEL &&
           p.count <= MAX_SAMPLES &&
           p.crc == crc16(reinterpret_cast<const uint8_t *>(&p),
                          offsetof(WaterLevelPacket, crc));
}

}  // namespace ccp
