import os, secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..database import get_db
from ..security import verify_password, hash_password, create_token, current_user
from ..governance import record_audit

router=APIRouter(prefix="/api/auth", tags=["authentication"])
class LoginPayload(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)
class CreateUserPayload(BaseModel):
    username: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=10, max_length=256)
    role: str = "reviewer"

@router.post("/login")
def login(payload: LoginPayload):
    conn=get_db(); row=conn.execute("SELECT * FROM users WHERE username=?", (payload.username.strip(),)).fetchone(); conn.close()
    if not row or not row["is_active"] or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    user={"id":row["id"],"username":row["username"],"role":row["role"]}
    return {"access_token":create_token(user),"token_type":"bearer","user":user}

@router.get("/me")
def me(user=Depends(current_user)): return user

@router.get("/users")
def list_users(user=Depends(current_user)):
    if user["role"] != "admin": raise HTTPException(status_code=403, detail="Administrator role required")
    conn=get_db(); rows=conn.execute("SELECT id, username, role, is_active, created_at FROM users ORDER BY role, username").fetchall(); conn.close()
    return [dict(r) for r in rows]

@router.post("/users")
def create_user(payload: CreateUserPayload, user=Depends(current_user)):
    if user["role"] != "admin": raise HTTPException(status_code=403, detail="Administrator role required")
    if payload.role not in ("admin","reviewer"): raise HTTPException(status_code=400, detail="Role must be admin or reviewer")
    now=datetime.now(timezone.utc).isoformat(); uid="usr_"+secrets.token_hex(8)
    conn=get_db(); cur=conn.cursor()
    try:
        cur.execute("INSERT INTO users (id, username, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, 1, ?)",(uid,payload.username.strip(),hash_password(payload.password),payload.role,now))
        record_audit(cur,"user_created","user",uid,{"username":payload.username.strip(),"role":payload.role,"created_by":user["username"]})
        conn.commit()
    except Exception as e:
        conn.close()
        if "UNIQUE" in str(e): raise HTTPException(status_code=409, detail="Username already exists")
        raise
    conn.close(); return {"id":uid,"username":payload.username.strip(),"role":payload.role,"created_at":now}
