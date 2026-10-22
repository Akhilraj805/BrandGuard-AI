
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def get_db_path() -> str:
    return os.getenv(
        "BRANDGUARD_DB_PATH",
        str(BASE_DIR / "brandguard.db"),
    )


_default_origins = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173,"
    "http://localhost:5174,"
    "http://127.0.0.1:5174,"
    "http://localhost:3000,"
    "http://127.0.0.1:3000"
)

CORS_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "BRANDGUARD_CORS_ORIGINS",
        _default_origins,
    ).split(",")
    if origin.strip()
]
