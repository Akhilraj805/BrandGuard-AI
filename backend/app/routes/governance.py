import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from ..database import get_db

router = APIRouter(prefix="/api/governance", tags=["governance and audit"])

@router.get("/guidelines/{guideline_id}/versions")
def list_guideline_versions(guideline_id: str):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id FROM guidelines WHERE id = ?", (guideline_id,))
    if not cur.fetchone():
        conn.close(); raise HTTPException(status_code=404, detail="Guideline profile not found")
    cur.execute("SELECT id, guideline_id, version_number, snapshot, change_type, created_at FROM guideline_versions WHERE guideline_id = ? ORDER BY version_number DESC", (guideline_id,))
    rows = cur.fetchall(); conn.close()
    return [{"id": r["id"], "guideline_id": r["guideline_id"], "version_number": r["version_number"], "snapshot": json.loads(r["snapshot"]), "change_type": r["change_type"], "created_at": r["created_at"]} for r in rows]

@router.get("/audit")
def list_audit_events(event_type: Optional[str] = None, entity_type: Optional[str] = None, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    clauses = []; params = []
    if event_type:
        clauses.append("event_type = ?"); params.append(event_type)
    if entity_type:
        clauses.append("entity_type = ?"); params.append(entity_type)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    conn = get_db(); cur = conn.cursor()
    cur.execute(f"SELECT id, event_type, entity_type, entity_id, details, created_at FROM audit_events{where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?", (*params, limit, offset))
    rows = cur.fetchall(); conn.close()
    return [{"id": r["id"], "event_type": r["event_type"], "entity_type": r["entity_type"], "entity_id": r["entity_id"], "details": json.loads(r["details"] or "{}"), "created_at": r["created_at"]} for r in rows]
