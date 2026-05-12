from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import UUID, uuid4

import sys

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"

sys.path.append(str(BACKEND_DIR))

from app.services.anomaly_service import train_model  # noqa: E402
from app.services.detection_service import _anomaly_summary_for_transactions  # noqa: E402
from app.models.tables import Transaction  # noqa: E402


def _make_tx(
    source_id: UUID,
    destination_id: UUID,
    amount: float,
    occurred_at: datetime,
) -> Transaction:
    return Transaction(
        source_entity_id=source_id,
        destination_entity_id=destination_id,
        amount=Decimal(str(amount)),
        currency="NGN",
        occurred_at=occurred_at,
        reference=f"TEST-{source_id}-{destination_id}-{amount}",
        channel="transfer",
        metadata_json={},
    )


def test_anomaly_summary_keys(tmp_path: Path) -> None:
    train_model(
        [
            {
                "amount_ngn": 250000,
                "occurred_at": "2026-01-01T08:00:00Z",
                "source_entity_id": "a",
                "destination_entity_id": "b",
            },
            {
                "amount_ngn": 900000,
                "occurred_at": "2026-01-01T09:00:00Z",
                "source_entity_id": "b",
                "destination_entity_id": "c",
            },
        ],
        model_dir=tmp_path,
    )

    sender_a = uuid4()
    sender_b = uuid4()
    receiver_b = uuid4()
    receiver_c = uuid4()

    txs = [
        _make_tx(sender_a, receiver_b, 250000, datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc)),
        _make_tx(sender_b, receiver_c, 900000, datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc)),
    ]

    summary = _anomaly_summary_for_transactions(
        txs,
        sender_degree={sender_a: 1, sender_b: 1},
        receiver_fan_in={receiver_b: 1, receiver_c: 1},
        model_dir=tmp_path,
    )

    assert set(summary.keys()) == {"anomaly_score", "anomaly_confidence", "anomaly_flag"}
    assert isinstance(summary["anomaly_score"], float)
    assert isinstance(summary["anomaly_confidence"], float)
    assert isinstance(summary["anomaly_flag"], bool)
