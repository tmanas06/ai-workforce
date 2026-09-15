from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ProjectStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class AgentRole(str, Enum):
    ORCHESTRATOR = "orchestrator"
    ARCHITECT = "architect"
    RESEARCHER = "researcher"
    DEVELOPER = "developer"
    QA = "qa"
    REVIEWER = "reviewer"


class AgentStatus(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    WORKING = "working"
    WAITING = "waiting"
    REVIEW = "review"
    ERROR = "error"
    OFFLINE = "offline"


class RuntimeType(str, Enum):
    KILO = "kilo"
    OPENCODE = "opencode"
    CUSTOM_PYTHON = "custom_python"
    SUBPROCESS = "subprocess"


class TaskStatus(str, Enum):
    BACKLOG = "backlog"
    PLANNED = "planned"
    READY = "ready"
    ASSIGNED = "assigned"
    RUNNING = "running"
    BLOCKED = "blocked"
    REVIEW = "review"
    FAILED = "failed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class EventType(str, Enum):
    AGENT_CREATED = "agent.created"
    AGENT_STARTED = "agent.started"
    AGENT_STOPPED = "agent.stopped"
    AGENT_THINKING = "agent.thinking"
    AGENT_TOOL_CALLED = "agent.tool_called"
    AGENT_FILE_CHANGED = "agent.file_changed"
    TASK_CREATED = "task.created"
    TASK_ASSIGNED = "task.assigned"
    TASK_STARTED = "task.started"
    TASK_BLOCKED = "task.blocked"
    TASK_FAILED = "task.failed"
    TASK_COMPLETED = "task.completed"
    TASK_REASSIGNED = "task.reassigned"
    REVIEW_STARTED = "review.started"
    REVIEW_FAILED = "review.failed"
    REVIEW_PASSED = "review.passed"
    MODEL_REQUESTED = "model.requested"
    MODEL_STARTED = "model.started"
    MODEL_FAILED = "model.failed"
    MODEL_FALLBACK = "model.fallback"
    HUMAN_APPROVAL_REQUIRED = "human.approval_required"
    HUMAN_APPROVED = "human.approved"
    HUMAN_REJECTED = "human.rejected"


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    objective: str = Field(..., min_length=1)
    workspace_path: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    objective: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectResponse(ProjectBase):
    id: int
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AgentBase(BaseModel):
    role: AgentRole
    name: str = Field(..., min_length=1, max_length=255)
    runtime_type: RuntimeType = RuntimeType.SUBPROCESS
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    capabilities: List[str] = []
    permissions: Dict[str, Any] = {}


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    role: Optional[AgentRole] = None
    name: Optional[str] = None
    runtime_type: Optional[RuntimeType] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    capabilities: Optional[List[str]] = None
    permissions: Optional[Dict[str, Any]] = None
    status: Optional[AgentStatus] = None
    current_task_id: Optional[int] = None


class AgentResponse(AgentBase):
    id: int
    project_id: int
    status: AgentStatus
    current_task_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    dependencies: List[int] = []


class TaskCreate(TaskBase):
    parent_task_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assigned_agent_id: Optional[int] = None
    dependencies: Optional[List[int]] = None
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    review_status: Optional[ReviewStatus] = None
    review_notes: Optional[str] = None
    retry_count: Optional[int] = None


class TaskResponse(TaskBase):
    id: int
    project_id: int
    parent_task_id: Optional[int] = None
    status: TaskStatus
    assigned_agent_id: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    review_status: ReviewStatus
    review_notes: Optional[str] = None
    retry_count: int
    max_retries: int
    
    class Config:
        from_attributes = True


class EventBase(BaseModel):
    event_type: EventType
    payload: Optional[Dict[str, Any]] = None


class EventCreate(EventBase):
    agent_id: Optional[int] = None
    task_id: Optional[int] = None


class EventResponse(EventBase):
    id: int
    project_id: int
    agent_id: Optional[int] = None
    task_id: Optional[int] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


class AgentMemoryBase(BaseModel):
    key: str
    value: Optional[Dict[str, Any]] = None


class AgentMemoryCreate(AgentMemoryBase):
    pass


class AgentMemoryResponse(AgentMemoryBase):
    id: int
    agent_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProjectMemoryBase(BaseModel):
    key: str
    value: Optional[Dict[str, Any]] = None


class ProjectMemoryCreate(ProjectMemoryBase):
    pass


class ProjectMemoryResponse(ProjectMemoryBase):
    id: int
    project_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ModelMetricBase(BaseModel):
    provider: str
    model: str
    task_type: Optional[str] = None
    success: bool = True
    latency_ms: Optional[int] = None
    tokens_input: Optional[int] = None
    tokens_output: Optional[int] = None
    cost_usd: Optional[str] = None
    error: Optional[str] = None


class ModelMetricCreate(ModelMetricBase):
    pass


class ModelMetricResponse(ModelMetricBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class WorkforceStartRequest(BaseModel):
    project_id: int
    max_parallel_agents: int = 5


class WorkforceStopRequest(BaseModel):
    project_id: int


class ApprovalRequest(BaseModel):
    agent_id: int
    action: str
    command: str
    reason: str


class ApprovalResponse(BaseModel):
    approved: bool
    reason: Optional[str] = None