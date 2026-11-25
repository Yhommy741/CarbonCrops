"""Create the Pending credit for every harvested crop that doesn't have one yet.

Crops harvested before credits were created automatically at harvest (they used to wait
for a manual "submit"). Safe to run again; it only adds missing credits.

    docker compose exec api python -m app.backfill_credits
"""

from .db import engine, fetch_all
from .services.credits import create_pending_credit


def main():
    with engine.begin() as conn:
        calendars = fetch_all(
            conn,
            """SELECT fc.calendar_id, fc.paddy_id, fc.planting_date, fc.harvest_date, p.area_rai
               FROM farming_calendars fc
               JOIN paddy p ON p.paddy_id = fc.paddy_id
               LEFT JOIN carboncredit_info cc ON cc.calendar_id = fc.calendar_id
               WHERE fc.harvest_date IS NOT NULL AND cc.credit_id IS NULL""",
        )
        for c in calendars:
            create_pending_credit(conn, c, c["area_rai"])
    print(f"created {len(calendars)} pending credit(s)")


if __name__ == "__main__":
    main()
