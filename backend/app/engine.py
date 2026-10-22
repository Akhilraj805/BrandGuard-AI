import re
import uuid
from typing import List, Dict, Any, Tuple
from .models import Finding


# Curated heuristic patterns for unsupported marketing assertions
# These are strictly heuristic warnings, NOT presented as factual verification.
UNSUPPORTED_CLAIM_PATTERNS = [
    (
        r"\b(?:unmatched|unrivaled|peerless|unbeatable)\b",
        "Absolute Market Supremacy Claim",
        "Heuristic warning: Unqualified supremacy assertions ('unrivaled', 'unmatched') frequently attract regulatory scrutiny unless backed by cited independent benchmarks.",
        "Replace with verifiable capability claims, e.g., 'Engineered for high-throughput enterprise workloads.'",
        "medium"
    ),
    (
        r"\b(?:100% secure|completely unhackable|bulletproof security)\b",
        "Absolute Security Assertion",
        "Heuristic warning: Absolute security claims represent liability risks. Industry guidelines require qualifying security controls by certifications rather than absolute immunity.",
        "Reference specific verified standards, e.g., 'SOC 2 Type II certified and encrypted at rest.'",
        "high"
    ),
    (
        r"\b(?:double your revenue|triple your sales|instant profits|10x growth)\b",
        "Unqualified Financial Projection",
        "Heuristic warning: Promising specific multiplier outcomes without standard disclaimer and methodology context violates advertising compliance.",
        "Frame with customer case studies and include 'Results may vary based on deployment scale.'",
        "high"
    ),
]


def _build_term_regex(term: str) -> re.Pattern:
    """
    Safely compile a search pattern for a term or phrase.
    Applies word boundaries if the term starts/ends with alphanumeric characters.
    """
    escaped = re.escape(term.strip())
    prefix = r"\b" if re.match(r"^\w", term.strip()) else r"(?:^|\s)"
    suffix = r"\b" if re.match(r".*\w$", term.strip()) else r"(?:$|\s)"
    return re.compile(f"{prefix}{escaped}{suffix}", re.IGNORECASE)


def analyze_content(content: str, guideline_data: Dict[str, Any]) -> List[Finding]:
    """
    Deterministic rule-based analysis engine.
    Scans content against:
      1. Prohibited terms and phrases
      2. Missing required terms
      3. Tone-of-voice violation patterns
      4. Custom text-based brand rules
      5. Explicitly labeled heuristic warnings for unsupported absolute assertions
    """
    findings: List[Finding] = []
    content_clean = content or ""

    if not content_clean.strip():
        return findings

    # 1. Prohibited terms
    prohibited_list = guideline_data.get("prohibited_terms", [])
    for p in prohibited_list:
        term = p.get("term", "").strip()
        if not term:
            continue

        pattern = _build_term_regex(term)
        for match in pattern.finditer(content_clean):
            matched_slice = match.group(0).strip()
            start = match.start()
            end = match.end()

            rule_id = p.get("id") or f"prohibited_{term}"
            reason = p.get("reason") or "This phrase conflicts with configured prohibited brand guidelines."
            suggested = p.get("suggested") or "Remove or replace with an approved, measurable alternative."

            findings.append(
                Finding(
                    id=str(uuid.uuid4()),
                    finding_type="prohibited_term",
                    severity=p.get("severity", "high"),
                    matched_text=matched_slice,
                    start_pos=start,
                    end_pos=end,
                    rule_identifier=str(rule_id),
                    rule_name=f"Prohibited Term: '{term}'",
                    explanation=reason,
                    suggestion=suggested,
                    review_status="unreviewed",
                    is_heuristic=False
                )
            )

    # 2. Required terms (Missing checks)
    required_list = guideline_data.get("required_terms", [])
    for r in required_list:
        term = r.get("term", "").strip()
        if not term:
            continue

        pattern = _build_term_regex(term)
        if not pattern.search(content_clean):
            rule_id = r.get("id") or f"required_{term}"
            reason = r.get("reason") or f"Mandatory brand element '{term}' was omitted from this copy."
            suggested = r.get("suggested") or f"Add '{term}' in the appropriate disclosure or descriptive section."

            findings.append(
                Finding(
                    id=str(uuid.uuid4()),
                    finding_type="missing_required_term",
                    severity=r.get("severity", "medium"),
                    matched_text="",
                    start_pos=-1,
                    end_pos=-1,
                    rule_identifier=str(rule_id),
                    rule_name=f"Missing Approved Term: '{term}'",
                    explanation=reason,
                    suggestion=suggested,
                    review_status="unreviewed",
                    is_heuristic=False
                )
            )

    # 3. Tone rules
    tone_rules = guideline_data.get("tone_rules", [])
    for tr in tone_rules:
        rule_name = tr.get("rule_name", "Tone Rule")
        patterns = tr.get("flagged_patterns", [])
        severity = tr.get("severity", "medium")
        suggestion = tr.get("suggestion", "Revise tone to match brand voice.")
        description = tr.get("description", "Tone guideline violation detected.")

        for pat in patterns:
            if not pat.strip():
                continue
            regex = _build_term_regex(pat.strip())
            for match in regex.finditer(content_clean):
                findings.append(
                    Finding(
                        id=str(uuid.uuid4()),
                        finding_type="tone_issue",
                        severity=severity,
                        matched_text=match.group(0).strip(),
                        start_pos=match.start(),
                        end_pos=match.end(),
                        rule_identifier=tr.get("id", f"tone_{rule_name}"),
                        rule_name=rule_name,
                        explanation=f"{description} The phrase '{match.group(0).strip()}' exhibits prohibited tone characteristics.",
                        suggestion=suggestion,
                        review_status="unreviewed",
                        is_heuristic=False
                    )
                )

    # 4. Custom brand rules
    custom_rules = guideline_data.get("custom_rules", [])
    for cr in custom_rules:
        rule_name = cr.get("rule_name", "Custom Rule")
        patterns = cr.get("flagged_patterns", [])
        severity = cr.get("severity", "medium")
        suggestion = cr.get("suggestion", "Review against custom brand rules.")
        description = cr.get("description", "Custom brand policy violation detected.")

        for pat in patterns:
            if not pat.strip():
                continue
            regex = _build_term_regex(pat.strip())
            for match in regex.finditer(content_clean):
                findings.append(
                    Finding(
                        id=str(uuid.uuid4()),
                        finding_type="custom_rule_violation",
                        severity=severity,
                        matched_text=match.group(0).strip(),
                        start_pos=match.start(),
                        end_pos=match.end(),
                        rule_identifier=cr.get("id", f"custom_{rule_name}"),
                        rule_name=rule_name,
                        explanation=f"{description} Matched flagged pattern: '{match.group(0).strip()}'.",
                        suggestion=suggestion,
                        review_status="unreviewed",
                        is_heuristic=False
                    )
                )

    # 5. Unsupported claim heuristic warnings
    for pattern_str, label, explanation, suggestion, severity in UNSUPPORTED_CLAIM_PATTERNS:
        regex = re.compile(pattern_str, re.IGNORECASE)
        for match in regex.finditer(content_clean):
            findings.append(
                Finding(
                    id=str(uuid.uuid4()),
                    finding_type="unsupported_claim_heuristic",
                    severity=severity,
                    matched_text=match.group(0).strip(),
                    start_pos=match.start(),
                    end_pos=match.end(),
                    rule_identifier=f"heuristic_{label.lower().replace(' ', '_')}",
                    rule_name=label,
                    explanation=explanation,
                    suggestion=suggestion,
                    review_status="unreviewed",
                    is_heuristic=True
                )
            )

    # Sort findings: rule violations first, ordered by position in text (or -1 at end)
    def sort_key(f: Finding):
        severity_rank = {"high": 0, "medium": 1, "low": 2}.get(f.severity.lower(), 3)
        pos = f.start_pos if f.start_pos >= 0 else 999999
        return (f.is_heuristic, severity_rank, pos)

    findings.sort(key=sort_key)
    return findings


def summarize_findings(findings: List[Finding]) -> Dict[str, Any]:
    """Calculate categorical metrics for a list of findings."""
    total = len(findings)
    high = sum(1 for f in findings if f.severity.lower() == "high")
    medium = sum(1 for f in findings if f.severity.lower() == "medium")
    low = sum(1 for f in findings if f.severity.lower() == "low")
    heuristic_count = sum(1 for f in findings if f.is_heuristic)
    rule_violations = total - heuristic_count

    return {
        "total": total,
        "high": high,
        "medium": medium,
        "low": low,
        "rule_violations": rule_violations,
        "heuristic_warnings": heuristic_count,
    }
