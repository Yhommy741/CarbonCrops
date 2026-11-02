from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings
from .db import fetch_one, get_db

USER_FIELDS = "user_id, display_name, phone, role, address, province, district"

bearer = HTTPBearer(auto_error=False)


def create_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_hours)
    return jwt.encode({"sub": user_id, "exp": exp}, settings.jwt_secret, algorithm="HS256")


def current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    conn=Depends(get_db),
):
    if not cred:
        raise HTTPException(401, "กรุณาเข้าสู่ระบบ")
    try:
        payload = jwt.decode(cred.credentials, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่")
    user = fetch_one(
        conn,
        f"SELECT {USER_FIELDS} FROM users WHERE user_id = :id AND is_active = 1",
        id=payload["sub"],
    )
    if not user:
        raise HTTPException(401, "ไม่พบผู้ใช้")
    return user


def require_role(*roles):
    def dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "ไม่มีสิทธิ์ใช้งานส่วนนี้")
        return user

    return dep
