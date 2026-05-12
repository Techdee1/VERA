from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


def parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def load_entities(path: Path) -> list[dict[str, Any]]:
    entities: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            row["metadata_json"] = json.loads(row["metadata_json"] or "{}")
            entities.append(row)
    return entities


def load_transactions(path: Path) -> list[dict[str, Any]]:
    transactions: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            row["amount"] = float(row["amount"])
            row["metadata_json"] = json.loads(row["metadata_json"] or "{}")
            row["occurred_at_dt"] = parse_dt(row["occurred_at"])
            transactions.append(row)
    return transactions


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate_counts(entities: list[dict[str, Any]], transactions: list[dict[str, Any]]) -> None:
    by_type: dict[str, int] = defaultdict(int)
    for entity in entities:
        by_type[entity["entity_type"]] += 1

    assert_true(len(entities) == 500, f"Expected 500 entities, found {len(entities)}")
    assert_true(by_type["person"] == 350, f"Expected 350 people, found {by_type['person']}")
    assert_true(by_type["business"] == 100, f"Expected 100 businesses, found {by_type['business']}")
    assert_true(by_type["account"] == 50, f"Expected 50 accounts, found {by_type['account']}")
    assert_true(len(transactions) == 2000, f"Expected 2000 transactions, found {len(transactions)}")


def validate_time_window(transactions: list[dict[str, Any]], days: int) -> None:
    latest = max(tx["occurred_at_dt"] for tx in transactions)
    earliest = min(tx["occurred_at_dt"] for tx in transactions)
    assert_true((latest - earliest) <= timedelta(days=days, hours=1), "Transactions exceed 90-day window")


def validate_pos_cashout_threshold(transactions: list[dict[str, Any]]) -> None:
    tagged = [tx for tx in transactions if tx["metadata_json"].get("pattern_tag") == "pos_cash_out_ring"]
    assert_true(len(tagged) > 0, "No POS cash-out pattern transactions found")

    by_dest: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for tx in tagged:
        by_dest[tx["destination_entity_id"]].append(tx)

    threshold_hit = False
    for rows in by_dest.values():
        rows.sort(key=lambda x: x["occurred_at_dt"])
        window_start = rows[0]["occurred_at_dt"]
        window_end = window_start + timedelta(hours=72)
        in_window = [r for r in rows if window_start <= r["occurred_at_dt"] <= window_end]
        unique_sources = {r["source_entity_id"] for r in in_window}
        total_volume = sum(r["amount"] for r in in_window)
        if len(unique_sources) >= 5 and total_volume > 500000.0:
            threshold_hit = True
            break

    assert_true(threshold_hit, "POS cash-out threshold not satisfied")


def validate_shell_director_threshold(
    entities: list[dict[str, Any]],
    transactions: list[dict[str, Any]],
) -> None:
    businesses = [e for e in entities if e["entity_type"] == "business"]
    tagged = [b for b in businesses if b["metadata_json"].get("pattern_tag") == "shell_director_web"]
    assert_true(len(tagged) >= 3, "Shell web requires at least 3 tagged businesses")

    addresses = defaultdict(list)
    director_sets = defaultdict(list)
    tagged_ids = {b["id"] for b in tagged}

    for b in tagged:
        addresses[b["address"]].append(b)
        directors = tuple(sorted(b["metadata_json"].get("directors", [])))
        director_sets[directors].append(b)

    shared_address_ok = any(len(group) >= 3 for group in addresses.values())
    shared_directors_ok = any(len(ds) >= 2 and len(group) >= 3 for ds, group in director_sets.items())

    inter_business_tx = [
        tx
        for tx in transactions
        if tx["source_entity_id"] in tagged_ids and tx["destination_entity_id"] in tagged_ids
    ]

    assert_true(shared_address_ok or shared_directors_ok, "Shell web threshold not satisfied")
    assert_true(len(inter_business_tx) >= 1, "No inter-business transfer found for shell web")


def validate_layered_chain_threshold(transactions: list[dict[str, Any]]) -> None:
    tagged = [tx for tx in transactions if tx["metadata_json"].get("pattern_tag") == "layered_transfer_chain"]
    assert_true(len(tagged) > 0, "No layered chain transactions found")

    by_chain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for tx in tagged:
        by_chain[tx["metadata_json"].get("chain_id", "")].append(tx)

    threshold_hit = False
    for chain_id, rows in by_chain.items():
        if not chain_id:
            continue
        rows.sort(key=lambda x: x["occurred_at_dt"])
        stages = defaultdict(list)
        for row in rows:
            stages[row["metadata_json"].get("stage", "")].append(row)

        split = stages.get("split", [])
        layer = stages.get("layer", [])
        recon = stages.get("reconsolidate", [])
        if not split or not layer or not recon:
            continue

        intermediates = {row["destination_entity_id"] for row in split}
        origin_candidates = {row["source_entity_id"] for row in split}
        final_tx = recon[-1]
        destination_id = final_tx["destination_entity_id"]

        no_direct_relationship = all(
            not (
                (tx["source_entity_id"] in origin_candidates and tx["destination_entity_id"] == destination_id)
                or (tx["destination_entity_id"] in origin_candidates and tx["source_entity_id"] == destination_id)
            )
            for tx in transactions
            if tx["metadata_json"].get("pattern_tag") != "layered_transfer_chain"
        )

        within_48h = (rows[-1]["occurred_at_dt"] - rows[0]["occurred_at_dt"]) <= timedelta(hours=48)
        if len(intermediates) >= 4 and within_48h and no_direct_relationship:
            threshold_hit = True
            break

    assert_true(threshold_hit, "Layered transfer threshold not satisfied")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate generated synthetic AML dataset")
    parser.add_argument("--input-dir", type=Path, default=Path("data/synthetic"), help="Directory with generated CSV files")
    parser.add_argument("--days", type=int, default=90, help="Expected transaction window")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    entities_path = args.input_dir / "entities.csv"
    transactions_path = args.input_dir / "transactions.csv"

    assert_true(entities_path.exists(), f"Missing file: {entities_path}")
    assert_true(transactions_path.exists(), f"Missing file: {transactions_path}")

    entities = load_entities(entities_path)
    transactions = load_transactions(transactions_path)

    validate_counts(entities, transactions)
    validate_time_window(transactions, args.days)
    validate_pos_cashout_threshold(transactions)
    validate_shell_director_threshold(entities, transactions)
    validate_layered_chain_threshold(transactions)

    print("Synthetic dataset validation passed")


if __name__ == "__main__":
    main()
