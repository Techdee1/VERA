from pydantic import BaseModel
from typing import Optional, Dict, Any

class SquadWebhookPayload(BaseModel):
    event: str
    transaction_ref: str
    amount: float
    currency: str
    sender_id: Optional[str] = None
    receiver_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
