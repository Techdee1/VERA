from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class STRGenerateRequest(BaseModel):
    alert_id: UUID
    reviewer_notes: str | None = None


class STRDecisionUpdate(BaseModel):
    decision: Literal["approved", "rejected"]


class STRListResponse(BaseModel):
    strs: list["STRDraftResponse"]
    total: int


class STRDraftResponse(BaseModel):
    id: UUID
    alert_id: UUID
    reviewer_notes: str | None
    provider: str
    model_name: str
    model_version: str
    decision: str
    content_json: dict
    content_text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
