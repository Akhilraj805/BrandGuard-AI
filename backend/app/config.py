import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def get_db_path() -> str:
    return os.getenv("BRANDGUARD_DB_PATH", str(BASE_DIR / "brandguard.db"))

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",
]
