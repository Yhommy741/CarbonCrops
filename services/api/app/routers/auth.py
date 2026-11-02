from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import USER_FIELDS, create_token, current_user
from ..config import settings
from ..db import fetch_all, fetch_one, get_db

router = APIRouter(prefix="/auth", tags=["auth"])


class DevLogin(BaseModel):
    user_id: str


def _dev_only():
    if not settings.dev_login:
        raise HTTPException(404, "Not found")


@router.get("/demo-users", dependencies=[Depends(_dev_only)])
def demo_users(conn=Depends(get_db)):
    return fetch_all(
        conn,
        "SELECT user_id, display_name, role, province FROM users "
        "WHERE is_active = 1 ORDER BY role, display_name",
    )


@router.post("/dev-login", dependencies=[Depends(_dev_only)])
def dev_login(body: DevLogin, conn=Depends(get_db)):
    user = fetch_one(
        conn,
        f"SELECT {USER_FIELDS} FROM users WHERE user_id = :id AND is_active = 1",
        id=body.user_id,
    )
    if not user:
        raise HTTPException(404, "ไม่พบผู้ใช้")
    return {"token": create_token(user["user_id"]), "user": user}


@router.get("/me")
def me(user=Depends(current_user)):
    return user
