# Analyst Escalation and Triage SOP

Last Updated: 2026-04-24
Scope: Internal workflow for handling GRACE-generated AML findings.

## Severity Bands
1. Critical: immediate escalation required (high confidence + high impact).
2. High: escalate within same business day.
3. Medium: monitor and enrich within 48 hours.
4. Low: retain in watchlist and reassess on schedule.

## Triage Inputs
1. Pattern type and candidate score.
2. Confidence level from reasoning output.
3. Risk score and source attribution (direct/indirect).
4. Entity criticality and exposure.

## Escalation SLA
1. Critical: 0-2 hours.
2. High: 2-8 hours.
3. Medium: 8-48 hours.
4. Low: periodic review cycle.

## Mandatory Analyst Actions
1. Confirm data integrity before decision.
2. Add narrative note for why recommendation is accepted or downgraded.
3. Attach supporting candidate and entity evidence IDs.
4. Record final action owner and deadline.

## False Positive Control
1. If downgraded, document concrete business rationale.
2. Track recurring false positive motifs to improve heuristic tuning.
3. Update sensitivity profile only after compliance approval.

## Reporting Governance
1. Any generated STR stays PENDING_REVIEW until approval.
2. Filing action must be executed by authorized compliance personnel.
3. Agent output must not be treated as final regulatory determination.
