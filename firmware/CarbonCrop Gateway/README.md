# CarbonCrop Gateway

ESP32 DOIT DevKit V1 + EBYTE E220-900T22D. Receives water-level packets from sensor nodes over LoRa (922.125 MHz) and publishes each one as JSON to Mosquitto over WiFi.

Full details: [main README, sections 6 and 7](../../README.md#6-sensor-data-gateway--mqtt--database).

## Quick start

1. Copy `include/Secrets.example.h` to `include/Secrets.h` (gitignored) and set:
   - `WIFI_SSID` / `WIFI_PASSWORD`: a 2.4 GHz network
   - `MQTT_HOST`: LAN IP of the PC running Docker, or the VPS's IP/domain
   - `MQTT_USER` / `MQTT_PASSWORD`: empty for local development
2. Open this folder in VS Code with PlatformIO, then **Build** and **Upload**.
3. Open the **Serial Monitor** (115200) and look for `[MQTT] connecting ... ok`.

## Files

| File | Contents |
|---|---|
| `src/main.cpp` | LoRa receive + CRC check, outbox (32 packets while offline), WiFi/MQTT |
| `include/NetConfig.h` | `GATEWAY_ID` (`GW-01`), MQTT topics, retry interval, outbox size |
| `include/Secrets.h` | WiFi and broker settings (your copy, not in git) |
| `include/PinConfig.h` | E220, LED and INA219 pins |
| `include/PowerLogger.h`, `src/PowerLogger.cpp` | Lab test: INA219 on I2C (SDA 21, SCL 22) measures the sensor node supply and prints CSV `Time_s,Voltage_V,Current_mA,Power_mW` every 100 ms. Off by default: build the `powerlog` environment (`pio run -e powerlog -t upload`) to turn it on |
| `../../shared/protocol/` | Packet format and radio channel (shared with the sensor node) |
| `../../shared/drivers/E220.h` | E220 driver (shared with the sensor node) |

## MQTT

| Topic | Payload |
|---|---|
| `carboncrops/gw/GW-01/water` | `{"gw":"GW-01","node":1,"seq":42,"lat":..,"lon":..,"samples":[[unix_utc, level_mm or null], ...]}` |
| `carboncrops/gw/GW-01/status` | `online` / `offline` (retained, last will) |

Library: [PubSubClient](https://github.com/knolleary/pubsubclient) (installed automatically by PlatformIO).
