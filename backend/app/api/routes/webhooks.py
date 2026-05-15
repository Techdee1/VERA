import asyncio
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from uuid import uuid4
from typing import Dict, Any, List
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

# --- MULTI-TENANT CONFIGURATION ---
# This maps your environment keys to the actual business entities in the graph
MERCHANT_KEYS = [
    {"key": settings.squad_secret_key_1, "name": "Alpha Remit Ltd"},
    {"key": settings.squad_secret_key_2, "name": "Quick Cash Services"},
    {"key": settings.squad_secret_key_3, "name": "Shell Co Alpha Ltd"},
    {"key": settings.squad_secret_key_4, "name": "Musa Lawal"}
]

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

async def verify_multi_merchant_signature(request: Request, x_squad_signature: str = Header(None)):
    """
    Validates HMAC-SHA512 by trying all registered merchant secret keys.
    Returns the verified body and the name of the verified merchant.
    """
    if not x_squad_signature:
        raise HTTPException(status_code=401, detail="Missing x-squad-signature header")
    
    body = await request.body()
    verified_merchant_name = None

    # Try each key to see which one matches the signature
    for merchant in MERCHANT_KEYS:
        if not merchant["key"]:
            continue
            
        secret = merchant["key"].encode("utf-8")
        computed_sig = hmac.new(secret, body, hashlib.sha512).hexdigest().upper()
        
        if hmac.compare_digest(computed_sig, x_squad_signature.upper()):
            verified_merchant_name = merchant["name"]
            break
    
    if not verified_merchant_name:
        logger.warning("Squad signature mismatch for all registered merchants")
        raise HTTPException(status_code=401, detail="Invalid Squad Signature")
    
    return body, verified_merchant_name

@router.post("/squad", status_code=202)
async def squad_webhook(
    verification_data: tuple = Depends(verify_multi_merchant_signature)
):
    """
    Entry point for Multi-Tenant Squad Webhooks. 
    Identifies which merchant account sent the webhook and processes accordingly.
    """
    body, merchant_name = verification_data
    try:
        payload_dict = json.loads(body)
        
        # Inject verified merchant name into payload for graph mapping
        payload_dict["_verified_merchant"] = merchant_name
        
        # Background processing to keep the API responsive
        asyncio.create_task(process_squad_webhook(payload_dict))
        
        return {
            "status": "success", 
            "message": f"Webhook accepted for {merchant_name}"
        }
    except Exception as e:
        logger.error(f"Error queuing Squad webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")

async def process_squad_webhook(payload: Dict[str, Any]):
    """
    Orchestrates the VERA autonomous loop with Multi-Tenant context.
    """
    db_factory = get_session_factory()
    merchant_name = payload.get("_verified_merchant", "Unknown Merchant")
    
    with db_factory() as db:
        try:
            data = payload.get("Body") or payload.get("data") or payload
            sender_id = str(data.get("sender_account") or data.get("sender_id") or "").strip()
            
            # For multi-tenant, the receiver is the verified merchant account
            receiver_id = str(data.get("recipient_account") or data.get("receiver_id") or "").strip()
            
            if not sender_id or not receiver_id:
                return

            # Map the receiver to the verified merchant entity name
            sender_entity = _get_or_create_entity(db, sender_id, data.get("sender_name"))
            receiver_entity = _get_or_create_entity(db, receiver_id, merchant_name)

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
                    "tenant_merchant": merchant_name,
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
                    "tenant": merchant_name,
                    "source_entity_id": str(sender_entity.id),
                    "destination_entity_id": str(receiver_entity.id),
                },
            )
            db.commit()
            logger.info(f"VERA successfully ingested transaction for {merchant_name} (Ref: {reference})")

        except Exception as e:
            logger.error(f"Critical failure in background webhook processing: {e}")
            db.rollback()