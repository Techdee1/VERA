# Task 15 End-to-End Test Report

Date: 2026-04-20
Scope: Phase 1 pipeline validation

## Environment

- Stack: FastAPI, Postgres, Redis, Neo4j, ingest worker (Docker Compose)
- Dataset: `data/synthetic/entities.csv`, `data/synthetic/transactions.csv`

## Validation Steps Performed

1. Brought up/recreated core services with Docker Compose.
2. Initialized DB schema.
3. Reset runtime tables (kept schema).
4. Loaded entities using null-safe SQL staging import.
5. Submitted transaction ingests through `POST /api/v1/transactions/ingest` with correct batch payload shape.
6. Polled ingest jobs to completion.
7. Verified transaction and alert persistence in Postgres.
8. Validated API endpoints:
   - `GET /api/v1/alerts`
   - `GET /api/v1/alerts/{id}`
   - `GET /api/v1/entities/{id}`
   - `GET /api/v1/entities/{id}/risk`
9. Attempted STR flow:
   - `POST /api/v1/str/generate`
   - `GET /api/v1/str/{id}` (only possible after successful generation)
10. Verified audit trail records and payload hash format.

## Results

- Transactions persisted: 2000
- Alerts generated:
  - `shell_director_web`: 2
  - `layered_transfer_chain`: 1
- Alerts and entity/risk endpoints returned successful responses.
- STR generation succeeded after runtime key validation.
- Audit log contains expected `alert_created` and `str_generated` entries.

## STR Validation

- `POST /api/v1/str/generate` returned success with provider `groq`.
- `GET /api/v1/str/{id}` returned persisted draft with decision `pending`.
- Audit log includes `str_generated` with valid SHA-256 payload hash.

## Conclusion

The full end-to-end pipeline is validated through ingest, graph updates, detection, alerting, risk retrieval, STR generation, and audit logging.
