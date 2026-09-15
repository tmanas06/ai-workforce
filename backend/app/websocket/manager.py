import json
import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        self.project_connections: Dict[int, Set[WebSocket]] = {}
        self.agent_connections: Dict[int, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, project_id: int):
        await websocket.accept()
        if project_id not in self.project_connections:
            self.project_connections[project_id] = set()
        self.project_connections[project_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, project_id: int):
        if project_id in self.project_connections:
            self.project_connections[project_id].discard(websocket)
            if not self.project_connections[project_id]:
                del self.project_connections[project_id]
    
    async def broadcast_to_project(self, project_id: int, message: dict):
        if project_id in self.project_connections:
            disconnected = set()
            for ws in self.project_connections[project_id]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    disconnected.add(ws)
            for ws in disconnected:
                self.project_connections[project_id].discard(ws)
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_text(json.dumps(message))
        except Exception:
            pass


manager = ConnectionManager()


async def emit_event(project_id: int, event_type: str, payload: dict, agent_id: int = None, task_id: int = None):
    message = {
        "type": "event",
        "event_type": event_type,
        "project_id": project_id,
        "agent_id": agent_id,
        "task_id": task_id,
        "payload": payload,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_to_project(project_id, message)


async def emit_agent_status(project_id: int, agent_id: int, status: str, details: dict = None):
    message = {
        "type": "agent_status",
        "project_id": project_id,
        "agent_id": agent_id,
        "status": status,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_to_project(project_id, message)


async def emit_task_update(project_id: int, task_id: int, status: str, details: dict = None):
    message = {
        "type": "task_update",
        "project_id": project_id,
        "task_id": task_id,
        "status": status,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_to_project(project_id, message)


async def emit_log(project_id: int, level: str, message: str, agent_id: int = None, task_id: int = None):
    log_message = {
        "type": "log",
        "project_id": project_id,
        "agent_id": agent_id,
        "task_id": task_id,
        "level": level,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_to_project(project_id, log_message)