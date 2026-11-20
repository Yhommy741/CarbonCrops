"""Certificates: carbon credits a verifier passed (one per crop calendar)."""

from fastapi import APIRouter, Depends

from ..access import paddy_access_sql
from ..auth import current_user
from ..db import fetch_all, fetch_one, get_db
from ..errors import api_error
from ..services.calendar import describe

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_SQL = """
SELECT cc.credit_id, cc.credit_tco2e, cc.credit_status, cc.amount_thb, cc.submitted_at,
       cc.verified_at, cc.verify_comment,
       fc.calendar_id, fc.paddy_id, fc.rice_variety, fc.planting_date, fc.harvest_date,
       p.paddy_name, p.area_rai, p.province, p.district, p.subdistrict,
       p.latitude, p.longitude, p.land_doc_no,
       owner.display_name AS farmer_name, rev.display_name AS verifier_name
FROM carboncredit_info cc
JOIN farming_calendars fc ON fc.calendar_id = cc.calendar_id
JOIN paddy p ON p.paddy_id = cc.paddy_id
JOIN users owner ON owner.user_id = p.owner_user_id
LEFT JOIN users rev ON rev.user_id = cc.verified_by
WHERE cc.credit_status = 'passed'
"""


def _report(row):
    row = describe(row)
    # The table has no report number; a short, stable one from the credit id
    row["report_no"] = "CC-" + row["credit_id"][:8].upper()
    return row


@router.get("")
def list_reports(user=Depends(current_user), conn=Depends(get_db)):
    where, params = paddy_access_sql(user)
    rows = fetch_all(conn, f"{REPORT_SQL} AND {where} ORDER BY cc.verified_at DESC", **params)
    return [_report(r) for r in rows]


@router.get("/{credit_id}")
def get_report(credit_id: str, user=Depends(current_user), conn=Depends(get_db)):
    where, params = paddy_access_sql(user)
    row = fetch_one(conn, f"{REPORT_SQL} AND cc.credit_id = :cid AND {where}", cid=credit_id, **params)
    if not row:
        raise api_error(404, "report_not_found", "Certificate not found")
    return _report(row)
