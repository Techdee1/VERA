import asyncio
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from uuid import uuid4
from typing import Dict, Any
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DecisionStatus, Entity, Alert, Transaction
from app.schemas.transactions import TransactionIngestItem
from app.services.audit_service import write_audit_event
from app.services.ingest_service import create_ingest_job
from app.services.detection_service import run_heuristic_detection
from app.core.deps import get_session_factory

router = APIRouter()
logger = logging.getLogger(__name__)

MERCHANT_KEYS = [
    {"key": settings.squad_secret_key_1, "name": "Alpha Remit Ltd"},
    {"key": settings.squad_secret_key_2, "name": "Quick Cash Services"},
    {"key": settings.squad_secret_key_3, "name": "Shell Co Alpha Ltd"},
    {"key": settings.squad_secret_key_4, "name": "Musa Lawal"},
]


async def verify_multi_merchant_signature(request: Request, x_squad_encrypted_body: str = Header(None)):
    """Validates HMAC-SHA512 by trying all registered merchant secret keys."""
    if not x_squad_encrypted_body:
        raise HTTPException(status_code=401, detail="Missing x-squad-encrypted-body header")

    body = await request.body()
    verified_merchant_name = None

    for merchant in MERCHANT_KEYS:
        if not merchant["key"]:
            continue
        secret = merchant["key"].encode("utf-8")
        computed_sig = hmac.new(secret, body, hashlib.sha512).hexdigest().upper()

        if hmac.compare_digest(computed_sig, x_squad_encrypted_body.upper()):
            verified_merchant_name = merchant["name"]
            break

    if not verified_merchant_name:
        logger.warning("Squad signature mismatch for all registered merchants")
        raise HTTPException(status_code=401, detail="Invalid Squad Signature")

    return body, verified_merchant_name


@router.post("/squad", status_code=200)
async def squad_webhook(verification_data: tuple = Depends(verify_multi_merchant_signature)):
    """Receives webhooks for all 4 merchant accounts at one URL."""
    body, merchant_name = verification_data
    try:
        payload_dict = json.loads(body)

        event_type = payload_dict.get("Event") or payload_dict.get("event")
        if event_type != "charge_successful":
            logger.info(f"Ignoring non-charge Squad event: {event_type}")
            return {"status": "ignored", "event": event_type}

        payload_dict["_verified_merchant"] = merchant_name
        asyncio.create_task(process_squad_webhook(payload_dict))
        return {"status": "success", "message": f"Webhook accepted for {merchant_name}"}
    except Exception as e:
        logger.error(f"Error queuing Squad webhook: {e}", exc_info=True)
        return {"status": "error", "message": "Payload processing failed — logged internally"}


@router.post("/squad/simulate", status_code=200)
async def squad_webhook_simulate():
    """Demo: inject a 3-hop layered transfer chain for judge presentations — no Squad HMAC required."""
    chain = [
        {
            "sender_id": "SIM-ALPHA-REMIT", "sender_name": "Alpha Remit Ltd",
            "recv_id":   "SIM-QUICK-CASH",  "recv_name":  "Quick Cash Services",
            "amount": Decimal("200000"),
        },
        {
            "sender_id": "SIM-QUICK-CASH",  "sender_name": "Quick Cash Services",
            "recv_id":   "SIM-SHELL-CO",    "recv_name":   "Shell Co Alpha Ltd",
            "amount": Decimal("180000"),
        },
        {
            "sender_id": "SIM-SHELL-CO",    "sender_name": "Shell Co Alpha Ltd",
            "recv_id":   "SIM-MUSA-LAWAL",  "recv_name":   "Musa Lawal",
            "amount": Decimal("160000"),
        },
    ]
    asyncio.create_task(_process_simulate_ring(chain))
    return {"status": "success", "message": "Fraud ring simulation queued", "steps": len(chain)}


async def process_squad_webhook(payload: Dict[str, Any]):
    """Builds the entity graph and queues the transaction for ingest."""
    db_factory = get_session_factory()
    merchant_name = payload.get("_verified_merchant", "Unknown Merchant")

    with db_factory() as db:
        try:
            data = payload.get("Body") or payload.get("data") or payload

            sender_id = str(data.get("customer_identifier") or data.get("sender_id") or "").strip()
            receiver_id = str(data.get("merchant_id") or merchant_name).strip()

            if not sender_id or not receiver_id:
                logger.warning(f"Squad webhook missing sender/receiver — keys present: {list(data.keys())}")
                return

            sender_entity = _get_or_create_entity(db, sender_id, data.get("sender_name") or sender_id)
            receiver_entity = _get_or_create_entity(db, receiver_id, merchant_name)

            ingest_item = TransactionIngestItem(
                source_entity_id=sender_entity.id,
                destination_entity_id=receiver_entity.id,
                amount=_parse_amount(data),
                currency="NGN",
                occurred_at=_parse_timestamp(data),
                reference=data.get("transaction_ref") or f"SQUAD-{uuid4().hex[:10].upper()}",
                channel="squad",
                metadata_json={"tenant": merchant_name},
            )
            create_ingest_job(db=db, payload=ingest_item)
            db.commit()

        except Exception as e:
            logger.error(f"Background processing failure: {e}", exc_info=True)
            db.rollback()


async def _process_simulate_ring(chain: list):
    """Writes chain transactions directly to DB and runs detection immediately for the demo."""
    db_factory = get_session_factory()
    now = datetime.now(timezone.utc)
    with db_factory() as db:
        try:
            for i, step in enumerate(chain):
                sender = _get_or_create_entity(db, step["sender_id"], step["sender_name"])
                receiver = _get_or_create_entity(db, step["recv_id"], step["recv_name"])
                tx = Transaction(
                    source_entity_id=sender.id,
                    destination_entity_id=receiver.id,
                    amount=step["amount"],
                    currency="NGN",
                    occurred_at=now,
                    reference=f"SIM-RING-{i + 1}-{uuid4().hex[:8].upper()}",
                    channel="squad_simulate",
                    metadata_json={"simulation": True, "step": i + 1},
                )
                db.add(tx)
                db.flush()

            run_heuristic_detection(db)
            db.commit()
            logger.info("Simulate ring: transactions written and detection complete")
        except Exception as e:
            logger.error(f"Simulate ring processing failed: {e}", exc_info=True)
            db.rollback()


# --- Helper functions ---

def _get_or_create_entity(db: Session, external_id: str, display_name: str | None) -> Entity:
    entity = db.scalar(
        select(Entity).where(Entity.metadata_json["external_id"].astext == external_id)
    )
    if entity is None:
        entity = Entity(
            entity_type="individual",
            full_name=display_name or external_id,
            metadata_json={"external_id": external_id},
        )
        db.add(entity)
        db.flush()
    return entity


def _parse_amount(data: dict) -> Decimal:
    raw = data.get("transaction_amount") or data.get("amount") or 0
    try:
        return Decimal(str(raw)) / 100  # kobo → naira
    except InvalidOperation:
        return Decimal("0")


def _parse_timestamp(data: dict) -> datetime:
    raw = data.get("createdAt") or data.get("created_at") or data.get("timestamp")
    if raw:
        try:
            return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.now(timezone.utc)
