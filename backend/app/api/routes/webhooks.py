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
from app.models import DecisionStatus, Entity
from app.schemas.transactions import TransactionIngestItem
from app.services.audit_service import write_audit_event
from app.services.ingest_service import create_ingest_job
from app.core.deps import get_session_factory

router = APIRouter()
logger = logging.getLogger(__name__)


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_timestamp(data: dict) -> datetime:
    raw = data.get("timestamp") or data.get("occurred_at") or data.get("created_at")
    if isinstance(raw, str) and raw:
        try:
            return _ensure_utc(datetime.fromisoformat(raw.replace("Z", "+00:00")))
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _parse_amount(data: dict) -> Decimal:
    raw = data.get("amount", "0")
    try:
        return Decimal(str(raw))
    except (InvalidOperation, TypeError):
        return Decimal("0")


def _get_or_create_entity(db: Session, external_id: str, full_name: str | None) -> Entity:
    stmt = select(Entity).where(Entity.metadata_json["external_id"].astext == external_id)
    existing = db.scalar(stmt)
    if existing is not None:
        return existing

    row = Entity(
        entity_type="account",
        full_name=full_name,
        metadata_json={"provider": "squad", "external_id": external_id},
    )
    db.add(row)
    db.flush()
    return row

async def verify_squad_signature(request: Request, x_squad_signature: str = Header(None)):
    """
    Validates the HMAC-SHA512 signature from Squad to ensure request integrity.
    """
    if not x_squad_signature:
        raise HTTPException(status_code=401, detail="Missing x-squad-signature header")
    
    body = await request.body()
    if not settings.squad_webhook_secret:
        raise HTTPException(status_code=500, detail="Squad webhook secret is not configured")

    secret = settings.squad_webhook_secret.encode("utf-8")
    # Recompute hash using the raw body bytes
    signature = hmac.new(secret, body, hashlib.sha512).hexdigest().upper()
    
    if not hmac.compare_digest(signature, x_squad_signature.upper()):
        logger.warning("Squad signature mismatch")
        raise HTTPException(status_code=401, detail="Invalid Squad Signature")
    
    return body

@router.post("/squad", status_code=202)
async def squad_webhook(
    body: bytes = Depends(verify_squad_signature)
):
    """
    Entry point for Squad Webhooks. Returns 202 Accepted immediately to satisfy 
    Squad's timeout requirements while processing logic in the background.
    """
    try:
        # We use the raw verified body to ensure the audit log hash matches exactly
        payload_dict = json.loads(body)
        
        # Background processing to keep the API responsive
        asyncio.create_task(process_squad_webhook(payload_dict))
        
        return {"status": "success", "message": "Webhook accepted for processing"}
    except Exception as e:
        logger.error(f"Error queuing Squad webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")

async def process_squad_webhook(payload: Dict[str, Any]):
    """
    Orchestrates the VERA autonomous loop: Graph Update -> Risk Scoring -> Audit Logging.
    """
    # Create a fresh DB session for the background thread
    db_factory = get_session_factory()
    with db_factory() as db:
        try:
            # 1. Extract Identity Metadata (Standardizing Squad's 'Body' or flat structure)
            data = payload.get("Body") or payload.get("data") or payload
            sender_id = str(data.get("sender_account") or data.get("sender_id") or "").strip()
            receiver_id = str(data.get("recipient_account") or data.get("receiver_id") or "").strip()
            
            if not sender_id or not receiver_id:
                return

            sender_entity = _get_or_create_entity(db, sender_id, data.get("sender_name"))
            receiver_entity = _get_or_create_entity(db, receiver_id, data.get("receiver_name"))

            amount = _parse_amount(data)
            occurred_at = _parse_timestamp(data)
            reference = data.get("transaction_ref") or data.get("TransactionRef") or f"SQUAD-{uuid4().hex[:20].upper()}"
            currency = str(data.get("currency") or "NGN").strip().upper()

            ingest_item = TransactionIngestItem(
                source_entity_id=sender_entity.id,
                destination_entity_id=receiver_entity.id,
                amount=amount,
                currency=currency,
                occurred_at=occurred_at,
                reference=reference,
                channel="squad",
                metadata_json={
                    "provider": "squad",
                    "external_sender_id": sender_id,
                    "external_receiver_id": receiver_id,
                },
            )

            job = create_ingest_job(db=db, payload=ingest_item)

            write_audit_event(
                db=db,
                action="squad_webhook_enqueued",
                entity_ids=[str(sender_entity.id), str(receiver_entity.id)],
                alert_id=None,
                model_version="heuristic_v1",
                decision=DecisionStatus.pending,
                payload_json={
                    "job_id": str(job.job_id),
                    "reference": reference,
                    "source_entity_id": str(sender_entity.id),
                    "destination_entity_id": str(receiver_entity.id),
                },
            )
            db.commit()

        except Exception as e:
            logger.error(f"Critical failure in background webhook processing: {e}")
            db.rollback()