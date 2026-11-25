"""Carbon credit of a harvested crop: Pending (not_checked) -> Approved (passed) or Disapproved (failed).

There is no manual submit step: recording the harvest creates the credit as Pending, with
the CH4 reduction the sensor data supports (services/ghg.py), for a verifier to decide.
"""

from uuid import uuid4

from ..db import execute, fetch_one
from . import ghg
from .water import water_series


def create_pending_credit(conn, calendar, area_rai):
    """Create the Pending credit of a harvested calendar (once); returns its credit_id.

    `calendar` needs calendar_id, paddy_id, planting_date and harvest_date. A crop whose
    sensor data shows no qualifying drying gets 0 tCO2e (credit_tco2e can't be negative).
    """
    existing = fetch_one(
        conn, "SELECT credit_id FROM carboncredit_info WHERE calendar_id = :id", id=calendar["calendar_id"]
    )
    if existing:
        return existing["credit_id"]
    reduction = ghg.estimate(
        calendar["planting_date"], calendar["harvest_date"], area_rai, water_series(conn, calendar)
    )["reduction_tco2e"]
    credit_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO carboncredit_info (credit_id, calendar_id, paddy_id, credit_tco2e)
           VALUES (:id, :cal, :paddy, :t)""",
        id=credit_id,
        cal=calendar["calendar_id"],
        paddy=calendar["paddy_id"],
        t=max(reduction, 0),
    )
    return credit_id
