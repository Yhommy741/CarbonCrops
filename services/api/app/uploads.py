import os
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from .config import settings

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
}
MAX_BYTES = 10 * 1024 * 1024


def save_photo(file: UploadFile):
    """Save an uploaded photo; returns (path stored in the DB, content type).

    Stored paths look like "uploads/2026/11/<id>.jpg" (same shape as the sample
    data) and are served at "/uploads/...".
    """
    ext = ALLOWED_TYPES.get(file.content_type)
    if not ext:
        raise HTTPException(400, "รองรับเฉพาะไฟล์รูปภาพ (jpg, png, webp, heic)")
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "ไฟล์ใหญ่เกิน 10 MB")
    now = datetime.now()
    rel = f"{now:%Y}/{now:%m}/{uuid4().hex}{ext}"
    path = os.path.join(settings.upload_dir, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return f"uploads/{rel}", file.content_type
