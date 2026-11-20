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
    device_id: str = Field(max_length=20)  # the ID printed on the device, e.g. MOCK-DEV-001
    water_level_cm: float | None = Field(None, ge=-100, le=100)
    battery_pct: int | None = Field(None, ge=0, le=100)
    recorded_at: datetime | None = None


def _check_key(x_api_key: str = Header(...)):
    if not hmac.compare_digest(x_api_key, settings.ingest_api_key):
        raise HTTPException(401, "Invalid API key")


@router.post("/readings", status_code=201, dependencies=[Depends(_check_key)])
def ingest_readings(readings: list[Reading], conn=Depends(get_db)):
    saved, unknown = 0, []
    for r in sorted(readings, key=lambda r: r.recorded_at or datetime.now()):
        if not fetch_one(conn, "SELECT 1 AS ok FROM devices WHERE device_id = :d", d=r.device_id):
            unknown.append(r.device_id)
            continue
        # INSERT IGNORE: the gateway may resend the same reading after a lost ACK
        result = execute(
            conn,
            """INSERT IGNORE INTO sensor_readings (device_id, recorded_at, water_level_cm)
               VALUES (:device_id, :recorded_at, :level)""",
            device_id=r.device_id,
            recorded_at=r.recorded_at or datetime.now(),
            level=r.water_level_cm,
        )
        saved += result.rowcount
        if r.battery_pct is not None:  # the device row keeps only the latest battery level
            execute(conn, "UPDATE devices SET battery_pct = :b WHERE device_id = :d", b=r.battery_pct, d=r.device_id)
    return {"saved": saved, "unknown_devices": sorted(set(unknown))}
