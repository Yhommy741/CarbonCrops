from sqlalchemy import URL, create_engine, text

from .config import settings

engine = create_engine(
    URL.create(
        "mysql+pymysql",
        username=settings.db_user,
        password=settings.db_password,
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name,
        query={"charset": "utf8mb4"},
    ),
    pool_pre_ping=True,
    pool_recycle=3600,
)


def get_db():
    """One transaction per request: committed on success, rolled back on error."""
    with engine.begin() as conn:
        yield conn


def fetch_all(conn, sql, **params):
    return [dict(r._mapping) for r in conn.execute(text(sql), params)]


def fetch_one(conn, sql, **params):
    r = conn.execute(text(sql), params).first()
    return dict(r._mapping) if r else None


def execute(conn, sql, **params):
    return conn.execute(text(sql), params)
