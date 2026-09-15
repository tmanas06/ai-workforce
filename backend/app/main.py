from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.db.session import init_db
from app.api import routes as api_routes
from app.api import tools as tools_routes
from app.websocket import routes as ws_routes
from app.services.orchestrator import orchestrator_service


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized")
    yield
    await orchestrator_service.stop_all()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_routes.router, prefix=settings.API_V1_PREFIX)
app.include_router(tools_routes.router, prefix=settings.API_V1_PREFIX)
app.include_router(ws_routes.router)


@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/health")
async def health():
    return {"status": "healthy"}


from app.schemas import WorkforceStartRequest, WorkforceStopRequest


@app.post("/api/v1/workforce/start")
async def start_workforce(req: WorkforceStartRequest):
    await orchestrator_service.start_project(req.project_id, req.max_parallel_agents)
    return {"message": "Workforce started", "project_id": req.project_id}


@app.post("/api/v1/workforce/stop")
async def stop_workforce(req: WorkforceStopRequest):
    await orchestrator_service.stop_project(req.project_id)
    return {"message": "Workforce stopped", "project_id": req.project_id}


@app.post("/api/v1/workforce/stop-all")
async def stop_all_workforce():
    await orchestrator_service.stop_all()
    return {"message": "All workforce stopped"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)