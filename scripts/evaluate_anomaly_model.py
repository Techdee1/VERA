from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
DATA_PATH = ROOT_DIR / "data" / "synthetic" / "transactions.csv"
PATTERN_MANIFEST = ROOT_DIR / "data" / "synthetic" / "pattern_manifest.json"
MODEL_DIR = ROOT_DIR / "models"

import sys

sys.path.append(str(BACKEND_DIR))

from app.services.anomaly_service import DEFAULT_CONTAMINATION, score_transaction, train_model  # noqa: E402


def _load_manifest_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    payload = json.loads(path.read_text(encoding="utf-8"))
    ids: set[str] = set()
    for pattern in payload.get("patterns", []):
        for tx_id in pattern.get("transaction_ids", []):
            ids.add(str(tx_id))
    return ids


def _ensure_model(records: list[dict]) -> None:
    model_path = MODEL_DIR / "isolation_forest.joblib"
    scaler_path = MODEL_DIR / "scaler.joblib"
    if model_path.exists() and scaler_path.exists():
        return
    train_model(records, model_dir=MODEL_DIR, contamination=DEFAULT_CONTAMINATION)


def _compute_metrics(labels: list[int], preds: list[int]) -> dict[str, float | int]:
    total = len(labels)
    positives = sum(labels)
    predicted = sum(preds)
    tp = sum(1 for label, pred in zip(labels, preds) if label == 1 and pred == 1)

    precision = tp / predicted if predicted else 0.0
    recall = tp / positives if positives else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    return {
        "total_transactions": total,
        "labeled_anomalies": positives,
        "predicted_anomalies": predicted,
        "true_positives": tp,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "anomaly_rate": round(predicted / total, 4) if total else 0.0,
    }


def _best_threshold(labels: list[int], scores: list[float]) -> tuple[float, dict[str, float | int]]:
    if not scores:
        return 0.0, _compute_metrics(labels, [])

    thresholds = np.quantile(scores, np.linspace(0.01, 0.2, 50))
    best_threshold = float(thresholds[0])
    best_metrics = _compute_metrics(labels, [1 if s < best_threshold else 0 for s in scores])
    best_f1 = float(best_metrics["f1"])

    for threshold in thresholds:
        preds = [1 if s < float(threshold) else 0 for s in scores]
        metrics = _compute_metrics(labels, preds)
        if float(metrics["f1"]) > best_f1:
            best_f1 = float(metrics["f1"])
            best_threshold = float(threshold)
            best_metrics = metrics

    return best_threshold, best_metrics


def main() -> None:
    if not DATA_PATH.exists():
        raise SystemExit(f"Missing dataset at {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)
    df["amount_ngn"] = pd.to_numeric(df["amount"], errors="coerce")
    df["occurred_at"] = pd.to_datetime(df["occurred_at"], errors="coerce")

    sender_degree = df.groupby("source_entity_id")["destination_entity_id"].nunique().to_dict()
    receiver_fan_in = df.groupby("destination_entity_id")["source_entity_id"].nunique().to_dict()

    records = df[["amount_ngn", "occurred_at", "source_entity_id", "destination_entity_id"]].to_dict(
        orient="records"
    )
    _ensure_model(records)

    fraud_ids = _load_manifest_ids(PATTERN_MANIFEST)
    labels: list[int] = []
    preds: list[int] = []
    scores: list[float] = []

    for _, row in df.iterrows():
        tx_id = str(row.get("id"))
        label = 1 if tx_id in fraud_ids else 0
        result = score_transaction(
            {
                "amount_ngn": float(row["amount_ngn"]) if pd.notna(row["amount_ngn"]) else 0.0,
                "occurred_at": row["occurred_at"],
            },
            sender_degree=sender_degree.get(row["source_entity_id"], 0),
            receiver_fan_in=receiver_fan_in.get(row["destination_entity_id"], 0),
            model_dir=MODEL_DIR,
        )
        preds.append(1 if result["is_anomaly"] else 0)
        labels.append(label)
        scores.append(float(result["anomaly_score"]))

    metrics = _compute_metrics(labels, preds)
    metrics["contamination"] = DEFAULT_CONTAMINATION
    metrics["training_rows"] = int(len(df))

    best_threshold, tuned_metrics = _best_threshold(labels, scores)
    metrics["best_threshold"] = round(best_threshold, 6)
    metrics["tuned_precision"] = tuned_metrics["precision"]
    metrics["tuned_recall"] = tuned_metrics["recall"]
    metrics["tuned_f1"] = tuned_metrics["f1"]
    metrics["tuned_anomaly_rate"] = tuned_metrics["anomaly_rate"]

    print(json.dumps(metrics, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
