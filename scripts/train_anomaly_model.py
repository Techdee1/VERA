from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
DATA_PATH = ROOT_DIR / "data" / "synthetic" / "transactions.csv"

sys.path.append(str(BACKEND_DIR))

from app.services.anomaly_service import train_model  # noqa: E402


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"Missing training data at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    df = df.rename(
        columns={
            "amount": "amount_ngn",
            "occurred_at": "occurred_at",
            "source_entity_id": "source_entity_id",
            "destination_entity_id": "destination_entity_id",
        }
    )

    records = df[["amount_ngn", "occurred_at", "source_entity_id", "destination_entity_id"]].to_dict(
        orient="records"
    )

    result = train_model(records)
    print("Isolation Forest trained")
    print(f"Rows: {result['training_rows']}")
    print(f"Model: {result['model_path']}")
    print(f"Scaler: {result['scaler_path']}")
    print(f"Contamination: {result['contamination']}")


if __name__ == "__main__":
    main()
