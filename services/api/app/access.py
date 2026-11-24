"""Who can see and edit which paddy.

admin    -> everything, read and write
verifier -> every paddy, read only (needs the evidence to verify)
farmer   -> the paddies they own (paddy.owner_user_id)
"""

from .db import fetch_one
from .errors import api_error


def paddy_access_sql(user, alias="p"):
    """WHERE fragment limiting a query to paddies the user can see."""
    if user["role"] in ("admin", "verifier"):
        return "1 = 1", {}
    return f"{alias}.owner_user_id = :uid", {"uid": user["user_id"]}


def can_edit(user, paddy):
    return user["role"] == "admin" or paddy["owner_user_id"] == user["user_id"]


def require_paddy(conn, user, paddy_id, write=False):
    paddy = fetch_one(conn, "SELECT * FROM paddy WHERE paddy_id = :id", id=paddy_id)
    if not paddy or (user["role"] == "farmer" and paddy["owner_user_id"] != user["user_id"]):
        raise api_error(404, "paddy_not_found", "Paddy not found")
    paddy["can_edit"] = can_edit(user, paddy)
    if write and not paddy["can_edit"]:
        raise api_error(403, "paddy_read_only", "You can't edit this paddy")
    return paddy


def require_calendar(conn, user, calendar_id, write=False):
    calendar = fetch_one(conn, "SELECT * FROM farming_calendars WHERE calendar_id = :id", id=calendar_id)
    if not calendar:
        raise api_error(404, "calendar_not_found", "Crop calendar not found")
    paddy = require_paddy(conn, user, calendar["paddy_id"], write)
    calendar["paddy"] = paddy
    calendar["can_edit"] = paddy["can_edit"]
    return calendar
