"""History: crops that were harvested (finished farms), newest first, with their carbon credit."""

from fastapi import APIRouter, Depends

from ..access import paddy_access_sql
from ..auth import current_user
from ..db import fetch_all, get_db
from ..services.calendar import describe

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
def list_history(user=Depends(current_user), conn=Depends(get_db)):
    where, params = paddy_access_sql(user)
    rows = fetch_all(
        conn,
        f"""SELECT fc.calendar_id, fc.paddy_id, fc.rice_variety, fc.planting_date, fc.harvest_date, fc.harvest_kg,
                   p.paddy_name, p.area_rai,
                   cc.credit_id, cc.credit_tco2e, cc.credit_status
            FROM farming_calendars fc
            JOIN paddy p ON p.paddy_id = fc.paddy_id
            LEFT JOIN carboncredit_info cc ON cc.calendar_id = fc.calendar_id
            WHERE fc.harvest_date IS NOT NULL AND {where}
            ORDER BY fc.harvest_date DESC""",
        **params,
    )
    return [describe(r) for r in rows]
