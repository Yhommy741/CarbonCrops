#pragma once
// =============================================================================
//  Secrets.example.h — copy to Secrets.h (gitignored) and fill in
// =============================================================================

// ---- WiFi (2.4 GHz only, the ESP32 has no 5 GHz) ------------------------------
#define WIFI_SSID     "your-wifi-name"
#define WIFI_PASSWORD "your-wifi-password"

// ---- Mosquitto broker -----------------------------------------------------------
// The PC running `docker compose up`: its LAN IP (Windows: `ipconfig`, IPv4 Address),
// not "localhost" - localhost on the ESP32 is the ESP32 itself.
#define MQTT_HOST     "192.168.1.100"
#define MQTT_PORT     1883
// Empty = anonymous (services/mosquitto/config/mosquitto.conf allows it for now)
#define MQTT_USER     ""
#define MQTT_PASSWORD ""
