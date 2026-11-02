from fastapi import APIRouter, Depends, HTTPException

from ..access import plot_access_sql
from ..auth import current_user
from ..db import fetch_all, fetch_one, get_db

router = APIRouter(prefix="/reports", tags=["reports"])

REPORT_SQL = """
SELECT r.report_id, r.report_no, r.reduction_tco2e, r.generated_at, r.file_path,
       c.cycle_id, c.cycle_name, c.rice_variety, c.start_date, c.end_date,
       p.plot_id, p.plot_name, p.area_rai, p.province, p.district, p.subdistrict,
       p.latitude, p.longitude, p.land_doc_no,
       owner.display_name AS farmer_name,
       e.method_version, e.baseline_tco2e, e.project_tco2e,
       v.status AS verification_status, v.decided_at, v.comment AS verification_comment,
       rev.display_name AS verifier_name
FROM ghg_reports r
JOIN crop_cycles c ON c.cycle_id = r.cycle_id
JOIN plots p ON p.plot_id = c.plot_id
JOIN users owner ON owner.user_id = p.owner_user_id
JOIN ghg_estimates e ON e.estimate_id = r.estimate_id
LEFT JOIN verifications v ON v.verification_id = r.verification_id
LEFT JOIN users rev ON rev.user_id = v.verifier_user_id
"""


@router.get("")
def list_reports(user=Depends(current_user), conn=Depends(get_db)):
    where, params = plot_access_sql(user)
    return fetch_all(conn, f"{REPORT_SQL} WHERE {where} ORDER BY r.generated_at DESC", **params)


@router.get("/{report_id}")
def get_report(report_id: str, user=Depends(current_user), conn=Depends(get_db)):
    where, params = plot_access_sql(user)
    report = fetch_one(
        conn, f"{REPORT_SQL} WHERE r.report_id = :rid AND {where}", rid=report_id, **params
    )
    if not report:
        raise HTTPException(404, "ไม่พบรายงาน")
    return report
