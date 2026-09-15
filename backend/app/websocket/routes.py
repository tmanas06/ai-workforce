from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket.manager import manager
import json


router = APIRouter()


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: int):
    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif message.get("type") == "subscribe_agent":
                agent_id = message.get("agent_id")
                pass
            elif message.get("type") == "subscribe_task":
                task_id = message.get("task_id")
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
    except Exception as e:
        manager.disconnect(websocket, project_id)