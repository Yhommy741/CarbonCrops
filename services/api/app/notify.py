from uuid import uuid4

from .db import execute


def notify(conn, user_id, notif_type, message):
    """Queue a LINE notification. A sender job (not built yet) delivers 'pending' rows."""
    execute(
        conn,
        """INSERT INTO notifications (notification_id, user_id, channel, notif_type, message, status)
           VALUES (:id, :uid, 'line', :type, :msg, 'pending')""",
        id=str(uuid4()),
        uid=user_id,
        type=notif_type,
        msg=message,
    )
