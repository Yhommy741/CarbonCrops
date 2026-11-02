from fastapi import APIRouter, Depends

from ..access import plot_access_sql
from ..auth import current_user
from ..config import settings
from ..db import fetch_all, get_db

router = APIRouter(prefix="/carbon", tags=["carbon"])


@router.get("/summary")
def summary(user=Depends(current_user), conn=Depends(get_db)):
    where, params = plot_access_sql(user)
    cycles = fetch_all(
        conn,
        f"""SELECT c.cycle_id, c.cycle_name, c.status, c.start_date, c.end_date,
                   p.plot_id, p.plot_name, p.area_rai,
                   e.reduction_tco2e AS estimated_tco2e, e.method_version, e.calculated_at,
                   (SELECT v.status FROM verifications v WHERE v.cycle_id = c.cycle_id
                    ORDER BY v.submitted_at DESC LIMIT 1) AS verification_status,
                   (SELECT r.reduction_tco2e FROM ghg_reports r
                    JOIN verifications v ON v.verification_id = r.verification_id
                    WHERE r.cycle_id = c.cycle_id AND v.status = 'approved'
                    ORDER BY r.generated_at DESC LIMIT 1) AS verified_tco2e
            FROM crop_cycles c
            JOIN plots p ON p.plot_id = c.plot_id
            LEFT JOIN ghg_estimates e ON e.estimate_id = (
                SELECT e2.estimate_id FROM ghg_estimates e2 WHERE e2.cycle_id = c.cycle_id
                ORDER BY e2.calculated_at DESC LIMIT 1)
            WHERE {where}
            ORDER BY c.start_date DESC""",
        **params,
    )
    verified = pending = estimated = 0.0
    for c in cycles:
        if c["verified_tco2e"] is not None:
            verified += float(c["verified_tco2e"])
        elif c["estimated_tco2e"] is not None:
            if c["verification_status"] in ("pending", "in_review"):
                pending += float(c["estimated_tco2e"])
            else:
                estimated += float(c["estimated_tco2e"])
    return {
        "price_thb_per_tco2e": settings.carbon_price_thb,
        "totals": {
            "verified_tco2e": round(verified, 4),
            "pending_tco2e": round(pending, 4),
            "estimated_tco2e": round(estimated, 4),
        },
        "cycles": cycles,
    }
