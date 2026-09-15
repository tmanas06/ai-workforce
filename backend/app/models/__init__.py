import enum
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Enum, JSON, Boolean, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class AgentRole(str, enum.Enum):
    ORCHESTRATOR = "orchestrator"
    ARCHITECT = "architect"
    RESEARCHER = "researcher"
    DEVELOPER = "developer"
    QA = "qa"
    REVIEWER = "reviewer"


class AgentStatus(str, enum.Enum):
    IDLE = "idle"
    THINKING = "thinking"
    WORKING = "working"
    WAITING = "waiting"
    REVIEW = "review"
    ERROR = "error"
    OFFLINE = "offline"


class RuntimeType(str, enum.Enum):
    KILO = "kilo"
    OPENCODE = "opencode"
    CUSTOM_PYTHON = "custom_python"
    SUBPROCESS = "subprocess"


class TaskStatus(str, enum.Enum):
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


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ReviewStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class EventType(str, enum.Enum):
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


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    objective = Column(Text, nullable=False)
    workspace_path = Column(String(512), nullable=False)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    agents = relationship("Agent", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="project", cascade="all, delete-orphan")
    memories = relationship("ProjectMemory", back_populates="project", cascade="all, delete-orphan")


class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(AgentRole), nullable=False)
    name = Column(String(255), nullable=False)
    runtime_type = Column(Enum(RuntimeType), default=RuntimeType.SUBPROCESS)
    model_provider = Column(String(100), nullable=True)
    model_name = Column(String(100), nullable=True)
    capabilities = Column(JSON, default=list)
    permissions = Column(JSON, default=dict)
    status = Column(Enum(AgentStatus), default=AgentStatus.IDLE)
    current_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    project = relationship("Project", back_populates="agents")
    tasks = relationship("Task", back_populates="assigned_agent", foreign_keys="Task.assigned_agent_id")
    current_task = relationship("Task", foreign_keys=[current_task_id])
    events = relationship("Event", back_populates="agent")
    memories = relationship("AgentMemory", back_populates="agent", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    parent_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.BACKLOG)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    assigned_agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    dependencies = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    output = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    review_status = Column(Enum(ReviewStatus), default=ReviewStatus.PENDING)
    review_notes = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    project = relationship("Project", back_populates="tasks")
    parent_task = relationship("Task", remote_side=[id], backref="subtasks")
    assigned_agent = relationship("Agent", back_populates="tasks", foreign_keys=[assigned_agent_id])
    events = relationship("Event", back_populates="task")


class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(Enum(EventType), nullable=False)
    payload = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    project = relationship("Project", back_populates="events")
    agent = relationship("Agent", back_populates="events")
    task = relationship("Task", back_populates="events")


class AgentMemory(Base):
    __tablename__ = "agent_memories"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    agent = relationship("Agent", back_populates="memories")
    
    __table_args__ = (Index("ix_agent_memory_agent_key", "agent_id", "key", unique=True),)


class ProjectMemory(Base):
    __tablename__ = "project_memories"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = relationship("Project", back_populates="memories")
    
    __table_args__ = (Index("ix_project_memory_project_key", "project_id", "key", unique=True),)


class ModelMetric(Base):
    __tablename__ = "model_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    task_type = Column(String(100), nullable=True)
    success = Column(Boolean, default=True)
    latency_ms = Column(Integer, nullable=True)
    tokens_input = Column(Integer, nullable=True)
    tokens_output = Column(Integer, nullable=True)
    cost_usd = Column(String(50), nullable=True)
    error = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (Index("ix_model_metrics_provider_model", "provider", "model"),)