from __future__ import annotations

import argparse
import csv
import json
import random
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


FIRST_NAMES = [
    "Adebayo",
    "Chinedu",
    "Ifeoma",
    "Fatima",
    "Oluwaseun",
    "Bisi",
    "Ngozi",
    "Musa",
    "Temitope",
    "Zainab",
    "Kehinde",
    "Amina",
    "Uche",
    "Tosin",
    "Nkechi",
    "Sadiq",
    "Ebere",
    "Ayomide",
    "Yusuf",
    "Halima",
    "Ebuka",
    "Damilola",
    "Bukola",
    "Farouk",
    "Blessing",
]

LAST_NAMES = [
    "Adebisi",
    "Okafor",
    "Bello",
    "Balogun",
    "Nwankwo",
    "Adetola",
    "Lawal",
    "Onyeka",
    "Eze",
    "Mohammed",
    "Abdullahi",
    "Ogunleye",
    "Afolabi",
    "Ibrahim",
    "Ojo",
    "Umeh",
    "Akinsanya",
    "Yakubu",
    "Nwachukwu",
    "Ajayi",
    "Danjuma",
    "Salami",
]

STATES = [
    "Lagos",
    "Abuja",
    "Kano",
    "Rivers",
    "Oyo",
    "Kaduna",
    "Enugu",
    "Anambra",
    "Ogun",
    "Delta",
]

AREAS_BY_STATE = {
    "Lagos": ["Yaba", "Ikeja", "Lekki", "Surulere", "Ajah"],
    "Abuja": ["Wuse", "Garki", "Maitama", "Gwarinpa", "Jabi"],
    "Kano": ["Nassarawa", "Fagge", "Tarauni", "Dala", "Gwale"],
    "Rivers": ["Port Harcourt", "Obio-Akpor", "Bonny", "Okrika", "Eleme"],
    "Oyo": ["Ibadan North", "Challenge", "Bodija", "Ogbomoso", "Saki"],
    "Kaduna": ["Kaduna North", "Zaria", "Kafanchan", "Barnawa", "Sabo"],
    "Enugu": ["Independence Layout", "GRA", "Nsukka", "Abakpa", "Emene"],
    "Anambra": ["Awka", "Onitsha", "Nnewi", "Ihiala", "Ogidi"],
    "Ogun": ["Abeokuta", "Ijebu Ode", "Sango", "Ota", "Ilaro"],
    "Delta": ["Asaba", "Warri", "Sapele", "Ughelli", "Agbor"],
}

STREET_TYPES = ["Street", "Road", "Close", "Avenue", "Crescent"]
BUSINESS_WORDS = [
    "Agro",
    "Logistics",
    "Ventures",
    "Holdings",
    "Retail",
    "Energy",
    "Foods",
    "Traders",
    "Concepts",
    "Dynamics",
    "Solutions",
]
BUSINESS_SUFFIXES = ["Limited", "Ltd", "Nigeria Limited", "Global Services", "Integrated Services"]
BANKS = ["GTBank", "Access Bank", "UBA", "Zenith Bank", "First Bank", "Opay", "Moniepoint"]
CHANNELS = ["transfer", "mobile_app", "ussd", "web", "atm", "agent_bank", "pos"]


@dataclass
class EntityRecord:
    id: str
    entity_type: str
    full_name: str
    bvn: str
    nin: str
    business_reg_no: str
    address: str
    metadata_json: dict[str, Any]
    created_at: str


@dataclass
class TransactionRecord:
    id: str
    source_entity_id: str
    destination_entity_id: str
    amount: float
    currency: str
    occurred_at: str
    reference: str
    channel: str
    metadata_json: dict[str, Any]
    created_at: str


def random_address(rng: random.Random) -> str:
    state = rng.choice(STATES)
    area = rng.choice(AREAS_BY_STATE[state])
    street_no = rng.randint(2, 220)
    street_name = f"{rng.choice(LAST_NAMES)} {rng.choice(STREET_TYPES)}"
    return f"{street_no} {street_name}, {area}, {state}, Nigeria"


def random_name(rng: random.Random) -> str:
    return f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"


def random_business_name(rng: random.Random) -> str:
    token_a = rng.choice(LAST_NAMES)
    token_b = rng.choice(BUSINESS_WORDS)
    suffix = rng.choice(BUSINESS_SUFFIXES)
    return f"{token_a} {token_b} {suffix}"


def unique_digits(rng: random.Random, used: set[str], length: int) -> str:
    while True:
        value = "".join(str(rng.randint(0, 9)) for _ in range(length))
        if value not in used:
            used.add(value)
            return value


def random_timestamp(rng: random.Random, start: datetime, end: datetime) -> datetime:
    span = int((end - start).total_seconds())
    return start + timedelta(seconds=rng.randint(0, span))


def build_entities(
    rng: random.Random,
    now: datetime,
    person_count: int,
    business_count: int,
    account_count: int,
) -> dict[str, list[EntityRecord]]:
    used_bvn: set[str] = set()
    used_nin: set[str] = set()
    used_reg_no: set[str] = set()
    used_account_no: set[str] = set()

    people: list[EntityRecord] = []
    businesses: list[EntityRecord] = []
    accounts: list[EntityRecord] = []

    for _ in range(person_count):
        entity_id = str(uuid.uuid4())
        bvn = unique_digits(rng, used_bvn, 11)
        nin = unique_digits(rng, used_nin, 11)
        created = (now - timedelta(days=rng.randint(10, 720))).isoformat()
        people.append(
            EntityRecord(
                id=entity_id,
                entity_type="person",
                full_name=random_name(rng),
                bvn=bvn,
                nin=nin,
                business_reg_no="",
                address=random_address(rng),
                metadata_json={
                    "occupation": rng.choice(
                        ["Trader", "Engineer", "Doctor", "Accountant", "Civil Servant", "Entrepreneur"]
                    ),
                    "kyc_tier": rng.choice(["tier_1", "tier_2", "tier_3"]),
                    "risk_profile": rng.choice(["low", "low", "medium"]),
                },
                created_at=created,
            )
        )

    for _ in range(business_count):
        entity_id = str(uuid.uuid4())
        reg_no = f"RC{unique_digits(rng, used_reg_no, 7)}"
        created = (now - timedelta(days=rng.randint(30, 1500))).isoformat()
        businesses.append(
            EntityRecord(
                id=entity_id,
                entity_type="business",
                full_name=random_business_name(rng),
                bvn="",
                nin="",
                business_reg_no=reg_no,
                address=random_address(rng),
                metadata_json={
                    "sector": rng.choice(
                        ["retail", "agriculture", "fintech", "import_export", "logistics", "hospitality"]
                    ),
                    "employee_band": rng.choice(["1-10", "11-50", "51-200"]),
                    "directors": [],
                },
                created_at=created,
            )
        )

    owners = people + businesses
    for _ in range(account_count):
        entity_id = str(uuid.uuid4())
        owner = rng.choice(owners)
        account_no = unique_digits(rng, used_account_no, 10)
        created = (now - timedelta(days=rng.randint(5, 720))).isoformat()
        accounts.append(
            EntityRecord(
                id=entity_id,
                entity_type="account",
                full_name=f"{owner.full_name} - {rng.choice(BANKS)} {account_no}",
                bvn="",
                nin="",
                business_reg_no="",
                address=owner.address,
                metadata_json={
                    "bank_name": rng.choice(BANKS),
                    "account_number": account_no,
                    "owner_entity_id": owner.id,
                    "account_type": rng.choice(["savings", "current", "merchant"]),
                },
                created_at=created,
            )
        )

    return {"people": people, "businesses": businesses, "accounts": accounts}


class TxBuilder:
    def __init__(self, rng: random.Random, start: datetime, end: datetime) -> None:
        self.rng = rng
        self.start = start
        self.end = end
        self.records: list[TransactionRecord] = []
        self.reference_counter = 0

    def add(
        self,
        source_id: str,
        destination_id: str,
        amount: float,
        occurred_at: datetime,
        channel: str,
        metadata: dict[str, Any],
    ) -> str:
        self.reference_counter += 1
        tx_id = str(uuid.uuid4())
        reference = f"GRACE-TX-{self.reference_counter:07d}"
        occurred = occurred_at.astimezone(timezone.utc).replace(microsecond=0)
        self.records.append(
            TransactionRecord(
                id=tx_id,
                source_entity_id=source_id,
                destination_entity_id=destination_id,
                amount=round(amount, 2),
                currency="NGN",
                occurred_at=occurred.isoformat(),
                reference=reference,
                channel=channel,
                metadata_json=metadata,
                created_at=occurred.isoformat(),
            )
        )
        return tx_id

    def add_random(self, entity_ids: list[str], minimum_amount: float = 1200.0, maximum_amount: float = 950000.0) -> None:
        source_id = self.rng.choice(entity_ids)
        destination_id = self.rng.choice(entity_ids)
        while destination_id == source_id:
            destination_id = self.rng.choice(entity_ids)

        occurred = random_timestamp(self.rng, self.start, self.end)
        amount = self.rng.triangular(minimum_amount, maximum_amount, 60000.0)
        channel = self.rng.choice(CHANNELS)
        purpose = self.rng.choice(
            [
                "salary",
                "supplier_payment",
                "cash_deposit",
                "transfer",
                "inventory",
                "agent_settlement",
                "invoice_payment",
            ]
        )
        self.add(
            source_id=source_id,
            destination_id=destination_id,
            amount=amount,
            occurred_at=occurred,
            channel=channel,
            metadata={"purpose": purpose, "pattern_tag": "", "location": self.rng.choice(STATES)},
        )


def embed_pos_cashout_ring(rng: random.Random, now: datetime, accounts: list[EntityRecord], tx: TxBuilder) -> dict[str, Any]:
    selected = rng.sample(accounts, 13)
    source_accounts = selected[:12]
    beneficiary = selected[12]
    window_start = now - timedelta(hours=70)
    window_end = window_start + timedelta(hours=60)
    created_tx_ids: list[str] = []

    for source in source_accounts:
        for _ in range(2):
            occurred = random_timestamp(rng, window_start, window_end)
            amount = rng.uniform(28000.0, 95000.0)
            tx_id = tx.add(
                source_id=source.id,
                destination_id=beneficiary.id,
                amount=amount,
                occurred_at=occurred,
                channel="pos",
                metadata={
                    "purpose": "pos_settlement",
                    "pattern_tag": "pos_cash_out_ring",
                    "terminal_type": "merchant_pos",
                },
            )
            created_tx_ids.append(tx_id)

    return {
        "pattern_type": "pos_cash_out_ring",
        "source_entity_ids": [s.id for s in source_accounts],
        "beneficiary_entity_id": beneficiary.id,
        "transaction_ids": created_tx_ids,
    }


def embed_shell_director_web(
    rng: random.Random,
    now: datetime,
    people: list[EntityRecord],
    businesses: list[EntityRecord],
    tx: TxBuilder,
) -> dict[str, Any]:
    directors = rng.sample(people, 2)
    shell_businesses = rng.sample(businesses, 8)
    shared_address = "18 Creek Road, Apapa, Lagos, Nigeria"

    for business in shell_businesses:
        business.address = shared_address
        business.metadata_json["directors"] = [d.id for d in directors]
        business.metadata_json["pattern_tag"] = "shell_director_web"

    created_tx_ids: list[str] = []
    tx_window_start = now - timedelta(days=26)

    for index in range(len(shell_businesses)):
        source = shell_businesses[index]
        destination = shell_businesses[(index + 1) % len(shell_businesses)]
        occurred = tx_window_start + timedelta(hours=index * 4)
        amount = rng.uniform(95000.0, 420000.0)
        tx_id = tx.add(
            source_id=source.id,
            destination_id=destination.id,
            amount=amount,
            occurred_at=occurred,
            channel="transfer",
            metadata={
                "purpose": "intercompany_transfer",
                "pattern_tag": "shell_director_web",
                "invoice_ref": f"INV-SHELL-{index + 1:03d}",
            },
        )
        created_tx_ids.append(tx_id)

    return {
        "pattern_type": "shell_director_web",
        "business_entity_ids": [b.id for b in shell_businesses],
        "director_entity_ids": [d.id for d in directors],
        "transaction_ids": created_tx_ids,
        "shared_address": shared_address,
    }


def embed_layered_transfer_chain(rng: random.Random, now: datetime, accounts: list[EntityRecord], tx: TxBuilder) -> dict[str, Any]:
    selected = rng.sample(accounts, 8)
    origin = selected[0]
    intermediates = selected[1:6]
    recon = selected[6]
    destination = selected[7]
    chain_id = f"CHAIN-{uuid.uuid4().hex[:10]}"
    chain_start = now - timedelta(days=5)
    created_tx_ids: list[str] = []

    split_amounts = [180000.0, 150000.0, 130000.0, 120000.0, 110000.0]
    for idx, intermediate in enumerate(intermediates):
        tx_id = tx.add(
            source_id=origin.id,
            destination_id=intermediate.id,
            amount=split_amounts[idx],
            occurred_at=chain_start + timedelta(hours=idx * 2),
            channel="transfer",
            metadata={
                "purpose": "vendor_payment",
                "pattern_tag": "layered_transfer_chain",
                "chain_id": chain_id,
                "stage": "split",
            },
        )
        created_tx_ids.append(tx_id)

    for idx, intermediate in enumerate(intermediates):
        tx_id = tx.add(
            source_id=intermediate.id,
            destination_id=recon.id,
            amount=split_amounts[idx] - 5000.0,
            occurred_at=chain_start + timedelta(hours=10 + idx * 3),
            channel="mobile_app",
            metadata={
                "purpose": "forward_transfer",
                "pattern_tag": "layered_transfer_chain",
                "chain_id": chain_id,
                "stage": "layer",
            },
        )
        created_tx_ids.append(tx_id)

    tx_id = tx.add(
        source_id=recon.id,
        destination_id=destination.id,
        amount=665000.0,
        occurred_at=chain_start + timedelta(hours=34),
        channel="transfer",
        metadata={
            "purpose": "consolidation_transfer",
            "pattern_tag": "layered_transfer_chain",
            "chain_id": chain_id,
            "stage": "reconsolidate",
        },
    )
    created_tx_ids.append(tx_id)

    return {
        "pattern_type": "layered_transfer_chain",
        "origin_entity_id": origin.id,
        "intermediate_entity_ids": [x.id for x in intermediates],
        "recon_entity_id": recon.id,
        "destination_entity_id": destination.id,
        "transaction_ids": created_tx_ids,
        "chain_id": chain_id,
    }


def write_entities_csv(path: Path, entities: list[EntityRecord]) -> None:
    fieldnames = [
        "id",
        "entity_type",
        "full_name",
        "bvn",
        "nin",
        "business_reg_no",
        "address",
        "metadata_json",
        "created_at",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for entity in entities:
            writer.writerow(
                {
                    "id": entity.id,
                    "entity_type": entity.entity_type,
                    "full_name": entity.full_name,
                    "bvn": entity.bvn,
                    "nin": entity.nin,
                    "business_reg_no": entity.business_reg_no,
                    "address": entity.address,
                    "metadata_json": json.dumps(entity.metadata_json, ensure_ascii=True),
                    "created_at": entity.created_at,
                }
            )


def write_transactions_csv(path: Path, transactions: list[TransactionRecord]) -> None:
    fieldnames = [
        "id",
        "source_entity_id",
        "destination_entity_id",
        "amount",
        "currency",
        "occurred_at",
        "reference",
        "channel",
        "metadata_json",
        "created_at",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for record in transactions:
            writer.writerow(
                {
                    "id": record.id,
                    "source_entity_id": record.source_entity_id,
                    "destination_entity_id": record.destination_entity_id,
                    "amount": f"{record.amount:.2f}",
                    "currency": record.currency,
                    "occurred_at": record.occurred_at,
                    "reference": record.reference,
                    "channel": record.channel,
                    "metadata_json": json.dumps(record.metadata_json, ensure_ascii=True),
                    "created_at": record.created_at,
                }
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate synthetic Nigerian AML dataset for GRACE")
    parser.add_argument("--seed", type=int, default=20260420, help="Random seed for deterministic output")
    parser.add_argument("--entities", type=int, default=500, help="Total number of entities to generate")
    parser.add_argument("--transactions", type=int, default=2000, help="Total number of transactions to generate")
    parser.add_argument("--days", type=int, default=90, help="Time window in days for transactions")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("data/synthetic"),
        help="Output directory for generated files",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rng = random.Random(args.seed)

    person_count = 350
    business_count = 100
    account_count = 50
    if args.entities != person_count + business_count + account_count:
        raise ValueError("For Phase 1, --entities must be exactly 500 (350 people, 100 businesses, 50 accounts)")

    now = datetime.now(timezone.utc).replace(microsecond=0)
    start = now - timedelta(days=args.days)

    buckets = build_entities(
        rng=rng,
        now=now,
        person_count=person_count,
        business_count=business_count,
        account_count=account_count,
    )
    people = buckets["people"]
    businesses = buckets["businesses"]
    accounts = buckets["accounts"]

    tx_builder = TxBuilder(rng=rng, start=start, end=now)
    pattern_manifest: dict[str, Any] = {"seed": args.seed, "generated_at": now.isoformat(), "patterns": []}

    pattern_manifest["patterns"].append(embed_pos_cashout_ring(rng=rng, now=now, accounts=accounts, tx=tx_builder))
    pattern_manifest["patterns"].append(
        embed_shell_director_web(rng=rng, now=now, people=people, businesses=businesses, tx=tx_builder)
    )
    pattern_manifest["patterns"].append(embed_layered_transfer_chain(rng=rng, now=now, accounts=accounts, tx=tx_builder))

    all_entities = [*people, *businesses, *accounts]
    all_entity_ids = [entity.id for entity in all_entities]

    while len(tx_builder.records) < args.transactions:
        tx_builder.add_random(all_entity_ids)

    tx_builder.records.sort(key=lambda row: row.occurred_at)

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    entities_csv = output_dir / "entities.csv"
    transactions_csv = output_dir / "transactions.csv"
    manifest_json = output_dir / "pattern_manifest.json"

    write_entities_csv(entities_csv, all_entities)
    write_transactions_csv(transactions_csv, tx_builder.records)

    manifest_json.write_text(
        json.dumps(
            {
                **pattern_manifest,
                "summary": {
                    "entity_count": len(all_entities),
                    "person_count": len(people),
                    "business_count": len(businesses),
                    "account_count": len(accounts),
                    "transaction_count": len(tx_builder.records),
                    "time_window_days": args.days,
                },
            },
            indent=2,
            ensure_ascii=True,
        ),
        encoding="utf-8",
    )

    print(f"Generated entities: {len(all_entities)} -> {entities_csv}")
    print(f"Generated transactions: {len(tx_builder.records)} -> {transactions_csv}")
    print(f"Generated manifest: {manifest_json}")


if __name__ == "__main__":
    main()
