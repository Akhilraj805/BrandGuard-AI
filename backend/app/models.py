from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ProhibitedTermRule(BaseModel):
    id: str
    term: str
    severity: str = "high"  # high, medium, low
    reason: str
    suggested: Optional[str] = ""


class RequiredTermRule(BaseModel):
    id: str
    term: str
    severity: str = "medium"  # high, medium, low
    reason: str
    suggested: Optional[str] = ""


class ToneRule(BaseModel):
    id: str
    rule_name: str
    description: str
    flagged_patterns: List[str] = []
    severity: str = "medium"
    suggestion: str


class CustomRule(BaseModel):
    id: str
    rule_name: str
    description: str
    flagged_patterns: List[str] = []
    severity: str = "medium"
    suggestion: str


class GuidelineBase(BaseModel):
    name: str
    description: str = ""
    is_active: bool = True
    prohibited_terms: List[ProhibitedTermRule] = []
    required_terms: List[RequiredTermRule] = []
    tone_rules: List[ToneRule] = []
    custom_rules: List[CustomRule] = []


class GuidelineCreate(GuidelineBase):
    id: Optional[str] = None


class GuidelineUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    prohibited_terms: Optional[List[ProhibitedTermRule]] = None
    required_terms: Optional[List[RequiredTermRule]] = None
    tone_rules: Optional[List[ToneRule]] = None
    custom_rules: Optional[List[CustomRule]] = None


class GuidelineResponse(GuidelineBase):
    id: str
    created_at: str
    updated_at: str


class Finding(BaseModel):
    id: str
    finding_type: str  # prohibited_term, missing_required_term, tone_issue, unsupported_claim_heuristic, custom_rule_violation
    severity: str  # high, medium, low
    matched_text: str = ""
    start_pos: int = -1
    end_pos: int = -1
    rule_identifier: str
    rule_name: str
    explanation: str
    suggestion: str
    review_status: str = "unreviewed"  # unreviewed, accepted, dismissed, reviewed
    is_heuristic: bool = False


class AnalysisRequest(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    guideline_id: Optional[str] = None


class FindingSummary(BaseModel):
    total: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    rule_violations: int = 0
    heuristic_warnings: int = 0


class ReviewResponse(BaseModel):
    id: str
    title: str
    content: str
    guideline_id: str
    guideline_name: str
    findings: List[Finding] = []
    summary: Dict[str, Any]
    status: str  # pending_review, completed
    final_decision: Optional[str] = None  # approved, changes_required, rejected
    reviewer_notes: Optional[str] = None
    created_at: str
    updated_at: str


class ReviewListItem(BaseModel):
    id: str
    title: str
    guideline_name: str
    findings_count: int
    rule_violations_count: int
    heuristic_count: int
    status: str
    final_decision: Optional[str] = None
    created_at: str
    updated_at: str


class DecisionRequest(BaseModel):
    final_decision: str  # approved, changes_required, rejected
    reviewer_notes: Optional[str] = None
    finding_actions: Optional[Dict[str, str]] = None  # finding_id -> new review_status


class FindingStatusUpdate(BaseModel):
    review_status: str  # unreviewed, accepted, dismissed, reviewed
