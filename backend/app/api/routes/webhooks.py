import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Request, Header, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.graph_service import graph_service
from app.services.squad_service import squad_service
from app.services.audit_service import write_audit_event
from app.schemas.squad import SquadWebhookPayload
from app.models import DecisionStatus
from app.core.deps import get_db, get_session_factory # Assuming a factory for background tasks

router = APIRouter()
logger = logging.getLogger(__name__)

async def verify_squad_signature(request: Request, x_squad_encrypted_body: str = Header(None)):
    """
    Validates the HMAC-SHA512 signature from Squad to ensure request integrity.
    """
    if not x_squad_encrypted_body:
        raise HTTPException(status_code=401, detail="Missing x-squad-encrypted-body Header")
    
    body = await request.body()
    secret = settings.squad_secret_key.encode('utf-8')
    # Recompute hash using the raw body bytes
    signature = hmac.new(secret, body, hashlib.sha512).hexdigest().upper()
    
    if not hmac.compare_digest(signature, x_squad_encrypted_body.upper()):
        logger.warning(f"Signature mismatch: {signature} vs {x_squad_encrypted_body}")
        raise HTTPException(status_code=401, detail="Invalid Squad Signature")
    
    return body

@router.post("/squad", status_code=202)
async def squad_webhook(
    payload: SquadWebhookPayload, # Explicitly added for FastAPI Swagger documentation
    background_tasks: BackgroundTasks,
    request: Request,
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
        background_tasks.add_task(process_squad_webhook, payload_dict)
        
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
            data = payload.get("Body") or payload
            sender_id = str(data.get("sender_account") or data.get("sender_id"))
            receiver_id = str(data.get("recipient_account") or data.get("receiver_id"))
            
            if not sender_id or not receiver_id:
                return

            tx_data = {
                "amount": float(data.get("amount", 0)),
                "currency": data.get("currency", "NGN"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "reference": data.get("transaction_ref") or data.get("TransactionRef")
            }

            # 2. Update Neo4j Knowledge Graph
            graph_service.upsert_squad_transaction(sender_id, receiver_id, tx_data)
            
            # 3. Intelligence Layer: Calculate Real-time Trust Score
            trust_score = graph_service.calculate_trust_score(sender_id)
            
            # 4. Autonomous Mitigation based on PRD Thresholds
            decision = DecisionStatus.approved
            
            if trust_score < settings.risk_threshold_low:
                decision = DecisionStatus.pending
                await squad_service.trigger_ussd_verification(sender_id, payload, db)
                
                if trust_score < settings.risk_threshold_critical:
                    decision = DecisionStatus.flagged
                    await squad_service.quarantine_funds(payload, db)

            # 5. Immutable Audit Trail Logging
            write_audit_event(
                db=db,
                action="autonomous_transaction_analysis",
                entity_ids=[sender_id, receiver_id],
                alert_id=None, # New transaction, not yet a manual alert
                model_version="vera_v1",
                decision=decision,
                payload_json=payload
            )
            db.commit()

        except Exception as e:
            logger.error(f"Critical failure in background webhook processing: {e}")
            db.rollback()