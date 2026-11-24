"""MQTT -> MySQL bridge: stores water level packets the LoRa gateway publishes to Mosquitto.

Run:  python -m app.mqtt_bridge   (docker compose runs it as the `mqtt-bridge` service)

Topic:   carboncrops/gw/<gateway_id>/water
Payload (one LoRa packet from one sensor node, see firmware/CarbonCrop Gateway):
    {"gw": "GW-01", "node": 1, "seq": 42, "lat": 13.736717, "lon": 100.523186,
     "samples": [[1795410000, -61], [1795410001, null], ...]}
    samples = [unix time UTC, water level in mm or null when the sensor had no echo]

Node N is stored as device_id NODE-000N. Readings are kept only for devices registered
in the `devices` table (a device must belong to a paddy); others are logged and skipped.
"""

import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone

import paho.mqtt.client as mqtt

from .db import engine
from .services.readings import LEVEL_MAX_CM, LEVEL_MIN_CM, save_readings

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER") or None
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD") or None
TOPIC = os.getenv("MQTT_TOPIC", "carboncrops/gw/+/water")

# Stored timestamps are Thai local time (see docker-compose.yml); Thailand has no DST
THAI_TZ = timezone(timedelta(hours=7))

log = logging.getLogger("mqtt_bridge")


def device_id_for(node_id: int) -> str:
    return f"NODE-{node_id:04d}"


def parse_packet(payload: bytes):
    """JSON payload -> list of reading dicts for save_readings. Raises ValueError on bad input."""
    msg = json.loads(payload)
    node = int(msg["node"])
    if not 0 <= node <= 0xFFFF:
        raise ValueError(f"node id out of range: {node}")
    device_id = device_id_for(node)

    readings = []
    for unix_time, level_mm in msg["samples"]:
        recorded_at = datetime.fromtimestamp(int(unix_time), THAI_TZ).replace(tzinfo=None)
        level_cm = None if level_mm is None else round(level_mm / 10, 1)
        if level_cm is not None and not LEVEL_MIN_CM <= level_cm <= LEVEL_MAX_CM:
            log.warning("%s: level %.1f cm out of range, stored as no reading", device_id, level_cm)
            level_cm = None
        readings.append({"device_id": device_id, "recorded_at": recorded_at, "water_level_cm": level_cm})
    return msg, readings


def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        log.error("MQTT connect failed: %s", reason_code)
        return
    log.info("connected to %s:%s, subscribing to %s", MQTT_HOST, MQTT_PORT, TOPIC)
    client.subscribe(TOPIC, qos=1)


def on_message(client, userdata, message):
    try:
        msg, readings = parse_packet(message.payload)
    except (ValueError, KeyError, TypeError) as err:
        log.warning("bad message on %s: %s (%r)", message.topic, err, message.payload[:200])
        return

    try:
        with engine.begin() as conn:
            result = save_readings(conn, readings)
    except Exception:  # DB down etc.: log and keep the bridge alive
        log.exception("could not save packet from node %s", msg.get("node"))
        return

    if result["unknown_devices"]:
        log.warning(
            "%s is not registered in `devices` (link it to a paddy first); %d reading(s) skipped",
            ", ".join(result["unknown_devices"]), len(readings),
        )
    else:
        log.info(
            "gw=%s node=%s seq=%s rssi=%s: %d/%d new reading(s) saved",
            msg.get("gw"), msg.get("node"), msg.get("seq"), msg.get("rssi"), result["saved"], len(readings),
        )


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="carboncrops-bridge", clean_session=False)
    if MQTT_USER:
        client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=1, max_delay=30)

    while True:  # the broker may still be starting
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            break
        except OSError as err:
            log.warning("MQTT broker %s:%s not reachable (%s), retrying in 5 s", MQTT_HOST, MQTT_PORT, err)
            time.sleep(5)
    client.loop_forever(retry_first_connection=True)


if __name__ == "__main__":
    main()
