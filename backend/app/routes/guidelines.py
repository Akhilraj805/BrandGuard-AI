import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Depends
from ..database import get_db
from ..security import current_user
from ..governance import record_guideline_version, record_audit
from ..models import (
    GuidelineResponse,
    GuidelineCreate,
    GuidelineUpdate,
    ProhibitedTermRule,
    RequiredTermRule,
    ToneRule,
    CustomRule,
)

router = APIRouter(prefix="/api/guidelines", tags=["guidelines"])


def _row_to_guideline(row) -> GuidelineResponse:
    return GuidelineResponse(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        is_active=bool(row["is_active"]),
        prohibited_terms=[ProhibitedTermRule(**item) for item in json.loads(row["prohibited_terms"] or "[]")],
        required_terms=[RequiredTermRule(**item) for item in json.loads(row["required_terms"] or "[]")],
        tone_rules=[ToneRule(**item) for item in json.loads(row["tone_rules"] or "[]")],
        custom_rules=[CustomRule(**item) for item in json.loads(row["custom_rules"] or "[]")],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("", response_model=List[GuidelineResponse])
def list_guidelines():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM guidelines ORDER BY is_active DESC, updated_at DESC;")
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_guideline(r) for r in rows]


@router.get("/{guideline_id}", response_model=GuidelineResponse)
def get_guideline(guideline_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM guidelines WHERE id = ?;", (guideline_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Guideline profile not found")
    return _row_to_guideline(row)


@router.post("", response_model=GuidelineResponse, status_code=201)
def create_guideline(data: GuidelineCreate, user=Depends(current_user)):
    if user["role"] != "admin": raise HTTPException(status_code=403, detail="Administrator role required")
    conn = get_db()
    cursor = conn.cursor()

    gid = data.id or f"guideline_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    # If new guideline is active, optionally deactivate other guidelines if desired
    if data.is_active:
        cursor.execute("UPDATE guidelines SET is_active = 0 WHERE 1=1;")

    cursor.execute("""
    INSERT INTO guidelines (id, name, description, is_active, prohibited_terms, required_terms, tone_rules, custom_rules, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        gid,
        data.name.strip(),
        data.description.strip(),
        1 if data.is_active else 0,
        json.dumps([t.model_dump() for t in data.prohibited_terms]),
        json.dumps([t.model_dump() for t in data.required_terms]),
        json.dumps([t.model_dump() for t in data.tone_rules]),
        json.dumps([t.model_dump() for t in data.custom_rules]),
        now,
        now,
    ))
    record_guideline_version(cursor, gid, "created")
    record_audit(cursor, "guideline_created", "guideline", gid, {"name": data.name.strip()})
    conn.commit()

    cursor.execute("SELECT * FROM guidelines WHERE id = ?;", (gid,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_guideline(row)


@router.put("/{guideline_id}", response_model=GuidelineResponse)
def update_guideline(guideline_id: str, data: GuidelineUpdate, user=Depends(current_user)):
    if user["role"] != "admin": raise HTTPException(status_code=403, detail="Administrator role required")
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM guidelines WHERE id = ?;", (guideline_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Guideline profile not found")

    now = datetime.now(timezone.utc).isoformat()
    name = data.name if data.name is not None else existing["name"]
    description = data.description if data.description is not None else existing["description"]
    is_active = (1 if data.is_active else 0) if data.is_active is not None else existing["is_active"]

    if data.is_active:
        cursor.execute("UPDATE guidelines SET is_active = 0 WHERE id != ?;", (guideline_id,))

    prohibited = (
        json.dumps([t.model_dump() for t in data.prohibited_terms])
        if data.prohibited_terms is not None
        else existing["prohibited_terms"]
    )
    required = (
        json.dumps([t.model_dump() for t in data.required_terms])
        if data.required_terms is not None
        else existing["required_terms"]
    )
    tone = (
        json.dumps([t.model_dump() for t in data.tone_rules])
        if data.tone_rules is not None
        else existing["tone_rules"]
    )
    custom = (
        json.dumps([t.model_dump() for t in data.custom_rules])
        if data.custom_rules is not None
        else existing["custom_rules"]
    )

    cursor.execute("""
    UPDATE guidelines
    SET name = ?, description = ?, is_active = ?, prohibited_terms = ?, required_terms = ?, tone_rules = ?, custom_rules = ?, updated_at = ?
    WHERE id = ?;
    """, (name, description, is_active, prohibited, required, tone, custom, now, guideline_id))

    record_guideline_version(cursor, guideline_id, "updated")
    record_audit(cursor, "guideline_updated", "guideline", guideline_id, {"name": name})
    conn.commit()
    cursor.execute("SELECT * FROM guidelines WHERE id = ?;", (guideline_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_guideline(row)


@router.delete("/{guideline_id}")
def delete_guideline(guideline_id: str, user=Depends(current_user)):
    if user["role"] != "admin": raise HTTPException(status_code=403, detail="Administrator role required")
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) AS total FROM guidelines;")
    total = cursor.fetchone()["total"]
    if total <= 1:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot delete the sole brand guideline profile.")

    cursor.execute("SELECT * FROM guidelines WHERE id = ?;", (guideline_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Guideline profile not found")

    was_active = existing["is_active"]
    record_audit(cursor, "guideline_deleted", "guideline", guideline_id, {"name": existing["name"]})
    cursor.execute("DELETE FROM guidelines WHERE id = ?;", (guideline_id,))

    # If the active profile was deleted, activate the next available profile
    if was_active:
        cursor.execute("UPDATE guidelines SET is_active = 1 WHERE rowid = (SELECT rowid FROM guidelines LIMIT 1);")

    conn.commit()
    conn.close()
    return {"message": "Guideline profile deleted successfully", "id": guideline_id}


@router.post("/{guideline_id}/activate", response_model=GuidelineResponse)
def activate_guideline(guideline_id: str, user=Depends(current_user)):
    if user["role"] != "admin": raise HTTPException(status_code=403, detail="Administrator role required")
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM guidelines WHERE id = ?;", (guideline_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Guideline profile not found")

    cursor.execute("UPDATE guidelines SET is_active = 0 WHERE 1=1;")
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("UPDATE guidelines SET is_active = 1, updated_at = ? WHERE id = ?;", (now, guideline_id))
    record_guideline_version(cursor, guideline_id, "activated")
    record_audit(cursor, "guideline_activated", "guideline", guideline_id, {"name": existing["name"]})
    conn.commit()

    cursor.execute("SELECT * FROM guidelines WHERE id = ?;", (guideline_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_guideline(row)
