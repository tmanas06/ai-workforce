# AI Workforce Architecture

## Overview
Local-first AI workforce orchestration platform for autonomous multi-agent development.

## Technology Stack
- **Backend**: Python + FastAPI + SQLite (PostgreSQL-ready)
- **Frontend**: React + TypeScript + Vite
- **Real-time**: WebSocket (FastAPI WebSocket)
- **Agent Runtime**: Subprocess-based (extensible for Kilo, OpenCode, custom)

## Directory Structure
```
ai-workforce/
├── backend/
│   ├── app/
│   │   ├── api/           # REST API endpoints
│   │   ├── core/          # Config, settings, constants
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic services
│   │   ├── agents/        # Agent implementations
│   │   ├── tools/         # Tool execution framework
│   │   ├── db/            # Database session, init
│   │   └── websocket/     # WebSocket handlers
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/    # React components
│       ├── pages/         # Page components
│       ├── hooks/         # Custom hooks
│       ├── services/      # API/WebSocket services
│       ├── types/         # TypeScript types
│       ├── utils/         # Utilities
│       └── contexts/      # React contexts
└── docs/
```

## Database Schema (SQLite)

### Projects
- id, name, objective, workspace_path, status, created_at, updated_at

### Agents
- id, project_id, role, name, runtime_type, model_provider, model_name, capabilities, permissions, status, created_at

### Tasks
- id, project_id, parent_task_id, title, description, status, priority, assigned_agent_id, dependencies (JSON), created_at, started_at, completed_at, output, error, review_status

### Events
- id, project_id, agent_id, task_id, event_type, payload, timestamp

### AgentMemory
- id, agent_id, key, value, created_at

### ProjectMemory
- id, project_id, key, value, created_at

### ModelMetrics
- id, provider, model, task_type, success_rate, latency, token_usage, cost, timestamp

## Core Abstractions

### ModelProvider (Abstract)
- OpenRouterProvider
- OllamaProvider
- OpenAICompatibleProvider
- GoogleProvider

### AgentRuntime (Abstract)
- KiloRuntime
- OpenCodeRuntime
- CustomPythonRuntime
- SubprocessRuntime (default for MVP)

### Tool (Abstract)
- TerminalTool
- FilesystemTool
- GitTool
- BrowserTool
- PythonTool
- TestTool

### TaskStatus Enum
BACKLOG, PLANNED, READY, ASSIGNED, RUNNING, BLOCKED, REVIEW, FAILED, COMPLETED, CANCELLED

### AgentRole Enum
ORCHESTRATOR, ARCHITECT, RESEARCHER, DEVELOPER, QA, REVIEWER

## Event Types
- agent.created, agent.started, agent.stopped, agent.thinking, agent.tool_called, agent.file_changed
- task.created, task.assigned, task.started, task.blocked, task.failed, task.completed, task.reassigned
- review.started, review.failed, review.passed
- model.requested, model.started, model.failed, model.fallback
- human.approval_required, human.approved, human.rejected

## Phase 1 Implementation Order
1. Database schema & models
2. Core config & settings
3. Project/Task/Agent CRUD API
4. Event system & WebSocket
5. Base Agent class & Orchestrator
6. Developer agent with basic tools
7. Frontend dashboard with live updates
8. Task dependency scheduler