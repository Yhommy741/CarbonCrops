"""Who can see and edit which plot.

admin    -> everything, read and write
verifier -> every plot, read only (needs the evidence to verify)
farmer   -> plots they own (owner) or were added to in plot_members
"""

from fastapi import HTTPException

from .db import fetch_one

WRITE_ROLES = ("owner", "worker")


def plot_access_sql(user, alias="p"):
    """WHERE fragment limiting a query to plots the user can see."""
    if user["role"] in ("admin", "verifier"):
        return "1 = 1", {}
    return (
        f"({alias}.owner_user_id = :uid OR EXISTS ("
        f"SELECT 1 FROM plot_members m WHERE m.plot_id = {alias}.plot_id AND m.user_id = :uid))",
        {"uid": user["user_id"]},
    )


def plot_role(conn, user, plot):
    if user["role"] == "admin" or plot["owner_user_id"] == user["user_id"]:
        return "owner"
    member = fetch_one(
        conn,
        "SELECT member_role FROM plot_members WHERE plot_id = :pid AND user_id = :uid",
        pid=plot["plot_id"],
        uid=user["user_id"],
    )
    if member:
        return member["member_role"]
    if user["role"] == "verifier":
        return "viewer"
    return None


def require_plot(conn, user, plot_id, write=False):
    plot = fetch_one(conn, "SELECT * FROM plots WHERE plot_id = :id", id=plot_id)
    if not plot:
        raise HTTPException(404, "ไม่พบแปลงนา")
    role = plot_role(conn, user, plot)
    if role is None:
        raise HTTPException(404, "ไม่พบแปลงนา")
    if write and role not in WRITE_ROLES:
        raise HTTPException(403, "ไม่มีสิทธิ์แก้ไขแปลงนี้")
    plot["my_role"] = role
    return plot


def require_cycle(conn, user, cycle_id, write=False):
    cycle = fetch_one(conn, "SELECT * FROM crop_cycles WHERE cycle_id = :id", id=cycle_id)
    if not cycle:
        raise HTTPException(404, "ไม่พบรอบการปลูก")
    plot = require_plot(conn, user, cycle["plot_id"], write)
    cycle["my_role"] = plot["my_role"]
    return cycle
