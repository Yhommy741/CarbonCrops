# CarbonCrop Sensor Node

ESP32 DOIT DevKit V1 + ultrasonic water-level sensor + EBYTE E220-900T22D. Measures the water level every 10 s and sends 10 samples to the gateway in one LoRa packet (922.125 MHz).

## Measurement sequence

`src/App.cpp` runs it as a state machine; all times are in `include/AppConfig.h`:

```
ReadGps                                         once per packet
{ WaitSample -> ReadRtc -> UltrasonicOn -> ReadUltrasonic x 10 -> Filter } x APP_SAMPLES_PER_PACKET (10)
                                                one sample every APP_SAMPLE_INTERVAL_MS (10 s)
Send -> Pause (APP_PACKET_PAUSE_MS, 0) -> ReadGps ...
```

| Setting (`AppConfig.h`) | Default | Meaning |
|---|---|---|
| `APP_SAMPLES_PER_PACKET` | `10` | Samples per packet (1–10) |
| `APP_SAMPLE_INTERVAL_MS` | `10000` | Start of one sample to the start of the next. Must be longer than one ultrasonic measurement (~5 s); the build fails otherwise |
| `APP_ULTRASONIC_READS` | `10` | Single ultrasonic readings per sample |
| `APP_ULTRASONIC_READ_INTERVAL_MS` | `500` | Time between those readings |
| `APP_PACKET_PAUSE_MS` | `0` | Extra wait after a send |
| `APP_STARTUP_DELAY_MS` | `2000` | Wait after boot before the first sample |

- **UltrasonicOn** powers the sensor and waits `HCSR04_WARMUP_MS` (500 ms).
- **ReadUltrasonic** calls `ultrasonicReadCm()` (one reading) `APP_ULTRASONIC_READS` times, `APP_ULTRASONIC_READ_INTERVAL_MS` apart, then powers the sensor off.
- **Filter** passes the readings to `filterApply()` (`Filter.h`), which keeps only valid ones (an echo inside `HCSR04_MIN/MAX_DISTANCE_CM`) and applies `APP_ULTRASONIC_FILTER` (median). The app then applies the calibration from `HCSR04.h` and calculates the water level with `PIPE_SENSOR_TO_GROUND_CM` from `PipeConfig.h`. With fewer than `APP_ULTRASONIC_MIN_VALID` (5) valid readings, the sample is sent as "no reading".

Full details: [main README, section 7](../../README.md#7-firmware-sensor-node-and-gateway).

## Quick start

1. Set `NODE_ID` in `include/NodeConfig.h` (unique per node; node 1 = `NODE-0001` in the database).
2. To test only the LoRa link, keep `USE_DUMMY_DATA = true`. For real measurements set it to `false` and set `PIPE_SENSOR_TO_GROUND_CM` in `include/PipeConfig.h` to the measured distance from the sensor face to the soil.
3. Open this folder in VS Code with PlatformIO, then **Build** and **Upload** (upload right after building: the clock starts from the build time).
4. Register the node in the database before its data is saved (main README, 6.2).

## Files

| File | Contents |
|---|---|
| `src/main.cpp` | Calls `appBegin()` / `appLoop()` |
| `src/App.cpp` | Measurement state machine (GPS → RTC → ultrasonic ×10 → filter → send) |
| `include/AppConfig.h` | Timing of the sequence |
| `src/Rtc.cpp` | Clock (placeholder: build time) |
| `src/Gps.cpp` | Position (placeholder: fixed coordinates) |
| `src/Ultrasonic.cpp` | Sensor only: power on/off, `ultrasonicReadCm()` (one raw reading, no calibration) |
| `src/Filter.cpp` | Generic filter library: `filterApply()` (mean / median / trimmed mean, skips invalid) |
| `src/Battery.cpp` | LiFePO4 voltage (trimmed mean of 32 ADC readings) and SoC (OCV table + interpolation) |
| `include/NodeConfig.h` | Node ID, position (placeholder), time zone, dummy data |
| `include/HCSR04.h` | Ultrasonic sensor constants: temperature, timing, valid range, calibration |
| `include/PipeConfig.h` | Pipe installation: `PIPE_SENSOR_TO_GROUND_CM` (water level = this - distance) |
| `include/Battery.h` | Battery settings (divider, ADC, calibration, LiFePO4 thresholds, OCV table) and API |
| `include/PinConfig.h` | GPIO assignment |
| `../../shared/protocol/` | Packet format and radio channel (shared with the gateway) |
| `include/E220.h` | E220 driver (the gateway has an identical copy; change both) |

## Known limits

- **No RTC:** timestamps start from the firmware build time and restart at every reset.
- **No GPS:** the position is the fixed `NODE_LATITUDE` / `NODE_LONGITUDE`.
- **Battery:** the reading code exists (`src/Battery.cpp`) but the main loop doesn't use it yet, and the LoRa packet has no battery field.
- **LiFePO4 SoC from voltage is approximate:** the curve is so flat that between ~30 % and ~90 % about 2 mV = 1 %. Read at rest and calibrate the ADC (`BATTERY_CAL_*`); for better accuracy a coulomb counter (e.g. INA219) is needed.
