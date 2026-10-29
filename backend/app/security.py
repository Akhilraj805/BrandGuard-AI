"""Small dependency-light auth layer for the Round 3 demo."""
import base64, hashlib, hmac, json, os, secrets, time
from datetime import datetime, timezone
from fastapi import Header, HTTPException
from .database import get_db

SECRET = os.getenv("BRANDGUARD_SECRET_KEY", "local-demo-only-change-this-secret-before-deploying")

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16); rounds = 240000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), rounds).hex()
    return f"pbkdf2_sha256${rounds}${salt}${digest}"

def verify_password(password: str, stored: str) -> bool:
    try:
        _, rounds, salt, expected = stored.split("$", 3)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(rounds)).hex()
        return hmac.compare_digest(actual, expected)
    except Exception: return False

def create_token(user: dict) -> str:
    now = int(time.time())
    header = _b64(json.dumps({"alg":"HS256","typ":"JWT"}, separators=(",",":")).encode())
    payload = _b64(json.dumps({"sub":user["id"],"username":user["username"],"role":user["role"],"iat":now,"exp":now+28800}, separators=(",",":")).encode())
    signing = f"{header}.{payload}"
    signature = _b64(hmac.new(SECRET.encode(), signing.encode(), hashlib.sha256).digest())
    return f"{signing}.{signature}"

def current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in required")
    token = authorization[7:].strip()
    try:
        head, payload, signature = token.split(".")
        signing=f"{head}.{payload}"
        expected=_b64(hmac.new(SECRET.encode(), signing.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected): raise ValueError()
        claims=json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload)%4)))
        if int(claims["exp"]) < int(time.time()): raise ValueError()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    conn=get_db(); row=conn.execute("SELECT id, username, role, is_active FROM users WHERE id=?", (claims["sub"],)).fetchone(); conn.close()
    if not row or not row["is_active"]: raise HTTPException(status_code=401, detail="Account is inactive")
    return dict(row)

def require_admin(user: dict = None):
    if user is None: user=current_user()
    if user["role"] != "admin": raise HTTPException(status_code=403, detail="Administrator role required")
    return user
