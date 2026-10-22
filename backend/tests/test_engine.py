import os
import sys
import tempfile
from pathlib import Path

# Add project root and backend dir to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pytest
from fastapi.testclient import TestClient

TEST_DB_FILE = Path(tempfile.gettempdir()) / "test_brandguard.db"
if TEST_DB_FILE.exists():
    try:
        TEST_DB_FILE.unlink()
    except Exception:
        pass

os.environ["BRANDGUARD_DB_PATH"] = str(TEST_DB_FILE)

from backend.app.main import app
from backend.app.database import init_db


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


@pytest.fixture
def client():
    return TestClient(app)


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_test_a_violation_detected(client):
    """
    Test A: Configure 'guaranteed' as prohibited and 'quality-tested' as required.
    Submit content containing 'guaranteed' but not 'quality-tested'.
    Verify that backend returns the expected findings.
    """
    # 1. Fetch active guidelines or create a test guideline
    payload = {
        "title": "Quarterly Product Launch Copy",
        "content": "Our new cloud analytics platform provides a guaranteed increase in pipeline conversion for all B2B teams."
    }

    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["title"] == payload["title"]
    assert "findings" in data
    findings = data["findings"]

    # Must contain finding for prohibited term 'guaranteed'
    prohibited_match = [f for f in findings if f["finding_type"] == "prohibited_term" and "guaranteed" in f["matched_text"].lower()]
    assert len(prohibited_match) > 0
    p = prohibited_match[0]
    assert p["severity"] == "high"
    assert p["start_pos"] >= 0
    assert p["end_pos"] > p["start_pos"]
    assert p["matched_text"].lower() == "guaranteed"
    assert "quality-tested" in p["suggestion"].lower() or len(p["suggestion"]) > 0

    # Must contain finding for missing required term 'quality-tested'
    missing_match = [f for f in findings if f["finding_type"] == "missing_required_term" and "quality-tested" in f["rule_name"].lower()]
    assert len(missing_match) > 0
    m = missing_match[0]
    assert m["severity"] == "medium"
    assert m["start_pos"] == -1
    assert m["is_heuristic"] is False


def test_test_b_clean_content(client):
    """
    Test B: Submit content that satisfies the configured rules.
    Verify that no configured violations are reported and that the result does not claim factual correctness.
    """
    payload = {
        "title": "Compliant Feature Announcement",
        "content": "Our quality-tested data pipelines deliver verified throughput for demanding enterprise workflows. Terms and conditions apply."
    }

    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Rule violations must be 0
    summary = data["summary"]
    assert summary["rule_violations"] == 0
    assert summary["heuristic_warnings"] == 0
    assert len(data["findings"]) == 0


def test_test_c_persistence(client):
    """
    Test C: Save a guideline and a review, refresh/fetch again, and confirm persistence.
    """
    # 1. Create a custom guideline
    new_guideline = {
        "name": "Security Compliance Profile",
        "description": "Rules for security marketing and customer privacy.",
        "is_active": False,
        "prohibited_terms": [
            {
                "id": "p_sec_1",
                "term": "unbreakable encryption",
                "severity": "high",
                "reason": "Unverifiable absolute claim.",
                "suggested": "AES-256 standard encryption"
            }
        ],
        "required_terms": [
            {
                "id": "r_sec_1",
                "term": "SOC 2 Type II certified",
                "severity": "high",
                "reason": "Mandatory security accreditation statement.",
                "suggested": "SOC 2 Type II certified"
            }
        ],
        "tone_rules": [],
        "custom_rules": []
    }

    g_res = client.post("/api/guidelines", json=new_guideline)
    assert g_res.status_code == 201
    g_data = g_res.json()
    gid = g_data["id"]

    # Verify retrieval
    g_get = client.get(f"/api/guidelines/{gid}")
    assert g_get.status_code == 200
    assert g_get.json()["name"] == "Security Compliance Profile"

    # Analyze content with this specific guideline
    rev_res = client.post("/api/analyze", json={
        "title": "Security Whitepaper Intro",
        "content": "We offer unbreakable encryption for all stored files.",
        "guideline_id": gid
    })
    assert rev_res.status_code == 200
    rev_id = rev_res.json()["id"]

    # Retrieve review
    rev_get = client.get(f"/api/reviews/{rev_id}")
    assert rev_get.status_code == 200
    assert rev_get.json()["title"] == "Security Whitepaper Intro"
    assert rev_get.json()["guideline_id"] == gid


def test_test_d_human_review(client):
    """
    Test D: Record a final review decision, retrieve the record, and confirm it remains saved.
    """
    # Create a review
    res = client.post("/api/analyze", json={
        "title": "Landing Page Copy",
        "content": "Get guaranteed growth with our service."
    })
    rev_id = res.json()["id"]
    findings = res.json()["findings"]
    assert len(findings) > 0

    # Record human decision
    first_fid = findings[0]["id"]
    decision_payload = {
        "final_decision": "changes_required",
        "reviewer_notes": "Author must replace 'guaranteed' with verified performance data and add QA disclaimer.",
        "finding_actions": {
            first_fid: "reviewed"
        }
    }

    dec_res = client.post(f"/api/reviews/{rev_id}/decision", json=decision_payload)
    assert dec_res.status_code == 200
    dec_data = dec_res.json()

    assert dec_data["final_decision"] == "changes_required"
    assert dec_data["status"] == "completed"
    assert dec_data["reviewer_notes"] == decision_payload["reviewer_notes"]

    # Re-retrieve to guarantee DB persistence
    re_get = client.get(f"/api/reviews/{rev_id}")
    assert re_get.status_code == 200
    assert re_get.json()["final_decision"] == "changes_required"
    assert re_get.json()["status"] == "completed"

    # Check finding status update
    updated_finding = [f for f in re_get.json()["findings"] if f["id"] == first_fid][0]
    assert updated_finding["review_status"] == "reviewed"


def test_test_e_error_handling(client):
    """
    Test E: Verify behavior for empty content, invalid input, and non-existent records.
    """
    # Empty content
    res_empty_content = client.post("/api/analyze", json={"title": "Test", "content": "   "})
    assert res_empty_content.status_code == 400

    # Empty title
    res_empty_title = client.post("/api/analyze", json={"title": "", "content": "Valid body text."})
    assert res_empty_title.status_code in [400, 422]

    # Invalid decision string
    res_bad_decision = client.post("/api/reviews/fake_id/decision", json={"final_decision": "totally_approved"})
    assert res_bad_decision.status_code == 400

    # 404 for missing review
    res_missing_rev = client.get("/api/reviews/non_existent_id")
    assert res_missing_rev.status_code == 404

    # 404 for missing guideline
    res_missing_guideline = client.get("/api/guidelines/non_existent_id")
    assert res_missing_guideline.status_code == 404
