
import re
import uuid
from typing import List, Dict, Any

from .models import Finding


# Existing heuristic patterns for unsupported marketing assertions.
# These are warnings, not factual verification.
UNSUPPORTED_CLAIM_PATTERNS = [
    (
        r"\b(?:unmatched|unrivaled|peerless|unbeatable)\b",
        "Absolute Market Supremacy Claim",
        "Heuristic warning: Unqualified supremacy assertions frequently "
        "attract regulatory scrutiny unless backed by cited independent benchmarks.",
        "Replace with verifiable capability claims, e.g., "
        "'Engineered for high-throughput enterprise workloads.'",
        "medium",
    ),
    (
        r"\b(?:100% secure|completely unhackable|bulletproof security)\b",
        "Absolute Security Assertion",
        "Heuristic warning: Absolute security claims can create liability risks. "
        "Support security statements with verifiable controls and qualifications.",
        "Reference applicable, verified security standards and controls.",
        "high",
    ),
    (
        r"\b(?:double your revenue|triple your sales|instant profits|10x growth)\b",
        "Unqualified Financial Projection",
        "Heuristic warning: Specific financial outcomes may need substantiation, "
        "methodology and appropriate qualifications.",
        "Provide supporting evidence and clearly qualify projected results.",
        "high",
    ),
]


# New contextual claim patterns.
# These identify content that may require review; they do not establish
# whether a claim is true, false, legal or adequately substantiated.
CONTEXTUAL_CLAIM_PATTERNS = [
    (
        "quantified_outcome_claim",
        "Unqualified Quantified Outcome",
        re.compile(
            r"\b(?:increas\w*|improv\w*|boost\w*|reduc\w*|"
            r"sav\w*|grow\w*|achiev\w*|cut)\b"
            r"[^.!?\n]{0,80}?"
            r"\b\d+(?:\.\d+)?\s?%",
            re.IGNORECASE,
        ),
        "A quantified outcome was detected. Check whether the claim has "
        "supporting evidence, a defined measurement method and appropriate "
        "qualifications. Automated detection does not verify the result.",
        "Provide a verifiable source, explain the measurement basis, "
        "and qualify the result where appropriate.",
        "medium",
    ),
    (
        "absolute_environmental_claim",
        "Absolute Environmental Claim",
        re.compile(
            r"\b(?:100%\s*(?:eco[- ]friendly|sustainable|green)|"
            r"zero environmental impact|completely carbon neutral)\b",
            re.IGNORECASE,
        ),
        "An absolute environmental benefit is claimed. Review the evidence, "
        "scope and assessment method before accepting the claim.",
        "Provide substantiation and specify the scope and basis "
        "of the environmental claim.",
        "high",
    ),
    (
        "medical_outcome_claim",
        "Medical Outcome Claim",
        re.compile(
            r"\b(?:cures?|treats?|prevents?)\s+"
            r"(?:cancer|diabetes|heart disease|alzheimer'?s disease)\b",
            re.IGNORECASE,
        ),
        "A medical outcome claim was detected. Qualified scientific and "
        "regulatory review may be required. This automated check does "
        "not verify the claim.",
        "Refer the claim for qualified review and provide appropriate "
        "supporting evidence before publication.",
        "high",
    ),
]


# Recognized qualifying language is only a review signal.
# Its presence does not prove that a claim is adequately supported.
QUALIFICATION_PATTERN = re.compile(
    r"\b(?:results may vary|terms and conditions apply|"
    r"based on|according to|in a study|clinical trial|"
    r"independently verified|see methodology|limitations apply)\b",
    re.IGNORECASE,
)


def _build_term_regex(term: str) -> re.Pattern:
    """
    Safely compile a search pattern for a term or phrase.
    Applies word boundaries where appropriate.
    """
    term = term.strip()
    escaped = re.escape(term)

    prefix = (
        r"\b" if re.match(r"^\w", term)
        else r"(?:^|\s)"
    )
    suffix = (
        r"\b" if re.match(r".*\w$", term)
        else r"(?:$|\s)"
    )

    return re.compile(f"{prefix}{escaped}{suffix}", re.IGNORECASE)


def analyze_content(
    content: str,
    guideline_data: Dict[str, Any],
) -> List[Finding]:
    """
    Analyze marketing content against configured brand policies.

    Checks:
      1. Prohibited terms and phrases
      2. Missing required terms
      3. Tone-of-voice rules
      4. Custom brand rules
      5. Existing unsupported-claim heuristics
      6. Contextual quantified, environmental and medical claims

    Heuristic findings are automated review recommendations, not
    independently verified facts.
    """
    findings: List[Finding] = []
    content_clean = content or ""

    if not content_clean.strip():
        return findings

    # 1. Prohibited terms
    prohibited_list = guideline_data.get("prohibited_terms", [])

    for item in prohibited_list:
        term = item.get("term", "").strip()
        if not term:
            continue

        pattern = _build_term_regex(term)

        for match in pattern.finditer(content_clean):
            rule_id = item.get("id") or f"prohibited_{term}"
            reason = item.get("reason") or (
                "This phrase conflicts with configured prohibited "
                "brand guidelines."
            )
            suggested = item.get("suggested") or (
                "Remove or replace with an approved, measurable alternative."
            )

            findings.append(
                Finding(
                    id=str(uuid.uuid4()),
                    finding_type="prohibited_term",
                    severity=item.get("severity", "high"),
                    matched_text=match.group(0).strip(),
                    start_pos=match.start(),
                    end_pos=match.end(),
                    rule_identifier=str(rule_id),
                    rule_name=f"Prohibited Term: '{term}'",
                    explanation=reason,
                    suggestion=suggested,
                    review_status="unreviewed",
                    is_heuristic=False,
                )
            )

    # 2. Required terms
    required_list = guideline_data.get("required_terms", [])

    for item in required_list:
        term = item.get("term", "").strip()
        if not term:
            continue

        pattern = _build_term_regex(term)

        if not pattern.search(content_clean):
            rule_id = item.get("id") or f"required_{term}"
            reason = item.get("reason") or (
                f"Mandatory brand element '{term}' was omitted from this copy."
            )
            suggested = item.get("suggested") or (
                f"Add '{term}' in the appropriate disclosure or descriptive section."
            )

            findings.append(
                Finding(
                    id=str(uuid.uuid4()),
                    finding_type="missing_required_term",
                    severity=item.get("severity", "medium"),
                    matched_text="",
                    start_pos=-1,
                    end_pos=-1,
                    rule_identifier=str(rule_id),
                    rule_name=f"Missing Approved Term: '{term}'",
                    explanation=reason,
                    suggestion=suggested,
                    review_status="unreviewed",
                    is_heuristic=False,
                )
            )

    # 3. Tone rules
    tone_rules = guideline_data.get("tone_rules", [])

    for rule in tone_rules:
        rule_name = rule.get("rule_name", "Tone Rule")
        patterns = rule.get("flagged_patterns", [])
        severity = rule.get("severity", "medium")
        suggestion = rule.get(
            "suggestion", "Revise tone to match brand voice."
        )
        description = rule.get(
            "description", "Tone guideline violation detected."
        )

        for term in patterns:
            if not term.strip():
                continue

            regex = _build_term_regex(term.strip())

            for match in regex.finditer(content_clean):
                matched = match.group(0).strip()

                findings.append(
                    Finding(
                        id=str(uuid.uuid4()),
                        finding_type="tone_issue",
                        severity=severity,
                        matched_text=matched,
                        start_pos=match.start(),
                        end_pos=match.end(),
                        rule_identifier=rule.get(
                            "id", f"tone_{rule_name}"
                        ),
                        rule_name=rule_name,
                        explanation=(
                            f"{description} The phrase '{matched}' "
                            "matches the configured tone pattern."
                        ),
                        suggestion=suggestion,
                        review_status="unreviewed",
                        is_heuristic=False,
                    )
                )

    # 4. Custom brand rules
    custom_rules = guideline_data.get("custom_rules", [])

    for rule in custom_rules:
        rule_name = rule.get("rule_name", "Custom Rule")
        patterns = rule.get("flagged_patterns", [])
        severity = rule.get("severity", "medium")
        suggestion = rule.get(
            "suggestion", "Review against custom brand rules."
        )
        description = rule.get(
            "description", "Custom brand policy violation detected."
        )

        for term in patterns:
            if not term.strip():
                continue

            regex = _build_term_regex(term.strip())

            for match in regex.finditer(content_clean):
                matched = match.group(0).strip()

                findings.append(
                    Finding(
                        id=str(uuid.uuid4()),
                        finding_type="custom_rule_violation",
                        severity=severity,
                        matched_text=matched,
                        start_pos=match.start(),
                        end_pos=match.end(),
                        rule_identifier=rule.get(
                            "id", f"custom_{rule_name}"
                        ),
                        rule_name=rule_name,
                        explanation=(
                            f"{description} Matched flagged pattern: "
                            f"'{matched}'."
                        ),
                        suggestion=suggestion,
                        review_status="unreviewed",
                        is_heuristic=False,
                    )
                )

    # 5. Existing unsupported-claim heuristic warnings
    for (
        pattern_str,
        label,
        explanation,
        suggestion,
        severity,
    ) in UNSUPPORTED_CLAIM_PATTERNS:
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
                    rule_identifier=(
                        f"heuristic_{label.lower().replace(' ', '_')}"
                    ),
                    rule_name=label,
                    explanation=explanation,
                    suggestion=suggestion,
                    review_status="unreviewed",
                    is_heuristic=True,
                )
            )

    # 6. Context-aware claim checks.
    #
    # IMPORTANT: This block is outside the existing heuristic loop.
    # Each contextual pattern is evaluated only once per analysis.
    for (
        rule_id,
        label,
        pattern,
        explanation,
        suggestion,
        severity,
    ) in CONTEXTUAL_CLAIM_PATTERNS:

        for match in pattern.finditer(content_clean):
            matched = match.group(0).strip()

            # Only the quantified-outcome rule uses this qualification
            # check. Nearby qualifying language is not proof of validity.
            if rule_id == "quantified_outcome_claim":
                context_start = max(0, match.start() - 120)
                context_end = min(
                    len(content_clean), match.end() + 120
                )
                nearby_context = content_clean[
                    context_start:context_end
                ]

                if QUALIFICATION_PATTERN.search(nearby_context):
                    continue

                contextual_explanation = (
                    explanation
                    + " No recognized qualifying language was found "
                    "within 120 characters of the matched claim."
                )
            else:
                contextual_explanation = explanation

            findings.append(
                Finding(
                    id=str(uuid.uuid4()),
                    finding_type="unsupported_claim_heuristic",
                    severity=severity,
                    matched_text=matched,
                    start_pos=match.start(),
                    end_pos=match.end(),
                    rule_identifier=f"context_{rule_id}",
                    rule_name=label,
                    explanation=contextual_explanation,
                    suggestion=suggestion,
                    review_status="unreviewed",
                    is_heuristic=True,
                )
            )

    # 7. Remove duplicate findings with the same rule and text span.
    #
    # This protects against duplicate output when an existing rule and
    # a new rule detect the same claim. Different rules remain distinct.
    unique_findings = []
    seen_findings = set()

    for finding in findings:
        deduplication_key = (
            finding.rule_identifier,
            finding.start_pos,
            finding.end_pos,
            finding.matched_text.casefold(),
        )

        if deduplication_key in seen_findings:
            continue

        seen_findings.add(deduplication_key)
        unique_findings.append(finding)

    # 8. Sort deterministic violations before heuristic warnings.
    def sort_key(finding: Finding):
        severity_rank = {
            "high": 0,
            "medium": 1,
            "low": 2,
        }.get(finding.severity.lower(), 3)

        position = (
            finding.start_pos
            if finding.start_pos >= 0
            else 999999
        )

        return (
            finding.is_heuristic,
            severity_rank,
            position,
        )

    unique_findings.sort(key=sort_key)

    return unique_findings


def summarize_findings(
    findings: List[Finding],
) -> Dict[str, Any]:
    """Calculate categorical metrics for a list of findings."""
    total = len(findings)

    high = sum(
        1 for finding in findings
        if finding.severity.lower() == "high"
    )
    medium = sum(
        1 for finding in findings
        if finding.severity.lower() == "medium"
    )
    low = sum(
        1 for finding in findings
        if finding.severity.lower() == "low"
    )

    heuristic_count = sum(
        1 for finding in findings
        if finding.is_heuristic
    )

    return {
        "total": total,
        "high": high,
        "medium": medium,
        "low": low,
        "rule_violations": total - heuristic_count,
        "heuristic_warnings": heuristic_count,
    }
