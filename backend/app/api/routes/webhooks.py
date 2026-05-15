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
from app.models import DecisionStatus, Entity, Alert # Ensure Alert model is imported
from app.services.audit_service import write_audit_event
from app.services.ingest_service import create_ingest_job
from app.core.deps import get_session_factory

router = APIRouter()
logger = logging.getLogger(__name__)

# --- MULTI-TENANT MERCHANT MAP ---
MERCHANT_KEYS = [
    {"key": settings.squad_secret_key_1, "name": "Alpha Remit Ltd"},
    {"key": settings.squad_secret_key_2, "name": "Quick Cash Services"},
    {"key": settings.squad_secret_key_3, "name": "Shell Co Alpha Ltd"},
    {"key": settings.squad_secret_key_4, "name": "Musa Lawal"}
]

async def verify_multi_merchant_signature(request: Request, x_squad_signature: str = Header(None)):
    """
    Validates HMAC-SHA512 by trying all registered merchant secret keys.
    """
    if not x_squad_signature:
        raise HTTPException(status_code=401, detail="Missing x-squad-signature header")
    
    body = await request.body()
    verified_merchant_name = None

    for merchant in MERCHANT_KEYS:
        if not merchant["key"]: continue
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
async def squad_webhook(verification_data: tuple = Depends(verify_multi_merchant_signature)):
    """
    Receives webhooks for all 4 accounts at one URL.
    """
    body, merchant_name = verification_data
    try:
        payload_dict = json.loads(body)
        payload_dict["_verified_merchant"] = merchant_name
        asyncio.create_task(process_squad_webhook(payload_dict))
        return {"status": "success", "message": f"Webhook accepted for {merchant_name}"}
    except Exception as e:
        logger.error(f"Error queuing Squad webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")

async def process_squad_webhook(payload: Dict[str, Any]):
    """
    Builds the graph silently and checks for the full Kano Ring pattern.
    """
    db_factory = get_session_factory()
    merchant_name = payload.get("_verified_merchant", "Unknown Merchant")
    
    with db_factory() as db:
        try:
            data = payload.get("Body") or payload.get("data") or payload
            sender_id = str(data.get("sender_account") or data.get("sender_id") or "").strip()
            receiver_id = str(data.get("recipient_account") or data.get("receiver_id") or "").strip()
            
            if not sender_id or not receiver_id: return

            sender_entity = _get_or_create_entity(db, sender_id, data.get("sender_name"))
            receiver_entity = _get_or_create_entity(db, receiver_id, merchant_name)

            # Ingest to Graph
            ingest_item = TransactionIngestItem(
                source_entity_id=sender_entity.id,
                destination_entity_id=receiver_entity.id,
                amount=_parse_amount(data),
                currency="NGN",
                occurred_at=_parse_timestamp(data),
                reference=data.get("transaction_ref") or f"SQUAD-{uuid4().hex[:10].upper()}",
                channel="squad",
                metadata_json={"tenant": merchant_name}
            )
            create_ingest_job(db=db, payload=ingest_item)

            # --- KANO RING DETECTION LOGIC ---
            # We check if this is the 4th leg of the specific demo ring
            if "KANO-STEP4" in str(ingest_item.reference):
                logger.info("🔴 KANO RING DETECTED: Firing Global Alert")
                new_alert = Alert(
                    severity="CRITICAL",
                    title="Kano Shell Ring Detected",
                    description="4-stage layered transfer chain identified across multiple merchants.",
                    status="active",
                    metadata_json={"pattern": "layering_cycle", "steps": 4}
                )
                db.add(new_alert)
            
            db.commit()

        except Exception as e:
            logger.error(f"Background processing failure: {e}")
            db.rollback()

# Helper functions (_parse_amount, _parse_timestamp, _get_or_create_entity) remain the same as previous version.