# GRACE Presentation Runbook

This runbook gives a repeatable way to restore demo state before presentations.

## Goal

Start each presentation from a known-good state so the dashboard shows:
- entities
- alerts
- STR generation working

## What You Need

- Deployed backend API URL
- Production worker running
- Valid environment variables in your local shell for seeding:
  - POSTGRES_URL
  - API_BASE_URL

## Important Rule

Do not do data export during the presentation.
Prepare and verify before the session starts.

## Standard Reset Method (Seed Replay)

Use this as your default recovery/reset method.

1. Open a terminal in the project root.
2. Export env variables:
   - POSTGRES_URL set to managed PostgreSQL URL (SQLAlchemy psycopg format)
   - API_BASE_URL set to deployed API base ending in /api/v1
3. Run:
   python scripts/seed.py
4. Wait for completion summary.

Expected summary shape:
- Entities loaded: 500
- Transactions ingested: 2000
- Alerts triggered: greater than 0

## Pre-Presentation Checklist (T-30 minutes)

1. Health check:
   curl -sS https://<your-backend-domain>/health
2. Entities check:
   curl -sS "https://<your-backend-domain>/api/v1/entities?limit=1"
3. Alerts check:
   curl -sS "https://<your-backend-domain>/api/v1/alerts?limit=1"
4. Dashboard check from frontend UI.
5. Generate one STR from an alert in UI.

Pass criteria:
- Health is ok
- Entities total > 0
- Alerts total > 0
- STR generation succeeds

## During Presentation

- Do not run seed unless there is a visible data issue.
- Keep one terminal ready with env exports already set.

If you must recover quickly:
1. Rerun:
   python scripts/seed.py
2. Refresh dashboard
3. Continue demo

## Fallback Method (Golden Backup Restore)

Use this when seed replay is not enough.

1. In DigitalOcean, restore the latest "demo-golden" PostgreSQL backup to a new database instance.
2. Update App Platform env variable POSTGRES_URL for:
   - backend-api
   - ingest-worker
3. Redeploy both components.
4. Run smoke checks again.

## Backup Strategy

After you reach a perfect demo state:
1. Create a managed Postgres backup labeled demo-golden.
2. Refresh this backup before important external demos.

## Security Notes

- Never commit secrets to the repository.
- If a password was ever pasted in logs/chat, rotate it.
- After rotation, update App Platform env vars and redeploy backend + worker.

## Copy-Ready Command Template

Use this template in a local terminal:

POSTGRES_URL='<managed-postgres-url>' \
API_BASE_URL='https://<your-backend-domain>/api/v1' \
python scripts/seed.py

## Owner Checklist

Before every demo, confirm:
- backend-api status is healthy
- ingest-worker status is healthy
- frontend can read API data
- alerts are visible
- STR can be generated
