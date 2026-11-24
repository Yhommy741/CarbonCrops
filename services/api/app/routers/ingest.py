"""Sensor readings over HTTP.

The LoRa gateway normally publishes to Mosquitto and app/mqtt_bridge.py stores the
readings; this endpoint is the alternative for a gateway (or script) that POSTs directly.
"""

import hmac
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from ..config import settings
from ..db import get_db
from ..services.readings import LEVEL_MAX_CM, LEVEL_MIN_CM, save_readings

router = APIRouter(prefix="/ingest", tags=["ingest"])


class Reading(BaseModel):
    device_id: str = Field(max_length=20)  # the ID printed on the device, e.g. NODE-0001
    water_level_cm: float | None = Field(None, ge=LEVEL_MIN_CM, le=LEVEL_MAX_CM)
    battery_pct: int | None = Field(None, ge=0, le=100)
    recorded_at: datetime | None = None


def _check_key(x_api_key: str = Header(...)):
    if not hmac.compare_digest(x_api_key, settings.ingest_api_key):
        raise HTTPException(401, "Invalid API key")


@router.post("/readings", status_code=201, dependencies=[Depends(_check_key)])
def ingest_readings(readings: list[Reading], conn=Depends(get_db)):
    return save_readings(conn, [r.model_dump() for r in readings])
