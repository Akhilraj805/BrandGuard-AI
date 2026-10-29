
import json
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def guideline_snapshot(row):
    """Capture the policy rules as they exist at this moment."""
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "is_active": bool(row["is_active"]),
        "prohibited_terms": json.loads(row["prohibited_terms"] or "[]"),
        "required_terms": json.loads(row["required_terms"] or "[]"),
        "tone_rules": json.loads(row["tone_rules"] or "[]"),
        "custom_rules": json.loads(row["custom_rules"] or "[]"),
    }


def record_guideline_version(cursor, guideline_id, change_type="updated"):
    cursor.execute(
        "SELECT * FROM guidelines WHERE id = ?",
        (guideline_id,),
    )
    row = cursor.fetchone()

    if row is None:
        return None

    cursor.execute(
        """
        SELECT MAX(version_number) AS latest
        FROM guideline_versions
        WHERE guideline_id = ?
        """,
        (guideline_id,),
    )
    latest = cursor.fetchone()["latest"] or 0
    version = latest + 1

    cursor.execute(
        """
        INSERT INTO guideline_versions
            (guideline_id, version_number, snapshot, change_type, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            guideline_id,
            version,
            json.dumps(guideline_snapshot(row)),
            change_type,
            utc_now(),
        ),
    )
    return version


def record_audit(cursor, event_type, entity_type, entity_id, details=None):
    cursor.execute(
        """
        INSERT INTO audit_events
            (event_type, entity_type, entity_id, details, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            event_type,
            entity_type,
            str(entity_id),
            json.dumps(details or {}),
            utc_now(),
        ),
    )
