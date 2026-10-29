from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..database import get_db
from ..security import current_user
from ..governance import record_audit

router=APIRouter(prefix="/api/workflow", tags=["multi-user review workflow"])
class AssignmentPayload(BaseModel): reviewer_id: str
class StatusPayload(BaseModel): status: str

@router.get("/reviews")
def workflow_reviews(user=Depends(current_user)):
    conn=get_db()
    if user["role"]=="admin": rows=conn.execute("SELECT r.id,r.title,r.status,r.final_decision,r.workflow_status,r.assigned_to,r.created_at,r.updated_at,u.username AS assigned_username FROM reviews r LEFT JOIN users u ON u.id=r.assigned_to ORDER BY r.created_at DESC").fetchall()
    else: rows=conn.execute("SELECT r.id,r.title,r.status,r.final_decision,r.workflow_status,r.assigned_to,r.created_at,r.updated_at,u.username AS assigned_username FROM reviews r LEFT JOIN users u ON u.id=r.assigned_to WHERE r.assigned_to=? ORDER BY r.created_at DESC",(user["id"],)).fetchall()
    conn.close(); return [dict(r) for r in rows]

@router.post("/reviews/{review_id}/assign")
def assign_review(review_id: str, payload: AssignmentPayload, user=Depends(current_user)):
    if user["role"]!="admin": raise HTTPException(status_code=403,detail="Administrator role required")
    conn=get_db(); cur=conn.cursor()
    review=cur.execute("SELECT id,title FROM reviews WHERE id=?",(review_id,)).fetchone()
    reviewer=cur.execute("SELECT id,username,role,is_active FROM users WHERE id=?",(payload.reviewer_id,)).fetchone()
    if not review: conn.close(); raise HTTPException(status_code=404,detail="Review not found")
    if not reviewer or reviewer["role"]!="reviewer" or not reviewer["is_active"]: conn.close(); raise HTTPException(status_code=400,detail="Select an active reviewer account")
    now=datetime.now(timezone.utc).isoformat()
    cur.execute("UPDATE reviews SET assigned_to=?, workflow_status='pending', updated_at=? WHERE id=?",(reviewer["id"],now,review_id))
    record_audit(cur,"review_assigned","review",review_id,{"assigned_to":reviewer["id"],"reviewer":reviewer["username"],"assigned_by":user["username"]})
    conn.commit(); conn.close()
    return {"review_id":review_id,"assigned_to":reviewer["id"],"reviewer":reviewer["username"],"workflow_status":"pending"}

@router.patch("/reviews/{review_id}/status")
def update_workflow_status(review_id: str,payload:StatusPayload,user=Depends(current_user)):
    allowed={"pending","in_progress","completed"}
    if payload.status not in allowed: raise HTTPException(status_code=400,detail="Status must be pending, in_progress, or completed")
    conn=get_db(); cur=conn.cursor(); review=cur.execute("SELECT id,assigned_to FROM reviews WHERE id=?",(review_id,)).fetchone()
    if not review: conn.close(); raise HTTPException(status_code=404,detail="Review not found")
    if user["role"]!="admin" and review["assigned_to"]!=user["id"]: conn.close(); raise HTTPException(status_code=403,detail="This review is not assigned to you")
    now=datetime.now(timezone.utc).isoformat(); cur.execute("UPDATE reviews SET workflow_status=?,updated_at=? WHERE id=?",(payload.status,now,review_id))
    record_audit(cur,"review_workflow_status_updated","review",review_id,{"status":payload.status,"updated_by":user["username"]})
    conn.commit(); conn.close(); return {"review_id":review_id,"workflow_status":payload.status,"updated_at":now}
