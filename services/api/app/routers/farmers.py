"""Verifier view of farmers: everyone who farms, and each one's full farming history."""

from collections import defaultdict

from fastapi import APIRouter, Depends

from ..auth import require_role
from ..db import fetch_all, fetch_one, get_db
from ..errors import api_error
from ..services.calendar import describe

router = APIRouter(prefix="/farmers", tags=["farmers"])

verifier = require_role("verifier", "admin")


@router.get("")
def list_farmers(user=Depends(verifier), conn=Depends(get_db)):
    return fetch_all(
        conn,
        """SELECT u.user_id, u.display_name, u.phone, u.province, u.district,
                  COUNT(DISTINCT p.paddy_id) AS paddies,
                  COALESCE((SELECT SUM(p2.area_rai) FROM paddy p2 WHERE p2.owner_user_id = u.user_id), 0) AS area_rai,
                  COUNT(DISTINCT fc.calendar_id) AS calendars,
                  COUNT(DISTINCT CASE WHEN fc.harvest_date IS NOT NULL THEN fc.calendar_id END) AS completed,
                  COALESCE(SUM(CASE WHEN cc.credit_status = 'passed' THEN cc.credit_tco2e END), 0) AS verified_tco2e,
                  COUNT(CASE WHEN cc.credit_status = 'not_checked' THEN 1 END) AS pending
           FROM users u
           LEFT JOIN paddy p ON p.owner_user_id = u.user_id
           LEFT JOIN farming_calendars fc ON fc.paddy_id = p.paddy_id
           LEFT JOIN carboncredit_info cc ON cc.calendar_id = fc.calendar_id
           WHERE u.role = 'farmer' AND u.is_active = 1
           GROUP BY u.user_id
           ORDER BY u.display_name""",
    )


@router.get("/{user_id}")
def get_farmer(user_id: str, user=Depends(verifier), conn=Depends(get_db)):
    farmer = fetch_one(
        conn,
        """SELECT user_id, display_name, phone, address, province, district, created_at
           FROM users WHERE user_id = :id AND role = 'farmer'""",
        id=user_id,
    )
    if not farmer:
        raise api_error(404, "farmer_not_found", "Farmer not found")

    calendars = defaultdict(list)
    for c in fetch_all(
        conn,
        """SELECT fc.calendar_id, fc.paddy_id, fc.rice_variety, fc.planting_date, fc.harvest_date,
                  cc.credit_tco2e, cc.credit_status
           FROM farming_calendars fc
           JOIN paddy p ON p.paddy_id = fc.paddy_id
           LEFT JOIN carboncredit_info cc ON cc.calendar_id = fc.calendar_id
           WHERE p.owner_user_id = :id
           ORDER BY fc.planting_date DESC""",
        id=user_id,
    ):
        calendars[c["paddy_id"]].append(describe(c))

    farmer["paddies"] = fetch_all(
        conn,
        """SELECT paddy_id, paddy_name, area_rai, latitude, longitude, province, district, subdistrict, land_doc_no
           FROM paddy WHERE owner_user_id = :id ORDER BY paddy_name""",
        id=user_id,
    )
    for p in farmer["paddies"]:
        p["calendars"] = calendars[p["paddy_id"]]
    return farmer
