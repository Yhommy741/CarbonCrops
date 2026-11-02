from datetime import datetime
from uuid import uuid4

from ..db import execute
from ..uploads import save_photo


def record_activity(
    conn,
    cycle_id,
    user_id,
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
    """Insert an activity and, if a photo came with it, its geotagged evidence row."""
    activity_id = str(uuid4())
    execute(
        conn,
        """INSERT INTO activities (activity_id, cycle_id, recorded_by, activity_type, activity_date,
                                   note, fertilizer_formula, fertilizer_kg_per_rai)
           VALUES (:id, :cid, :uid, :type, :date, :note, :formula, :kg)""",
        id=activity_id,
        cid=cycle_id,
        uid=user_id,
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
