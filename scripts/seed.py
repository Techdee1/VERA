"""
Seed script for GRACE Phase 1.

Loads data/synthetic/entities.csv into Postgres via SQLAlchemy,
then POSTs data/synthetic/transactions.csv to the ingest endpoint
in batches of 50, polling each job to completion before the next batch.

Usage (local):
    POSTGRES_URL=postgresql+psycopg://grace:grace@localhost:5432/grace \
    API_BASE_URL=http://localhost:8000/api/v1 \
    python scripts/seed.py

Usage (from docker-compose seed service):
    Environment variables are injected by docker-compose.
"""
from __future__ import annotations

import csv
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import httpx
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import sessionmaker

DATA_DIR = Path(os.environ.get("SEED_DATA_DIR", str(Path(__file__).parent.parent / "data" / "synthetic")))
ENTITIES_CSV = DATA_DIR / "entities.csv"
TRANSACTIONS_CSV = DATA_DIR / "transactions.csv"

POSTGRES_URL = os.environ.get(
    "POSTGRES_URL",
    "postgresql+psycopg://grace:grace@postgres:5432/grace",
)
API_BASE_URL = os.environ.get("API_BASE_URL", "http://backend:8000/api/v1")
BATCH_SIZE = 50
POLL_INTERVAL_SECONDS = 2
JOB_TIMEOUT_SECONDS = 300


def _wait_for_api(base_url: str, retries: int = 30, delay: float = 2.0) -> None:
    """Block until /health returns 200 or retries are exhausted."""
    parts = urlsplit(base_url)
    base_path = parts.path.rstrip("/")
    if base_path.endswith("/api/v1"):
        base_path = base_path.removesuffix("/api/v1")
    health_url = urlunsplit((parts.scheme, parts.netloc, f"{base_path}/health", "", ""))

    for attempt in range(retries):
        try:
            resp = httpx.get(health_url, timeout=5)
            if resp.status_code == 200:
                print(f"[seed] API is ready ({base_url})")
                return
        except httpx.TransportError:
            pass
        print(f"[seed] waiting for API… attempt {attempt + 1}/{retries}")
        time.sleep(delay)
    raise RuntimeError(f"API at {base_url} did not become ready after {retries} retries")


def load_entities(postgres_url: str) -> int:
    """Bulk-insert entities from CSV into Postgres. Skip already-present rows."""
    engine = create_engine(postgres_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)

    # Late import so this script is standalone — the backend package may not be on PYTHONPATH
    # when running outside the container.  Use raw SQL inserts for portability.
    rows_inserted = 0
    rows_skipped = 0

    with Session() as db:
        with open(ENTITIES_CSV, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                entity_id = uuid.UUID(row["id"])
                existing = db.execute(
                    text("SELECT id FROM entities WHERE id = :id"),
                    {"id": entity_id},
                ).fetchone()
                if existing is not None:
                    rows_skipped += 1
                    continue

                metadata = row.get("metadata_json") or "{}"
                if isinstance(metadata, str):
                    metadata = json.loads(metadata)

                created_at = row.get("created_at") or datetime.now(timezone.utc).isoformat()
                # Ensure timezone-aware
                if isinstance(created_at, str) and created_at.endswith("+00:00"):
                    pass
                elif isinstance(created_at, str) and "+" not in created_at and "Z" not in created_at:
                    created_at = created_at + "+00:00"

                db.execute(
                    text(
                        """
                        INSERT INTO entities
                            (id, entity_type, full_name, bvn, nin,
                             business_reg_no, address, metadata_json, created_at)
                        VALUES
                            (:id, :entity_type, :full_name, :bvn, :nin,
                             :business_reg_no, :address, :metadata_json, :created_at)
                        ON CONFLICT (id) DO NOTHING
                        """
                    ),
                    {
                        "id": entity_id,
                        "entity_type": row["entity_type"],
                        "full_name": row["full_name"] or None,
                        "bvn": row["bvn"] or None,
                        "nin": row["nin"] or None,
                        "business_reg_no": row["business_reg_no"] or None,
                        "address": row["address"] or None,
                        "metadata_json": json.dumps(metadata),
                        "created_at": created_at,
                    },
                )
                rows_inserted += 1

        db.commit()

    print(f"[seed] entities: {rows_inserted} inserted, {rows_skipped} already present")
    return rows_inserted


def _poll_job(client: httpx.Client, job_id: str) -> str:
    """Poll GET /jobs/{job_id} until terminal status. Returns final status string."""
    deadline = time.monotonic() + JOB_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
        resp = client.get(f"{API_BASE_URL}/jobs/{job_id}", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status", "")
        if status in ("completed", "failed"):
            if status == "failed":
                raise RuntimeError(
                    f"Job {job_id} failed: {data.get('error_message', 'unknown error')}"
                )
            return status
        time.sleep(POLL_INTERVAL_SECONDS)
    raise TimeoutError(f"Job {job_id} did not complete within {JOB_TIMEOUT_SECONDS}s")


def load_transactions(api_base_url: str) -> int:
    """Read transactions CSV and POST in batches of BATCH_SIZE to the ingest endpoint."""
    transactions: list[dict] = []
    with open(TRANSACTIONS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            metadata = row.get("metadata_json") or "{}"
            if isinstance(metadata, str):
                metadata = json.loads(metadata)

            occurred_at = row["occurred_at"]
            if "+" not in occurred_at and "Z" not in occurred_at:
                occurred_at = occurred_at + "+00:00"

            transactions.append(
                {
                    "source_entity_id": row["source_entity_id"],
                    "destination_entity_id": row["destination_entity_id"],
                    "amount": str(Decimal(row["amount"])),
                    "currency": row.get("currency") or "NGN",
                    "occurred_at": occurred_at,
                    "reference": row["reference"],
                    "channel": row.get("channel") or None,
                    "metadata_json": metadata,
                }
            )

    total = len(transactions)
    print(f"[seed] {total} transactions to ingest in batches of {BATCH_SIZE}")

    total_ingested = 0
    with httpx.Client(timeout=30) as client:
        for batch_start in range(0, total, BATCH_SIZE):
            batch = transactions[batch_start : batch_start + BATCH_SIZE]
            resp = client.post(
                f"{api_base_url}/transactions/ingest",
                json={"transactions": batch},
                timeout=30,
            )
            if resp.status_code not in (200, 201, 202):
                raise RuntimeError(
                    f"Ingest batch {batch_start}–{batch_start + len(batch)} failed "
                    f"HTTP {resp.status_code}: {resp.text[:500]}"
                )
            job_id = resp.json()["job_id"]
            _poll_job(client, job_id)
            total_ingested += len(batch)
            print(
                f"[seed] batch {batch_start // BATCH_SIZE + 1} complete "
                f"({total_ingested}/{total} transactions)"
            )

    return total_ingested


def count_alerts(api_base_url: str) -> int:
    resp = httpx.get(f"{api_base_url}/alerts?limit=500", timeout=10)
    resp.raise_for_status()
    return resp.json().get("total", 0)


def main() -> None:
    print("[seed] starting GRACE Phase 1 data seed")
    print(f"[seed] Postgres: {POSTGRES_URL.split('@')[-1]}")
    print(f"[seed] API:      {API_BASE_URL}")

    _wait_for_api(API_BASE_URL)

    entities_loaded = load_entities(POSTGRES_URL)
    transactions_ingested = load_transactions(API_BASE_URL)

    # Brief pause for final detection job to commit
    time.sleep(3)
    alert_count = count_alerts(API_BASE_URL)

    print()
    print("=" * 50)
    print(f"  Entities loaded:         {entities_loaded}")
    print(f"  Transactions ingested:   {transactions_ingested}")
    print(f"  Alerts triggered:        {alert_count}")
    print("=" * 50)

    if alert_count == 0:
        print("[seed] WARNING: no alerts generated — check detection service logs")
        sys.exit(1)

    print("[seed] seed complete")


if __name__ == "__main__":
    main()
