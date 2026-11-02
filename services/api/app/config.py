import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Same variable names as services/database/db.js
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = int(os.getenv("DB_PORT", "3306"))
    db_user = os.getenv("DB_USER", "root")
    db_password = os.getenv("DB_PASSWORD", "")
    db_name = os.getenv("DB_NAME", "carboncrops")

    jwt_secret = os.getenv("JWT_SECRET", "dev-secret-change-me")
    jwt_hours = int(os.getenv("JWT_HOURS", "168"))
    # Pick-a-user login for development, until LINE Login is wired up
    dev_login = os.getenv("DEV_LOGIN", "true").lower() == "true"

    # Shared key the LoRa gateway sends when posting sensor readings
    ingest_api_key = os.getenv("INGEST_API_KEY", "dev-ingest-key")

    # Reference price for the income estimator (THB per tCO2e)
    carbon_price_thb = float(os.getenv("CARBON_PRICE_THB", "300"))

    upload_dir = os.getenv("UPLOAD_DIR", "uploads")
    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")


settings = Settings()
