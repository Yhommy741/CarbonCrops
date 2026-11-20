from fastapi import APIRouter, Depends

from ..access import paddy_access_sql
from ..auth import current_user
from ..config import settings
from ..db import fetch_all, get_db
from ..services import ghg
from ..services.calendar import describe
from ..services.water import water_series

router = APIRouter(prefix="/carbon", tags=["carbon"])


@router.get("/summary")
def summary(user=Depends(current_user), conn=Depends(get_db)):
    where, params = paddy_access_sql(user)
    calendars = fetch_all(
        conn,
        f"""SELECT fc.calendar_id, fc.paddy_id, fc.rice_variety, fc.planting_date, fc.harvest_date,
                   p.paddy_name, p.area_rai,
                   cc.credit_tco2e, cc.credit_status, cc.amount_thb
            FROM farming_calendars fc
            JOIN paddy p ON p.paddy_id = fc.paddy_id
            LEFT JOIN carboncredit_info cc ON cc.calendar_id = fc.calendar_id
            WHERE {where}
            ORDER BY fc.planting_date DESC""",
        **params,
    )
    verified = pending = estimated = earned_thb = 0.0
    for c in calendars:
        describe(c)
        c["estimated_tco2e"] = None
        if c["credit_status"] == "passed":
            verified += float(c["credit_tco2e"])
            earned_thb += float(c["amount_thb"] or 0)
        elif c["credit_status"] == "not_checked":
            pending += float(c["credit_tco2e"])
        elif c["status"] == "harvested":  # not submitted yet, or failed: what the sensor data supports now
            result = ghg.estimate(c["planting_date"], c["harvest_date"], c["area_rai"], water_series(conn, c))
            c["estimated_tco2e"] = result["reduction_tco2e"]
            estimated += result["reduction_tco2e"]
    return {
        "price_thb_per_tco2e": settings.carbon_price_thb,
        "totals": {
            "verified_tco2e": round(verified, 4),
            "pending_tco2e": round(pending, 4),
            "estimated_tco2e": round(estimated, 4),
            "earned_thb": round(earned_thb, 2),
        },
        "calendars": calendars,
    }
