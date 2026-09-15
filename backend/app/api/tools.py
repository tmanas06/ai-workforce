from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.db.session import get_db
from app.models import Project, Agent
from app.tools import tool_registry
from app.websocket.manager import emit_event, emit_log


router = APIRouter()


class ToolExecuteRequest(BaseModel):
    tool: str
    params: Dict[str, Any]
    agent_id: Optional[int] = None


class ToolExecuteResponse(BaseModel):
    success: bool
    output: str = ""
    error: str = ""
    exit_code: int = 0
    duration_ms: int = 0


@router.post("/projects/{project_id}/tools/{tool_name}", response_model=ToolExecuteResponse)
async def execute_tool(
    project_id: int,
    tool_name: str,
    request: ToolExecuteRequest,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    agent_permissions = {"filesystem": "workspace", "terminal": "restricted", "network": False, "sudo": False}
    
    if request.agent_id:
        agent = db.query(Agent).filter(Agent.id == request.agent_id, Agent.project_id == project_id).first()
        if agent:
            agent_permissions = agent.permissions
    
    result = await tool_registry.execute(
        tool_name,
        request.params,
        {"workspace": project.workspace_path},
        agent_permissions
    )
    
    if request.agent_id:
        await emit_event(project_id, "agent.tool_called", {
            "tool": tool_name,
            "params": request.params,
            "result": result.model_dump()
        }, request.agent_id)
    
    return ToolExecuteResponse(**result.model_dump())


@router.post("/projects/{project_id}/tools/filesystem", response_model=ToolExecuteResponse)
async def execute_filesystem(
    project_id: int,
    request: ToolExecuteRequest,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    agent_permissions = {"filesystem": "workspace", "terminal": "restricted", "network": False, "sudo": False}
    
    if request.agent_id:
        agent = db.query(Agent).filter(Agent.id == request.agent_id, Agent.project_id == project_id).first()
        if agent:
            agent_permissions = agent.permissions
    
    result = await tool_registry.execute(
        "filesystem",
        request.params,
        {"workspace": project.workspace_path},
        agent_permissions
    )
    
    if result.success and request.params.get("action") == "write":
        await emit_event(project_id, "agent.file_changed", {
            "path": request.params.get("path"),
            "action": "write"
        }, request.agent_id)
    
    return ToolExecuteResponse(**result.model_dump())


@router.post("/projects/{project_id}/tools/terminal", response_model=ToolExecuteResponse)
async def execute_terminal(
    project_id: int,
    request: ToolExecuteRequest,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    agent_permissions = {"filesystem": "workspace", "terminal": "restricted", "network": False, "sudo": False}
    
    if request.agent_id:
        agent = db.query(Agent).filter(Agent.id == request.agent_id, Agent.project_id == project_id).first()
        if agent:
            agent_permissions = agent.permissions
    
    # Check for dangerous commands
    command = request.params.get("command", "")
    dangerous = ["sudo", "rm -rf /", "dd if=", "mkfs", "shutdown", "reboot", ":(){ :|:& };:"]
    for d in dangerous:
        if d in command and not agent_permissions.get("sudo", False):
            return ToolExecuteResponse(
                success=False,
                error=f"Command blocked: '{d}' requires sudo permission",
                exit_code=-1
            )
    
    result = await tool_registry.execute(
        "terminal",
        request.params,
        {"workspace": project.workspace_path},
        agent_permissions
    )
    
    return ToolExecuteResponse(**result.model_dump())


@router.post("/projects/{project_id}/tools/git", response_model=ToolExecuteResponse)
async def execute_git(
    project_id: int,
    request: ToolExecuteRequest,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    agent_permissions = {"filesystem": "workspace", "terminal": "restricted", "network": False, "sudo": False}
    
    if request.agent_id:
        agent = db.query(Agent).filter(Agent.id == request.agent_id, Agent.project_id == project_id).first()
        if agent:
            agent_permissions = agent.permissions
    
    result = await tool_registry.execute(
        "git",
        request.params,
        {"workspace": project.workspace_path},
        agent_permissions
    )
    
    return ToolExecuteResponse(**result.model_dump())