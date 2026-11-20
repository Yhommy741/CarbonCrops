from datetime import datetime
from uuid import uuid4

from ..db import execute
from ..uploads import save_photo
from .calendar import rice_stages, stage_on


def record_activity(
    conn,
    calendar,
    activity_type,
    activity_date,
    note=None,
    photo=None,
    latitude=None,
    longitude=None,
    captured_at=None,
    fertilizer_formula=None,
    fertilizer_kg_per_rai=None,
):
    """Insert an activity (its rice stage worked out from the date) and, with a photo, its evidence row."""
    stage = stage_on(rice_stages(conn), calendar["planting_date"], activity_date)
    activity_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO activities (activity_id, calendar_id, stage_no, activity_type, activity_date,
                                   note, fertilizer_formula, fertilizer_kg_per_rai)
           VALUES (:id, :cal, :stage, :type, :date, :note, :formula, :kg)""",
        id=activity_id,
        cal=calendar["calendar_id"],
        stage=stage["stage_no"],
        type=activity_type,
        date=activity_date,
        note=note or None,
        formula=fertilizer_formula,
        kg=fertilizer_kg_per_rai,
    )
    if photo is not None:
        path, content_type = save_photo(photo)
        execute(
            conn,
            """INSERT INTO activity_evidence
                   (evidence_id, activity_id, file_path, file_type, captured_at, latitude, longitude)
               VALUES (:id, :aid, :path, :type, :captured_at, :lat, :lng)""",
            id=str(uuid4()),
            aid=activity_id,
            path=path,
            type=content_type,
            captured_at=captured_at or datetime.now(),
            lat=latitude,
            lng=longitude,
        )
    return activity_id
