# AI Workforce - Multi-Agent Autonomous Development Office

A local-first, extensible AI workforce orchestration platform for Linux.

## Architecture

```
                    AI WORKFORCE
                         |
              +----------+----------+
              |                     |
        Agent Runtime          Model Router
              |                     |
      +-------+-------+       +-----+------+
      |       |       |       |     |      |
    Kilo  OpenCode  Custom  APIs  Router  Ollama
```

## Features

- **Project Management**: Create projects with objectives and isolated workspaces
- **Agent Orchestration**: Multiple agent roles (Orchestrator, Architect, Researcher, Developer, QA, Reviewer)
- **Task System**: Hierarchical tasks with dependencies and parallel execution
- **Real-time Dashboard**: Live activity feed, agent status, task progress
- **Model Provider Abstraction**: OpenRouter, Ollama, OpenAI-compatible, Google Gemini
- **Model Fallback**: Automatic fallback when providers fail
- **Tool Execution**: Terminal, Filesystem, Git tools with permission system
- **Memory System**: Persistent project and agent memory (SQLite)
- **WebSocket Updates**: Real-time UI updates

## Quick Start

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env with your API keys
python -m app.main
```

Server runs on http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Agent Roles

| Role | Responsibilities |
|------|-----------------|
| **Orchestrator** | Planning, delegation, monitoring, escalation |
| **Architect** | Technical architecture, repo structure, tech decisions |
| **Researcher** | Web research, documentation, GitHub investigation |
| **Developer** | Implementation, code writing, builds, fixes |
| **QA** | Testing, building, regression detection |
| **Reviewer** | Code review, architecture compliance, security |

## Task States

```
BACKLOG → PLANNED → READY → ASSIGNED → RUNNING → REVIEW → COMPLETED
                ↓                              ↓
             BLOCKED                        FAILED → RETRY
```

## Configuration

See `.env.example` for all configuration options.

### Model Providers

- **OpenRouter**: 100+ models (Claude, GPT, Gemini, Llama, etc.)
- **Ollama**: Local models (Llama, CodeLlama, DeepSeek, Qwen, Mistral)
- **OpenAI Compatible**: OpenAI, Azure, local proxies
- **Google**: Gemini models

## Development

### Backend Structure

```
backend/app/
├── api/           # REST API endpoints
├── core/          # Config, settings
├── models/        # SQLAlchemy models
├── schemas/       # Pydantic schemas
├── services/      # Business logic
├── agents/        # Agent implementations
├── tools/         # Tool execution framework
├── db/            # Database session
└── websocket/     # WebSocket handlers
```

### Frontend Structure

```
frontend/src/
├── components/    # React components
├── pages/         # Page components
├── hooks/         # Custom hooks
├── services/      # API/WebSocket services
├── types/         # TypeScript types
├── utils/         # Utilities
└── contexts/      # React contexts
```

## Security

- Workspace isolation
- Permission policies per agent
- Command approval system
- No silent sudo
- Audit logging
- Emergency stop controls

## License

MIT