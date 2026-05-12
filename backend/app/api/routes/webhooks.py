import hmac
import hashlib
import json
import logging
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Request, Header, HTTPException, Depends, BackgroundTasks
from app.core.config import settings
from app.services.graph_service import graph_service
from app.services.squad_service import squad_service
from app.services.ai_service import ai_service
from app.schemas.squad import SquadWebhookPayload
from app.core.deps import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

async def verify_squad_signature(request: Request, x_squad_encrypted_body: str = Header(None)):
    if not x_squad_encrypted_body:
        raise HTTPException(status_code=401, detail="Missing x-squad-encrypted-body Header")
    
    body = await request.body()
    secret = settings.squad_secret_key.encode('utf-8')
    signature = hmac.new(secret, body, hashlib.sha512).hexdigest().upper()
    
    if not hmac.compare_digest(signature, x_squad_encrypted_body.upper()):
        logger.warning(f"Signature mismatch: computed {signature} vs received {x_squad_encrypted_body}")
        raise HTTPException(status_code=401, detail="Invalid Squad Signature")
    
    return body

@router.post("/squad")
async def squad_webhook(
    background_tasks: BackgroundTasks,
    request: Request,
    body: bytes = Depends(verify_squad_signature)
):
    try:
        payload_dict = json.loads(body)
        # Squad webhooks typically have a 'data' field or are flat. 
        # We'll assume a standard structure for now or adjust based on docs if available.
        db = next(get_db())
        background_tasks.add_task(process_squad_webhook, payload_dict, db)
        return {"status": "success", "message": "Webhook received"}
    except Exception as e:
        logger.error(f"Error processing Squad webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")

async def process_squad_webhook(payload: Dict[str, Any], db = None):
    # 1. Update Graph
    sender_id = payload.get("sender_id") or payload.get("data", {}).get("sender_id")
    receiver_id = payload.get("receiver_id") or payload.get("data", {}).get("receiver_id")
    amount = payload.get("amount") or payload.get("data", {}).get("amount")
    
    if not sender_id or not receiver_id:
        logger.warning(f"Missing sender/receiver in payload: {payload}")
        return

    # Transaction metadata
    tx_data = {
        "amount": amount,
        "currency": payload.get("currency", "NGN"),
        "timestamp": datetime.now().isoformat(),
        "reference": payload.get("transaction_ref")
    }

    # Update Nodes and Edge
    graph_service.upsert_squad_transaction(sender_id, receiver_id, tx_data)
    
    # 2. Risk Scoring (Eigenvector Centrality & Logic)
    trust_score = graph_service.calculate_trust_score(sender_id)
    
    # 3. Autonomous Action
    if trust_score < settings.risk_threshold_low: # High Risk
        await squad_service.trigger_ussd_verification(sender_id, payload, db)
        
        if trust_score < settings.risk_threshold_critical: # Critical Risk > 90%
            await squad_service.quarantine_funds(payload, db)
