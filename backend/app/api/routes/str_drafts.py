from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.models import STRDraft
from app.models.enums import DecisionStatus
from app.schemas.str_drafts import STRDecisionUpdate, STRDraftResponse, STRGenerateRequest, STRListResponse
from app.services.audit_service import write_audit_event
from app.services.str_service import STRGenerationError, generate_str_draft, get_str_draft


router = APIRouter()


@router.get("/str/list", response_model=STRListResponse)
def list_strs(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> STRListResponse:
    total = db.scalar(select(func.count()).select_from(STRDraft)) or 0
    rows = db.scalars(
        select(STRDraft).order_by(desc(STRDraft.created_at)).limit(limit).offset(offset)
    ).all()
    return STRListResponse(
        strs=[
            STRDraftResponse(
                id=r.id,
                alert_id=r.alert_id,
                reviewer_notes=r.reviewer_notes,
                provider=r.provider,
                model_name=r.model_name,
                model_version=r.model_version,
                decision=r.decision.value,
                content_json=r.content_json,
                content_text=r.content_text,
                created_at=r.created_at,
            )
            for r in rows
        ],
        total=total,
    )


@router.post("/str/generate", response_model=STRDraftResponse, status_code=status.HTTP_201_CREATED)
def generate_str(
    payload: STRGenerateRequest,
    db: Session = Depends(get_db),
) -> STRDraftResponse:
    try:
        return generate_str_draft(db=db, alert_id=payload.alert_id, reviewer_notes=payload.reviewer_notes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except STRGenerationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.patch("/str/{str_id}/decision", response_model=STRDraftResponse)
def update_str_decision(
    str_id: UUID,
    body: STRDecisionUpdate,
    db: Session = Depends(get_db),
) -> STRDraftResponse:
    draft = db.scalar(select(STRDraft).where(STRDraft.id == str_id))
    if draft is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="STR draft not found")
    if draft.decision != DecisionStatus.pending:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Decision already recorded")
    draft.decision = DecisionStatus(body.decision)
    write_audit_event(
        db=db,
        action="str_decision_updated",
        entity_ids=[],
        alert_id=draft.alert_id,
        model_version=draft.model_version,
        decision=DecisionStatus(body.decision),
        payload_json={"str_id": str(str_id), "decision": body.decision},
    )
    db.commit()
    db.refresh(draft)
    return get_str_draft(db=db, str_id=str_id)


@router.get("/str/{str_id}", response_model=STRDraftResponse)
def fetch_str(
    str_id: UUID,
    db: Session = Depends(get_db),
) -> STRDraftResponse:
    row = get_str_draft(db=db, str_id=str_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="STR draft not found")
    return row
