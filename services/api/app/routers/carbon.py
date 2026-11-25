from fastapi import APIRouter, Depends

from ..access import paddy_access_sql
from ..auth import current_user
from ..db import fetch_one, get_db

router = APIRouter(prefix="/carbon", tags=["carbon"])


@router.get("/summary")
def summary(user=Depends(current_user), conn=Depends(get_db)):
    """The farmer's carbon credit totals in tCO2e: Pending (not_checked, waiting for the
    verifier) and Approved (passed). The carbon credit market (prices, income) is out of
    scope for this prototype."""
    where, params = paddy_access_sql(user)
    totals = fetch_one(
        conn,
        f"""SELECT COALESCE(SUM(CASE WHEN cc.credit_status = 'not_checked' THEN cc.credit_tco2e END), 0) AS pending,
                   COALESCE(SUM(CASE WHEN cc.credit_status = 'passed' THEN cc.credit_tco2e END), 0) AS approved
            FROM carboncredit_info cc
            JOIN paddy p ON p.paddy_id = cc.paddy_id
            WHERE {where}""",
        **params,
    )
    return {
        "totals": {
            "pending_tco2e": round(float(totals["pending"]), 4),
            "approved_tco2e": round(float(totals["approved"]), 4),
        },
    }
