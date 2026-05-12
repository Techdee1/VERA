# VERA

Verification Engine for Risk Analysis

VERA is an AI-powered financial trust verification platform for Nigerian financial institutions. It upgrades the GRACE AML compliance engine into a real-time trust scoring system that detects fraud rings, scores entity risk, and produces regulator-ready STR drafts with full auditability.

## Project Docs

- VERA PRD (PDF): [VERA_PRD-2.pdf](VERA_PRD-2.pdf)
- Legacy GRACE PRD (markdown): [GRACE_PRD.md](GRACE_PRD.md)
- Legacy GRACE PRD (PDF): [ComplianceGraph_PRD.pdf](ComplianceGraph_PRD.pdf)
- Presentation restore runbook: [docs/PRESENTATION_RUNBOOK.md](docs/PRESENTATION_RUNBOOK.md)

## Squad Integration (VERA)

- Webhook ingest: `POST /api/v1/webhooks/squad`
	- Verifies HMAC signature via `SQUAD_WEBHOOK_SECRET`
	- Maps Squad payloads to transaction ingest
- Filing action: `POST /api/v1/str/{id}/file`
	- Initiates Squad payment using `SQUAD_SECRET_KEY`
	- Stores Squad transaction reference on STR

## Pitch

"VERA sits on top of Squad's payment infrastructure and watches every transaction for fraud patterns in real time. When a fraud ring is confirmed, VERA initiates the financial consequence through Squad. Squad powers both the intelligence and the action."

## Core Capabilities

- Build a live relationship graph across people, businesses, accounts, and transactions.
- Detect fraud patterns with heuristics plus anomaly detection.
- Propagate trust risk scores across connected entities.
- Draft STR reports with human-review safeguards and immutable audit logs.

## Anomaly Model (Isolation Forest)

Generate the Isolation Forest model artifacts from the synthetic dataset:

```bash
python scripts/train_anomaly_model.py
```

This writes model artifacts to `models/isolation_forest.joblib` and `models/scaler.joblib` (not committed).