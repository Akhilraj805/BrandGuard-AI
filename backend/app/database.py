import sqlite3
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from .config import get_db_path


def get_db():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS guidelines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        prohibited_terms TEXT NOT NULL DEFAULT '[]',
        required_terms TEXT NOT NULL DEFAULT '[]',
        tone_rules TEXT NOT NULL DEFAULT '[]',
        custom_rules TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        guideline_id TEXT NOT NULL,
        guideline_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_review',
        final_decision TEXT DEFAULT NULL,
        reviewer_notes TEXT DEFAULT NULL,
        summary TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (guideline_id) REFERENCES guidelines(id) ON DELETE SET NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        review_id TEXT NOT NULL,
        finding_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        matched_text TEXT NOT NULL DEFAULT '',
        start_pos INTEGER NOT NULL DEFAULT -1,
        end_pos INTEGER NOT NULL DEFAULT -1,
        rule_identifier TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        explanation TEXT NOT NULL,
        suggestion TEXT NOT NULL,
        review_status TEXT NOT NULL DEFAULT 'unreviewed',
        is_heuristic INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_findings_review ON findings(review_id);")

    # Seed default guideline if table is empty
    cursor.execute("SELECT COUNT(*) AS count FROM guidelines;")
    count = cursor.fetchone()["count"]
    if count == 0:
        now = datetime.now(timezone.utc).isoformat()
        default_guideline = {
            "id": "guideline_enterprise_default",
            "name": "Global Enterprise Standard Brand Guideline",
            "description": "Standard governance profile enforcing truth-in-advertising, mandatory QA disclosures, and verified claim compliance.",
            "is_active": 1,
            "prohibited_terms": json.dumps([
                {
                    "id": "p1",
                    "term": "guaranteed",
                    "severity": "high",
                    "reason": "This phrase conflicts with your configured prohibited-claims guideline. Consider replacing it with a measurable, supportable product benefit.",
                    "suggested": "quality-tested"
                },
                {
                    "id": "p2",
                    "term": "100% risk-free",
                    "severity": "high",
                    "reason": "Absolute zero-risk claims create non-compliant warranty liabilities under standard marketing policy.",
                    "suggested": "satisfaction-focused trial"
                },
                {
                    "id": "p3",
                    "term": "the best in the world",
                    "severity": "medium",
                    "reason": "Unsubstantiated superlative claim requiring independent third-party market validation.",
                    "suggested": "industry-leading"
                },
                {
                    "id": "p4",
                    "term": "miracle",
                    "severity": "high",
                    "reason": "Sensationalist terminology prohibited in technical and corporate marketing copy.",
                    "suggested": "proven solution"
                },
                {
                    "id": "p5",
                    "term": "cheapest",
                    "severity": "low",
                    "reason": "Sub-optimal price positioning term that diminishes brand equity.",
                    "suggested": "cost-effective"
                }
            ]),
            "required_terms": json.dumps([
                {
                    "id": "r1",
                    "term": "quality-tested",
                    "severity": "medium",
                    "reason": "Mandatory quality assurance disclosure required in all public product communications.",
                    "suggested": "quality-tested"
                },
                {
                    "id": "r2",
                    "term": "terms and conditions apply",
                    "severity": "low",
                    "reason": "Mandatory legal qualification for promotional campaigns.",
                    "suggested": "terms and conditions apply"
                }
            ]),
            "tone_rules": json.dumps([
                {
                    "id": "t1",
                    "rule_name": "Prohibit Artificial Sales Urgency",
                    "description": "Prevent high-pressure FOMO tactics that contradict brand trust.",
                    "flagged_patterns": [
                        "act now before it's too late",
                        "last chance forever",
                        "buy immediately",
                        "don't miss out or regret it"
                    ],
                    "severity": "medium",
                    "suggestion": "Adopt a confident, informative invitation that respects customer evaluation timelines."
                }
            ]),
            "custom_rules": json.dumps([
                {
                    "id": "c1",
                    "rule_name": "Direct Competitor Disparagement Policy",
                    "description": "Strict prohibition on derogatory claims against industry alternatives.",
                    "flagged_patterns": [
                        "inferior competitors",
                        "our rivals fail",
                        "outdated alternative vendors"
                    ],
                    "severity": "high",
                    "suggestion": "Focus on our platform's verified architectural capabilities and customer ROI metrics."
                }
            ]),
            "created_at": now,
            "updated_at": now
        }

        cursor.execute("""
        INSERT INTO guidelines (id, name, description, is_active, prohibited_terms, required_terms, tone_rules, custom_rules, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            default_guideline["id"],
            default_guideline["name"],
            default_guideline["description"],
            default_guideline["is_active"],
            default_guideline["prohibited_terms"],
            default_guideline["required_terms"],
            default_guideline["tone_rules"],
            default_guideline["custom_rules"],
            default_guideline["created_at"],
            default_guideline["updated_at"]
        ))

    conn.commit()
    conn.close()
