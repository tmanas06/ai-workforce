from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models import Project, Agent, Task, Event, AgentMemory, ProjectMemory, ModelMetric
from app.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    AgentCreate, AgentUpdate, AgentResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    EventCreate, EventResponse,
    AgentMemoryCreate, AgentMemoryResponse,
    ProjectMemoryCreate, ProjectMemoryResponse,
    ModelMetricCreate, ModelMetricResponse,
    ProjectStatus, TaskStatus, AgentStatus, AgentRole
)

router = APIRouter()


@router.post("/projects", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    import os
    from pathlib import Path
    from app.core.config import settings
    
    workspace = project.workspace_path or str(Path(settings.WORKSPACES_BASE_PATH) / f"project-{project.name.lower().replace(' ', '-')}")
    os.makedirs(workspace, exist_ok=True)
    
    db_project = Project(
        name=project.name,
        objective=project.objective,
        workspace_path=workspace,
        status=ProjectStatus.ACTIVE
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.get("/projects", response_model=List[ProjectResponse])
def list_projects(
    status: Optional[ProjectStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Project)
    if status:
        query = query.filter(Project.status == status)
    return query.offset(skip).limit(limit).all()


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, project: ProjectUpdate, db: Session = Depends(get_db)):
    db_project = db.query(Project).filter(Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    for field, value in project.model_dump(exclude_unset=True).items():
        setattr(db_project, field, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project


@router.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}


@router.post("/projects/{project_id}/agents", response_model=AgentResponse)
def create_agent(project_id: int, agent: AgentCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_agent = Agent(
        project_id=project_id,
        role=agent.role,
        name=agent.name,
        runtime_type=agent.runtime_type,
        model_provider=agent.model_provider,
        model_name=agent.model_name,
        capabilities=agent.capabilities,
        permissions=agent.permissions,
        status=AgentStatus.IDLE
    )
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent


@router.get("/projects/{project_id}/agents", response_model=List[AgentResponse])
def list_agents(project_id: int, db: Session = Depends(get_db)):
    return db.query(Agent).filter(Agent.project_id == project_id).all()


@router.get("/agents/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/agents/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: int, agent: AgentUpdate, db: Session = Depends(get_db)):
    db_agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not db_agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    for field, value in agent.model_dump(exclude_unset=True).items():
        setattr(db_agent, field, value)
    
    db.commit()
    db.refresh(db_agent)
    return db_agent


@router.delete("/agents/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted"}


@router.post("/projects/{project_id}/tasks", response_model=TaskResponse)
def create_task(project_id: int, task: TaskCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_task = Task(
        project_id=project_id,
        parent_task_id=task.parent_task_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        dependencies=task.dependencies,
        status=TaskStatus.BACKLOG,
        max_retries=3
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.get("/projects/{project_id}/tasks", response_model=List[TaskResponse])
def list_tasks(
    project_id: int,
    status: Optional[TaskStatus] = None,
    assigned_agent_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    if assigned_agent_id:
        query = query.filter(Task.assigned_agent_id == assigned_agent_id)
    return query.all()


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    for field, value in task.model_dump(exclude_unset=True).items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    return db_task


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}


@router.post("/projects/{project_id}/events", response_model=EventResponse)
def create_event(project_id: int, event: EventCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_event = Event(
        project_id=project_id,
        agent_id=event.agent_id,
        task_id=event.task_id,
        event_type=event.event_type,
        payload=event.payload
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@router.get("/projects/{project_id}/events", response_model=List[EventResponse])
def list_events(
    project_id: int,
    agent_id: Optional[int] = None,
    task_id: Optional[int] = None,
    event_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(Event).filter(Event.project_id == project_id)
    if agent_id:
        query = query.filter(Event.agent_id == agent_id)
    if task_id:
        query = query.filter(Event.task_id == task_id)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    return query.order_by(Event.timestamp.desc()).limit(limit).all()


@router.delete("/projects/{project_id}/events")
def clear_events(project_id: int, db: Session = Depends(get_db)):
    db.query(Event).filter(Event.project_id == project_id).delete()
    db.commit()
    return {"message": "Events cleared", "project_id": project_id}


@router.post("/agents/{agent_id}/memory", response_model=AgentMemoryResponse)
def set_agent_memory(agent_id: int, memory: AgentMemoryCreate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    db_memory = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.key == memory.key
    ).first()
    
    if db_memory:
        db_memory.value = memory.value
    else:
        db_memory = AgentMemory(agent_id=agent_id, key=memory.key, value=memory.value)
        db.add(db_memory)
    
    db.commit()
    db.refresh(db_memory)
    return db_memory


@router.get("/agents/{agent_id}/memory", response_model=List[AgentMemoryResponse])
def get_agent_memory(agent_id: int, db: Session = Depends(get_db)):
    return db.query(AgentMemory).filter(AgentMemory.agent_id == agent_id).all()


@router.post("/projects/{project_id}/memory", response_model=ProjectMemoryResponse)
def set_project_memory(project_id: int, memory: ProjectMemoryCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db_memory = db.query(ProjectMemory).filter(
        ProjectMemory.project_id == project_id,
        ProjectMemory.key == memory.key
    ).first()
    
    if db_memory:
        db_memory.value = memory.value
    else:
        db_memory = ProjectMemory(project_id=project_id, key=memory.key, value=memory.value)
        db.add(db_memory)
    
    db.commit()
    db.refresh(db_memory)
    return db_memory


@router.get("/projects/{project_id}/memory", response_model=List[ProjectMemoryResponse])
def get_project_memory(project_id: int, db: Session = Depends(get_db)):
    return db.query(ProjectMemory).filter(ProjectMemory.project_id == project_id).all()


@router.post("/model-metrics", response_model=ModelMetricResponse)
def create_model_metric(metric: ModelMetricCreate, db: Session = Depends(get_db)):
    db_metric = ModelMetric(**metric.model_dump())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric


@router.get("/model-metrics", response_model=List[ModelMetricResponse])
def list_model_metrics(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(ModelMetric)
    if provider:
        query = query.filter(ModelMetric.provider == provider)
    if model:
        query = query.filter(ModelMetric.model == model)
    return query.order_by(ModelMetric.timestamp.desc()).limit(limit).all()