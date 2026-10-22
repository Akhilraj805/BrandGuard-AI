import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models import AnalysisRequest, ReviewResponse, Finding
from ..engine import analyze_content, summarize_findings

router = APIRouter(prefix="/api/analyze", tags=["analyze"])


@router.post("", response_model=ReviewResponse)
def analyze(payload: AnalysisRequest):
    content = payload.content.strip()
    title = payload.title.strip()

    if not content:
        raise HTTPException(status_code=400, detail="Marketing content cannot be empty.")
    if not title:
        raise HTTPException(status_code=400, detail="Content title cannot be empty.")

    conn = get_db()
    cursor = conn.cursor()

    # Retrieve requested or active guideline
    if payload.guideline_id:
        cursor.execute("SELECT * FROM guidelines WHERE id = ?;", (payload.guideline_id,))
    else:
        cursor.execute("SELECT * FROM guidelines WHERE is_active = 1 LIMIT 1;")

    guideline_row = cursor.fetchone()
    if not guideline_row:
        # Fallback to any guideline
        cursor.execute("SELECT * FROM guidelines LIMIT 1;")
        guideline_row = cursor.fetchone()

    if not guideline_row:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="No brand guideline profile configured. Please create a guideline first."
        )

    guideline_id = guideline_row["id"]
    guideline_name = guideline_row["name"]

    guideline_dict = {
        "id": guideline_row["id"],
        "name": guideline_row["name"],
        "prohibited_terms": json.loads(guideline_row["prohibited_terms"] or "[]"),
        "required_terms": json.loads(guideline_row["required_terms"] or "[]"),
        "tone_rules": json.loads(guideline_row["tone_rules"] or "[]"),
        "custom_rules": json.loads(guideline_row["custom_rules"] or "[]"),
    }

    # Execute deterministic analysis engine
    findings = analyze_content(content, guideline_dict)
    summary = summarize_findings(findings)

    review_id = f"rev_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
    INSERT INTO reviews (id, title, content, guideline_id, guideline_name, status, final_decision, reviewer_notes, summary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?);
    """, (
        review_id,
        title,
        content,
        guideline_id,
        guideline_name,
        "pending_review",
        json.dumps(summary),
        now,
        now
    ))

    # Insert findings
    for f in findings:
        cursor.execute("""
        INSERT INTO findings (id, review_id, finding_type, severity, matched_text, start_pos, end_pos, rule_identifier, rule_name, explanation, suggestion, review_status, is_heuristic, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            f.id,
            review_id,
            f.finding_type,
            f.severity,
            f.matched_text,
            f.start_pos,
            f.end_pos,
            f.rule_identifier,
            f.rule_name,
            f.explanation,
            f.suggestion,
            f.review_status,
            1 if f.is_heuristic else 0,
            now
        ))

    conn.commit()
    conn.close()

    return ReviewResponse(
        id=review_id,
        title=title,
        content=content,
        guideline_id=guideline_id,
        guideline_name=guideline_name,
        findings=findings,
        summary=summary,
        status="pending_review",
        final_decision=None,
        reviewer_notes=None,
        created_at=now,
        updated_at=now
    )
