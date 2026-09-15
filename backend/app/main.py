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
    # Reset any stale running/assigned tasks or agents from previous process restarts
    try:
        from app.db.session import SessionLocal
        from app.models import Task, Agent, TaskStatus, AgentStatus
        db = SessionLocal()
        try:
            orphaned_tasks = db.query(Task).filter(Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.RUNNING])).all()
            for t in orphaned_tasks:
                t.status = TaskStatus.READY
                db.merge(t)
            stuck_agents = db.query(Agent).filter(Agent.status.in_([AgentStatus.WORKING, AgentStatus.THINKING])).all()
            for a in stuck_agents:
                a.status = AgentStatus.IDLE
                a.current_task_id = None
                db.merge(a)
            db.commit()
            if orphaned_tasks or stuck_agents:
                logger.info(f"Cleaned up {len(orphaned_tasks)} stale tasks and {len(stuck_agents)} stuck agents")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Error resetting stale state on startup: {e}")

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