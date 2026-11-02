from fastapi import APIRouter, Depends

from ..auth import current_user
from ..db import fetch_all, get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user=Depends(current_user), conn=Depends(get_db)):
    return fetch_all(
        conn,
        """SELECT notification_id, notif_type, message, status, sent_at, created_at
           FROM notifications WHERE user_id = :uid ORDER BY created_at DESC LIMIT 100""",
        uid=user["user_id"],
    )
