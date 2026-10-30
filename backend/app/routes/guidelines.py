
import json
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

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


def require_admin(user):
    """Only administrators can modify guideline policies."""
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator role required",
        )


def _row_to_guideline(row) -> GuidelineResponse:
    return GuidelineResponse(
        id=row["id"],
        name=row["name"],
        description=row["description"],
        is_active=bool(row["is_active"]),
        prohibited_terms=[
            ProhibitedTermRule(**item)
            for item in json.loads(row["prohibited_terms"] or "[]")
        ],
        required_terms=[
            RequiredTermRule(**item)
            for item in json.loads(row["required_terms"] or "[]")
        ],
        tone_rules=[
            ToneRule(**item)
            for item in json.loads(row["tone_rules"] or "[]")
        ],
        custom_rules=[
            CustomRule(**item)
            for item in json.loads(row["custom_rules"] or "[]")
        ],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("", response_model=List[GuidelineResponse])
def list_guidelines(user=Depends(current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM guidelines ORDER BY is_active DESC, updated_at DESC;"
        )
        return [_row_to_guideline(row) for row in cursor.fetchall()]
    finally:
        conn.close()


@router.get("/{guideline_id}", response_model=GuidelineResponse)
def get_guideline(guideline_id: str, user=Depends(current_user)):
    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM guidelines WHERE id = ?;",
            (guideline_id,),
        )
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Guideline profile not found",
            )

        return _row_to_guideline(row)
    finally:
        conn.close()


@router.post("", response_model=GuidelineResponse, status_code=201)
def create_guideline(
    data: GuidelineCreate,
    user=Depends(current_user),
):
    require_admin(user)

    conn = get_db()
    try:
        cursor = conn.cursor()
        guideline_id = data.id or f"guideline_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()

        if data.is_active:
            cursor.execute("UPDATE guidelines SET is_active = 0;")

        cursor.execute(
            """
            INSERT INTO guidelines (
                id, name, description, is_active,
                prohibited_terms, required_terms, tone_rules, custom_rules,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                guideline_id,
                data.name.strip(),
                data.description.strip(),
                int(data.is_active),
                json.dumps([item.model_dump() for item in data.prohibited_terms]),
                json.dumps([item.model_dump() for item in data.required_terms]),
                json.dumps([item.model_dump() for item in data.tone_rules]),
                json.dumps([item.model_dump() for item in data.custom_rules]),
                now,
                now,
            ),
        )

        record_guideline_version(cursor, guideline_id, "created")
        record_audit(
            cursor,
            "guideline_created",
            "guideline",
            guideline_id,
            {"name": data.name.strip()},
        )
        conn.commit()

        cursor.execute(
            "SELECT * FROM guidelines WHERE id = ?;",
            (guideline_id,),
        )
        return _row_to_guideline(cursor.fetchone())
    finally:
        conn.close()


@router.put("/{guideline_id}", response_model=GuidelineResponse)
def update_guideline(
    guideline_id: str,
    data: GuidelineUpdate,
    user=Depends(current_user),
):
    require_admin(user)

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM guidelines WHERE id = ?;",
            (guideline_id,),
        )
        existing = cursor.fetchone()

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Guideline profile not found",
            )

        name = data.name if data.name is not None else existing["name"]
        description = (
            data.description
            if data.description is not None
            else existing["description"]
        )
        is_active = (
            int(data.is_active)
            if data.is_active is not None
            else existing["is_active"]
        )

        if is_active:
            cursor.execute(
                "UPDATE guidelines SET is_active = 0 WHERE id != ?;",
                (guideline_id,),
            )

        prohibited = (
            json.dumps([item.model_dump() for item in data.prohibited_terms])
            if data.prohibited_terms is not None
            else existing["prohibited_terms"]
        )
        required = (
            json.dumps([item.model_dump() for item in data.required_terms])
            if data.required_terms is not None
            else existing["required_terms"]
        )
        tone = (
            json.dumps([item.model_dump() for item in data.tone_rules])
            if data.tone_rules is not None
            else existing["tone_rules"]
        )
        custom = (
            json.dumps([item.model_dump() for item in data.custom_rules])
            if data.custom_rules is not None
            else existing["custom_rules"]
        )

        cursor.execute(
            """
            UPDATE guidelines
            SET name = ?, description = ?, is_active = ?,
                prohibited_terms = ?, required_terms = ?,
                tone_rules = ?, custom_rules = ?, updated_at = ?
            WHERE id = ?;
            """,
            (
                name,
                description,
                is_active,
                prohibited,
                required,
                tone,
                custom,
                datetime.now(timezone.utc).isoformat(),
                guideline_id,
            ),
        )

        record_guideline_version(cursor, guideline_id, "updated")
        record_audit(
            cursor,
            "guideline_updated",
            "guideline",
            guideline_id,
            {"name": name},
        )
        conn.commit()

        cursor.execute(
            "SELECT * FROM guidelines WHERE id = ?;",
            (guideline_id,),
        )
        return _row_to_guideline(cursor.fetchone())
    finally:
        conn.close()


@router.delete("/{guideline_id}")
def delete_guideline(
    guideline_id: str,
    user=Depends(current_user),
):
    require_admin(user)

    conn = get_db()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) AS total FROM guidelines;")
        if cursor.fetchone()["total"] <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the sole brand guideline profile.",
            )

        cursor.execute(
            "SELECT * FROM guidelines WHERE id = ?;",
            (guideline_id,),
        )
        existing = cursor.fetchone()

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Guideline profile not found",
            )

        was_active = existing["is_active"]

        record_audit(
            cursor,
            "guideline_deleted",
            "guideline",
            guideline_id,
            {"name": existing["name"]},
        )
        cursor.execute(
            "DELETE FROM guidelines WHERE id = ?;",
            (guideline_id,),
        )

        if was_active:
            cursor.execute(
                """
                UPDATE guidelines SET is_active = 1
                WHERE rowid = (
                    SELECT rowid FROM guidelines LIMIT 1
                );
                """
            )

        conn.commit()
        return {
            "message": "Guideline profile deleted successfully",
            "id": guideline_id,
        }
    finally:
        conn.close()


@router.post("/{guideline_id}/activate", response_model=GuidelineResponse)
def activate_guideline(
    guideline_id: str,
    user=Depends(current_user),
):
    require_admin(user)

    conn = get_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM guidelines WHERE id = ?;",
            (guideline_id,),
        )
        existing = cursor.fetchone()

        if not existing:
            raise HTTPException(
                status_code=404,
                detail="Guideline profile not found",
            )

        cursor.execute("UPDATE guidelines SET is_active = 0;")
        now = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            """
            UPDATE guidelines
            SET is_active = 1, updated_at = ?
            WHERE id = ?;
            """,
            (now, guideline_id),
        )

        record_guideline_version(cursor, guideline_id, "activated")
        record_audit(
            cursor,
            "guideline_activated",
            "guideline",
            guideline_id,
            {"name": existing["name"]},
        )
        conn.commit()

        cursor.execute(
            "SELECT * FROM guidelines WHERE id = ?;",
            (guideline_id,),
        )
        return _row_to_guideline(cursor.fetchone())
    finally:
        conn.close()
