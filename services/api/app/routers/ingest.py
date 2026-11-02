"""Sensor readings from the LoRa gateway.

The gateway (firmware/gateway) can POST here directly. If it publishes to
Mosquitto instead, a small MQTT subscriber can forward messages to this endpoint.
"""

import hmac
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from ..config import settings
from ..db import execute, fetch_one, get_db

router = APIRouter(prefix="/ingest", tags=["ingest"])


class Reading(BaseModel):
    serial_no: str
    water_level_cm: float | None = Field(None, ge=-100, le=100)
    battery_pct: int | None = Field(None, ge=0, le=100)
    recorded_at: datetime | None = None


def _check_key(x_api_key: str = Header(...)):
    if not hmac.compare_digest(x_api_key, settings.ingest_api_key):
        raise HTTPException(401, "Invalid API key")


@router.post("/readings", status_code=201, dependencies=[Depends(_check_key)])
def ingest_readings(readings: list[Reading], conn=Depends(get_db)):
    saved, unknown = 0, []
    for r in readings:
        device = fetch_one(conn, "SELECT device_id FROM devices WHERE serial_no = :s", s=r.serial_no)
        if not device:
            unknown.append(r.serial_no)
            continue
        # INSERT IGNORE: the gateway may resend the same reading after a lost ACK
        result = execute(
            conn,
            """INSERT IGNORE INTO sensor_readings (device_id, recorded_at, water_level_cm, battery_pct)
               VALUES (:device_id, :recorded_at, :level, :battery)""",
            device_id=device["device_id"],
            recorded_at=r.recorded_at or datetime.now(),
            level=r.water_level_cm,
            battery=r.battery_pct,
        )
        saved += result.rowcount
    return {"saved": saved, "unknown_devices": sorted(set(unknown))}
