import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from ..database import get_db
from ..governance import record_audit
from ..security import current_user
from ..models import (
    ReviewResponse,
    ReviewListItem,
    DecisionRequest,
    Finding,
    FindingStatusUpdate,
)

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def _row_to_finding(row) -> Finding:
    return Finding(
        id=row["id"],
        finding_type=row["finding_type"],
        severity=row["severity"],
        matched_text=row["matched_text"] or "",
        start_pos=row["start_pos"],
        end_pos=row["end_pos"],
        rule_identifier=row["rule_identifier"],
        rule_name=row["rule_name"],
        explanation=row["explanation"],
        suggestion=row["suggestion"],
        review_status=row["review_status"],
        is_heuristic=bool(row["is_heuristic"]),
    )


@router.get("", response_model=List[ReviewListItem])
def list_reviews(user=Depends(current_user)):
    conn = get_db()
    cursor = conn.cursor()

    if user["role"] == "admin":
        cursor.execute("SELECT r.id, r.title, r.guideline_name, r.status, r.final_decision, r.summary, r.created_at, r.updated_at FROM reviews r ORDER BY r.created_at DESC")
    else:
        cursor.execute("SELECT r.id, r.title, r.guideline_name, r.status, r.final_decision, r.summary, r.created_at, r.updated_at FROM reviews r WHERE r.assigned_to=? ORDER BY r.created_at DESC", (user["id"],))
    rows = cursor.fetchall()
    conn.close()

    items = []
    for r in rows:
        summary = json.loads(r["summary"] or "{}")
        items.append(
            ReviewListItem(
                id=r["id"],
                title=r["title"],
                guideline_name=r["guideline_name"],
                findings_count=summary.get("total", 0),
                rule_violations_count=summary.get("rule_violations", 0),
                heuristic_count=summary.get("heuristic_warnings", 0),
                status=r["status"],
                final_decision=r["final_decision"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
        )
    return items


@router.get("/{review_id}", response_model=ReviewResponse)
def get_review(review_id: str, user=Depends(current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM reviews WHERE id = ?;", (review_id,))
    review_row = cursor.fetchone()
    if not review_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Review not found")

    if user["role"] != "admin" and review_row["assigned_to"] != user["id"]:
        conn.close(); raise HTTPException(status_code=403, detail="This review is not assigned to you")

    cursor.execute("SELECT * FROM findings WHERE review_id = ? ORDER BY is_heuristic ASC, start_pos ASC;", (review_id,))
    finding_rows = cursor.fetchall()
    conn.close()

    findings = [_row_to_finding(f) for f in finding_rows]
    summary = json.loads(review_row["summary"] or "{}")

    return ReviewResponse(
        id=review_row["id"],
        title=review_row["title"],
        content=review_row["content"],
        guideline_id=review_row["guideline_id"] or "",
        guideline_name=review_row["guideline_name"],
        findings=findings,
        summary=summary,
        status=review_row["status"],
        final_decision=review_row["final_decision"],
        reviewer_notes=review_row["reviewer_notes"],
        created_at=review_row["created_at"],
        updated_at=review_row["updated_at"],
    )


@router.post("/{review_id}/decision", response_model=ReviewResponse)
def record_decision(review_id: str, payload: DecisionRequest, user=Depends(current_user)):
    allowed_decisions = ["approved", "changes_required", "rejected"]
    decision = payload.final_decision.lower().strip()
    if decision not in allowed_decisions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision. Must be one of: {', '.join(allowed_decisions)}"
        )

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM reviews WHERE id = ?;", (review_id,))
    review_row = cursor.fetchone()
    if not review_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Review not found")

    if user["role"] != "admin" and review_row["assigned_to"] != user["id"]:
        conn.close(); raise HTTPException(status_code=403, detail="This review is not assigned to you")

    now = datetime.now(timezone.utc).isoformat()

    # Update findings statuses if bulk actions were supplied
    if payload.finding_actions:
        for fid, fstatus in payload.finding_actions.items():
            cursor.execute(
                "UPDATE findings SET review_status = ? WHERE id = ? AND review_id = ?;",
                (fstatus, fid, review_id)
            )

    cursor.execute("""
    UPDATE reviews
    SET final_decision = ?, reviewer_notes = ?, status = 'completed', updated_at = ?
    WHERE id = ?;
    """, (decision, payload.reviewer_notes, now, review_id))

    record_audit(cursor, "review_decision_recorded", "review", review_id, {"decision": decision, "finding_actions_count": len(payload.finding_actions or {})})
    conn.commit()

    # Fetch updated review and findings
    cursor.execute("SELECT * FROM reviews WHERE id = ?;", (review_id,))
    updated_review = cursor.fetchone()
    cursor.execute("SELECT * FROM findings WHERE review_id = ? ORDER BY is_heuristic ASC, start_pos ASC;", (review_id,))
    finding_rows = cursor.fetchall()
    conn.close()

    findings = [_row_to_finding(f) for f in finding_rows]
    summary = json.loads(updated_review["summary"] or "{}")

    return ReviewResponse(
        id=updated_review["id"],
        title=updated_review["title"],
        content=updated_review["content"],
        guideline_id=updated_review["guideline_id"] or "",
        guideline_name=updated_review["guideline_name"],
        findings=findings,
        summary=summary,
        status=updated_review["status"],
        final_decision=updated_review["final_decision"],
        reviewer_notes=updated_review["reviewer_notes"],
        created_at=updated_review["created_at"],
        updated_at=updated_review["updated_at"],
    )


@router.patch("/{review_id}/findings/{finding_id}", response_model=Finding)
def update_finding_status(review_id: str, finding_id: str, payload: FindingStatusUpdate, user=Depends(current_user)):
    valid_statuses = ["unreviewed", "accepted", "dismissed", "reviewed"]
    new_status = payload.review_status.lower().strip()
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid review status. Must be one of: {', '.join(valid_statuses)}"
        )

    conn = get_db()
    cursor = conn.cursor()

    review=cursor.execute("SELECT assigned_to FROM reviews WHERE id=?",(review_id,)).fetchone()
    if not review:
        conn.close(); raise HTTPException(status_code=404, detail="Review not found")
    if user["role"] != "admin" and review["assigned_to"] != user["id"]:
        conn.close(); raise HTTPException(status_code=403, detail="This review is not assigned to you")

    cursor.execute("SELECT * FROM findings WHERE id = ? AND review_id = ?;", (finding_id, review_id))
    finding_row = cursor.fetchone()
    if not finding_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Finding not found in this review")

    cursor.execute("UPDATE findings SET review_status = ? WHERE id = ?;", (new_status, finding_id))
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("UPDATE reviews SET updated_at = ? WHERE id = ?;", (now, review_id))
    record_audit(cursor, "finding_status_updated", "finding", finding_id, {"review_id": review_id, "review_status": new_status})
    conn.commit()

    cursor.execute("SELECT * FROM findings WHERE id = ?;", (finding_id,))
    updated_row = cursor.fetchone()
    conn.close()

    return _row_to_finding(updated_row)


@router.delete("/{review_id}")
def delete_review(review_id: str, user=Depends(current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM reviews WHERE id = ?;", (review_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Review not found")

    if user["role"] != "admin":
        conn.close(); raise HTTPException(status_code=403, detail="Administrator role required to delete reviews")

    record_audit(cursor, "review_deleted", "review", review_id, {"title": row["title"]})
    cursor.execute("DELETE FROM findings WHERE review_id = ?;", (review_id,))
    cursor.execute("DELETE FROM reviews WHERE id = ?;", (review_id,))
    conn.commit()
    conn.close()

    return {"message": "Review deleted successfully", "id": review_id}
