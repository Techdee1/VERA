from fastapi import APIRouter

from app.api.routes.agent import router as agent_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.entities import router as entities_router
from app.api.routes.str_drafts import router as str_drafts_router
from app.api.routes.transactions import router as transactions_router


api_router = APIRouter(prefix="/api/v1")
api_router.include_router(agent_router, tags=["agent"])
api_router.include_router(transactions_router, tags=["transactions"])
api_router.include_router(alerts_router, tags=["alerts"])
api_router.include_router(entities_router, tags=["entities"])
api_router.include_router(str_drafts_router, tags=["str"])
