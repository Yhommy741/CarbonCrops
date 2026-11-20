from fastapi import HTTPException


def api_error(status, code, message):
    """HTTP error the web app can translate: it looks up `code` in its locale files
    (apps/web/src/locales, errors.<code>) and falls back to the English `message`."""
    return HTTPException(status, detail={"code": code, "message": message})
