#pragma once
// =============================================================================
//  NetConfig.h — gateway identity and MQTT topics
//  WiFi and broker address live in Secrets.h (copy Secrets.example.h).
// =============================================================================
#include <stdint.h>

#if __has_include("Secrets.h")
#include "Secrets.h"
#else
#error "Copy include/Secrets.example.h to include/Secrets.h and set your WiFi + MQTT broker"
#endif

// Unique per gateway; part of the topic and the MQTT client id
#define GATEWAY_ID "GW-01"

// One JSON message per LoRa packet (read by services/api/app/mqtt_bridge.py)
#define MQTT_TOPIC_WATER  "carboncrops/gw/" GATEWAY_ID "/water"
// Retained "online" / "offline" (last will) so you can see if the gateway is up
#define MQTT_TOPIC_STATUS "carboncrops/gw/" GATEWAY_ID "/status"

// Retry WiFi/MQTT this often while disconnected (LoRa keeps receiving meanwhile)
#define MQTT_RETRY_MS  5000UL

// Packets kept in RAM while WiFi/MQTT is down; the oldest is dropped when full
#define OUTBOX_SIZE  32
