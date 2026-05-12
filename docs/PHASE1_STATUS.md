# GRACE Phase 1 Status

## Completed Scope

- Ingest pipeline: `POST /api/v1/transactions/ingest` (async, returns `202` + `job_id`)
- Worker pipeline: Redis queue consumption, Postgres persistence, job lifecycle updates
- Graph updates: Neo4j node and edge upserts for ingested transactions
- Heuristic detection engine:
  - `pos_cash_out_ring`
  - `shell_director_web`
  - `layered_transfer_chain`
- Alerts APIs:
  - `GET /api/v1/alerts`
  - `GET /api/v1/alerts/{alert_id}`
- Entity and risk APIs:
  - `GET /api/v1/entities/{entity_id}`
  - `GET /api/v1/entities/{entity_id}/risk`
- STR APIs:
  - `POST /api/v1/str/generate`
  - `GET /api/v1/str/{str_id}`
- Immutable audit logging with payload SHA-256 hashing
- Docker Compose local environment for all services

## Data and Demo Readiness

- Synthetic dataset generated and validated:
  - 500 entities
  - 2000 transactions
  - 3 embedded laundering topologies
- End-to-end ingestion, detection, and STR draft generation verified with generated alerts.

## Current Status

- Phase 1 scope is functionally complete and validated end-to-end.
- Remaining work is operational hardening and deployment preparation.
