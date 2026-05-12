from __future__ import annotations

import csv
import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
DATA_PATH = ROOT_DIR / "data" / "synthetic" / "transactions.csv"

sys.path.append(str(BACKEND_DIR))

from app.services.anomaly_service import score_transaction, train_model  # noqa: E402


def _load_transactions(limit: int = 200) -> list[dict[str, object]]:
    transactions: list[dict[str, object]] = []
    with DATA_PATH.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            transactions.append(
                {
                    "amount_ngn": row.get("amount"),
                    "occurred_at": row.get("occurred_at"),
                    "source_entity_id": row.get("source_entity_id"),
                    "destination_entity_id": row.get("destination_entity_id"),
                }
            )
            if len(transactions) >= limit:
                break
    return transactions


def test_train_model_writes_artifacts(tmp_path: Path) -> None:
    transactions = _load_transactions()
    result = train_model(transactions, model_dir=tmp_path)

    assert result["training_rows"] > 0
    assert (tmp_path / "isolation_forest.joblib").exists()
    assert (tmp_path / "scaler.joblib").exists()


def test_score_transaction_schema(tmp_path: Path) -> None:
    transactions = _load_transactions()
    train_model(transactions, model_dir=tmp_path)

    sample_txn = transactions[0]
    result = score_transaction(sample_txn, sender_degree=3, receiver_fan_in=2, model_dir=tmp_path)

    assert set(result.keys()) == {"anomaly_score", "is_anomaly", "confidence"}
    assert isinstance(result["anomaly_score"], float)
    assert isinstance(result["is_anomaly"], bool)
    assert isinstance(result["confidence"], float)
    assert 0.0 <= result["confidence"] <= 1.0


@pytest.mark.parametrize(
    "amount,timestamp,expected_keys",
    [
        (500000, "2026-01-01T08:00:00Z", {"anomaly_score", "is_anomaly", "confidence"}),
    ],
)
def test_score_transaction_with_minimal_input(
    tmp_path: Path,
    amount: int,
    timestamp: str,
    expected_keys: set[str],
) -> None:
    transactions = _load_transactions()
    train_model(transactions, model_dir=tmp_path)

    result = score_transaction(
        {"amount_ngn": amount, "occurred_at": timestamp},
        sender_degree=1,
        receiver_fan_in=1,
        model_dir=tmp_path,
    )

    assert set(result.keys()) == expected_keys
