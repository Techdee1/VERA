from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.redis_client import redis_client
from app.models import Alert, AlertStatus, Entity, PatternType, Transaction
from app.models.enums import DecisionStatus
from app.services.audit_service import write_audit_event


UTC = timezone.utc


@dataclass
class DetectionContext:
    now: datetime
    transactions: list[Transaction]
    entities: dict[uuid.UUID, Entity]


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _load_context(db: Session) -> DetectionContext:
    tx_rows = db.scalars(select(Transaction).order_by(Transaction.occurred_at.asc())).all()
    entity_rows = db.scalars(select(Entity)).all()
    entity_map = {row.id: row for row in entity_rows}
    return DetectionContext(
        now=datetime.now(UTC),
        transactions=tx_rows,
        entities=entity_map,
    )


def _existing_fingerprints(db: Session, pattern_type: PatternType) -> set[str]:
    query: Select[tuple[Alert]] = select(Alert).where(
        Alert.pattern_type == pattern_type,
        Alert.status == AlertStatus.open,
    )
    rows = db.scalars(query).all()
    fingerprints: set[str] = set()
    for row in rows:
        value = str(row.subgraph_json.get("fingerprint", ""))
        if value:
            fingerprints.add(value)
    return fingerprints


def _create_alert(
    db: Session,
    pattern_type: PatternType,
    risk_score: Decimal,
    reason: str,
    entity_ids: list[uuid.UUID],
    transaction_ids: list[uuid.UUID],
    subgraph_json: dict,
) -> Alert:
    alert = Alert(
        pattern_type=pattern_type,
        risk_score=risk_score,
        reason=reason,
        entity_ids=[str(x) for x in entity_ids],
        transaction_ids=[str(x) for x in transaction_ids],
        subgraph_json=subgraph_json,
        status=AlertStatus.open,
    )
    db.add(alert)
    db.flush()

    write_audit_event(
        db=db,
        action="alert_created",
        entity_ids=[str(x) for x in entity_ids],
        alert_id=alert.id,
        model_version="heuristic_v1",
        decision=DecisionStatus.pending,
        payload_json={
            "alert_id": str(alert.id),
            "pattern_type": pattern_type.value,
            "risk_score": str(risk_score),
            "reason": reason,
            "entity_ids": [str(x) for x in entity_ids],
            "transaction_ids": [str(x) for x in transaction_ids],
            "subgraph_json": subgraph_json,
        },
    )
    return alert


def _risk_score(base: Decimal, bump: Decimal) -> Decimal:
    value = base + bump
    if value > Decimal("0.9900"):
        value = Decimal("0.9900")
    return value.quantize(Decimal("0.0001"))


def _detect_pos_cash_out_ring(db: Session, ctx: DetectionContext) -> int:
    cutoff = ctx.now - timedelta(hours=72)
    recent = [tx for tx in ctx.transactions if _ensure_utc(tx.occurred_at) >= cutoff]

    by_beneficiary: dict[uuid.UUID, list[Transaction]] = defaultdict(list)
    for tx in recent:
        by_beneficiary[tx.destination_entity_id].append(tx)

    existing = _existing_fingerprints(db, PatternType.pos_cash_out_ring)
    created = 0

    for beneficiary_id, rows in by_beneficiary.items():
        source_ids = sorted({row.source_entity_id for row in rows})
        total_amount = sum(Decimal(row.amount) for row in rows)
        if len(source_ids) < 5 or total_amount <= Decimal("500000"):
            continue

        fingerprint = f"pos:{beneficiary_id}"
        if fingerprint in existing:
            continue

        bump = Decimal(min(0.20, (len(source_ids) - 5) * 0.02)) + Decimal(
            min(0.20, float((total_amount - Decimal("500000")) / Decimal("2500000")))
        )
        score = _risk_score(Decimal("0.7000"), bump)

        reason = (
            f"POS cash-out ring detected: {len(source_ids)} sources sent NGN {total_amount:.2f} "
            f"to beneficiary {beneficiary_id} within 72 hours"
        )
        tx_ids = [row.id for row in rows]
        entity_ids = [*source_ids, beneficiary_id]
        _create_alert(
            db=db,
            pattern_type=PatternType.pos_cash_out_ring,
            risk_score=score,
            reason=reason,
            entity_ids=entity_ids,
            transaction_ids=tx_ids,
            subgraph_json={
                "fingerprint": fingerprint,
                "beneficiary_id": str(beneficiary_id),
                "source_count": len(source_ids),
                "total_volume": f"{total_amount:.2f}",
                "window_hours": 72,
            },
        )
        created += 1

    return created


def _extract_directors(entity: Entity) -> tuple[str, ...]:
    value = entity.metadata_json.get("directors", [])
    if not isinstance(value, list):
        return ()
    return tuple(sorted(str(item) for item in value if item))


def _detect_shell_director_web(db: Session, ctx: DetectionContext) -> int:
    businesses = [x for x in ctx.entities.values() if x.entity_type.lower() == "business"]
    if len(businesses) < 3:
        return 0

    by_address: dict[str, list[Entity]] = defaultdict(list)
    by_directors: dict[tuple[str, ...], list[Entity]] = defaultdict(list)
    for business in businesses:
        if business.address:
            by_address[business.address].append(business)
        directors = _extract_directors(business)
        if len(directors) >= 2:
            by_directors[directors].append(business)

    groups: list[tuple[str, list[Entity]]] = []
    for address, rows in by_address.items():
        if len(rows) >= 3:
            groups.append((f"address:{address}", rows))
    for directors, rows in by_directors.items():
        if len(rows) >= 3:
            groups.append((f"directors:{'|'.join(directors)}", rows))

    if not groups:
        return 0

    existing = _existing_fingerprints(db, PatternType.shell_director_web)
    created = 0

    for group_key, rows in groups:
        business_ids = {row.id for row in rows}
        inter_business = [
            tx
            for tx in ctx.transactions
            if tx.source_entity_id in business_ids and tx.destination_entity_id in business_ids
        ]
        if len(inter_business) < 1:
            continue

        distinct_director_count = max((len(_extract_directors(row)) for row in rows), default=0)
        if distinct_director_count < 2 and not group_key.startswith("address:"):
            continue

        fingerprint = f"shell:{group_key}:{'|'.join(sorted(str(x.id) for x in rows))}"
        if fingerprint in existing:
            continue

        score = _risk_score(Decimal("0.7600"), Decimal(min(0.18, (len(rows) - 3) * 0.04)))
        reason = (
            f"Shell director web detected: {len(rows)} businesses linked by shared directors/address "
            f"with {len(inter_business)} inter-business transactions"
        )

        _create_alert(
            db=db,
            pattern_type=PatternType.shell_director_web,
            risk_score=score,
            reason=reason,
            entity_ids=[row.id for row in rows],
            transaction_ids=[tx.id for tx in inter_business],
            subgraph_json={
                "fingerprint": fingerprint,
                "group_key": group_key,
                "business_count": len(rows),
                "inter_business_tx_count": len(inter_business),
            },
        )
        created += 1

    return created


def _has_direct_relationship(ctx: DetectionContext, origin_id: uuid.UUID, destination_id: uuid.UUID) -> bool:
    for tx in ctx.transactions:
        if (tx.source_entity_id == origin_id and tx.destination_entity_id == destination_id) or (
            tx.source_entity_id == destination_id and tx.destination_entity_id == origin_id
        ):
            return True
    return False


def _detect_layered_transfer_chain(db: Session, ctx: DetectionContext) -> int:
    existing = _existing_fingerprints(db, PatternType.layered_transfer_chain)
    created = 0

    tx_by_dest: dict[uuid.UUID, list[Transaction]] = defaultdict(list)
    tx_by_pair: dict[tuple[uuid.UUID, uuid.UUID], list[Transaction]] = defaultdict(list)
    for tx in ctx.transactions:
        tx_by_dest[tx.destination_entity_id].append(tx)
        tx_by_pair[(tx.source_entity_id, tx.destination_entity_id)].append(tx)

    for tx in ctx.transactions:
        recon_id = tx.source_entity_id
        destination_id = tx.destination_entity_id
        end_time = _ensure_utc(tx.occurred_at)
        window_start = end_time - timedelta(hours=48)

        inbound = [
            row
            for row in tx_by_dest.get(recon_id, [])
            if window_start <= _ensure_utc(row.occurred_at) <= end_time and row.source_entity_id != destination_id
        ]
        intermediate_ids = {row.source_entity_id for row in inbound}
        if len(intermediate_ids) < 4:
            continue

        origin_candidates: dict[uuid.UUID, set[uuid.UUID]] = defaultdict(set)
        candidate_tx_ids: list[uuid.UUID] = [tx.id]
        for intermediate_id in intermediate_ids:
            inbound_to_intermediate = tx_by_dest.get(intermediate_id, [])
            for row in inbound_to_intermediate:
                row_time = _ensure_utc(row.occurred_at)
                if window_start <= row_time <= end_time and row.source_entity_id not in {recon_id, destination_id}:
                    origin_candidates[row.source_entity_id].add(intermediate_id)
                    candidate_tx_ids.append(row.id)

        origin_id = None
        used_intermediates: set[uuid.UUID] = set()
        for candidate_origin, hops in origin_candidates.items():
            if len(hops) >= 4 and not _has_direct_relationship(ctx, candidate_origin, destination_id):
                origin_id = candidate_origin
                used_intermediates = hops
                break

        if origin_id is None:
            continue

        fingerprint = f"layered:{origin_id}:{destination_id}:{recon_id}"
        if fingerprint in existing:
            continue

        score = _risk_score(Decimal("0.8400"), Decimal(min(0.14, (len(used_intermediates) - 4) * 0.03)))
        reason = (
            f"Layered transfer chain detected: origin {origin_id} routed funds through "
            f"{len(used_intermediates)} intermediates to destination {destination_id} within 48 hours"
        )

        entity_ids = [origin_id, *sorted(used_intermediates), recon_id, destination_id]
        _create_alert(
            db=db,
            pattern_type=PatternType.layered_transfer_chain,
            risk_score=score,
            reason=reason,
            entity_ids=entity_ids,
            transaction_ids=list(dict.fromkeys(candidate_tx_ids)),
            subgraph_json={
                "fingerprint": fingerprint,
                "origin_id": str(origin_id),
                "recon_id": str(recon_id),
                "destination_id": str(destination_id),
                "intermediate_count": len(used_intermediates),
                "window_hours": 48,
            },
        )
        created += 1

    return created


def run_heuristic_detection(db: Session) -> dict[str, int]:
    lock = redis_client.lock("detection:lock", timeout=60)
    with lock:
        ctx = _load_context(db)
        created_pos = _detect_pos_cash_out_ring(db, ctx)
        created_shell = _detect_shell_director_web(db, ctx)
        created_layered = _detect_layered_transfer_chain(db, ctx)
        return {
            "pos_cash_out_ring": created_pos,
            "shell_director_web": created_shell,
            "layered_transfer_chain": created_layered,
            "total": created_pos + created_shell + created_layered,
        }
