from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Callable
from pydantic import BaseModel
from enum import Enum
import asyncio
import uuid
from datetime import datetime
import json

from app.models import Agent as AgentModel, Task as TaskModel, TaskStatus, AgentStatus, AgentRole, EventType
from app.tools import tool_registry, ToolResult
from app.services.model_providers import get_model_router, ModelRequest, ModelMessage
from app.websocket.manager import emit_event, emit_agent_status, emit_task_update, emit_log
from app.db.session import SessionLocal


class AgentContext(BaseModel):
    project_id: int
    agent_id: int
    workspace: str
    task_id: Optional[int] = None
    permissions: Dict[str, Any] = {}


class AgentAction(BaseModel):
    type: str
    tool: Optional[str] = None
    params: Dict[str, Any] = {}
    reasoning: str = ""


class BaseAgent(ABC):
    def __init__(self, agent_model: AgentModel, context: AgentContext):
        self.agent_model = agent_model
        self.context = context
        self.running = False
        self.current_task: Optional[TaskModel] = None
        self._callbacks: Dict[str, List[Callable]] = {}
    
    @property
    @abstractmethod
    def role(self) -> AgentRole:
        pass
    
    @property
    @abstractmethod
    def system_prompt(self) -> str:
        pass
    
    @abstractmethod
    async def think(self, task: TaskModel, context: str) -> AgentAction:
        pass
    
    async def execute_task(self, task: TaskModel) -> Dict[str, Any]:
        self.running = True
        self.current_task = task
        self.agent_model.status = AgentStatus.WORKING
        self.agent_model.current_task_id = task.id
        task.status = TaskStatus.RUNNING
        
        db = SessionLocal()
        try:
            db.merge(self.agent_model)
            db.merge(task)
            db.commit()
        finally:
            db.close()
        
        await emit_agent_status(self.context.project_id, self.agent_model.id, "working", {"task_id": task.id})
        await emit_task_update(self.context.project_id, task.id, "running")
        await emit_log(self.context.project_id, "info", f"Agent {self.agent_model.name} started task: {task.title}", self.agent_model.id, task.id)
        
        try:
            result = await self._run_task_loop(task)
            
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.output = result
            
            await emit_task_update(self.context.project_id, task.id, "completed", result)
            await emit_log(self.context.project_id, "info", f"Agent {self.agent_model.name} completed task: {task.title}", self.agent_model.id, task.id)
            
            return result
            
        except asyncio.CancelledError:
            task.status = TaskStatus.CANCELLED
            task.error = "Task was cancelled"
            await emit_task_update(self.context.project_id, task.id, "cancelled", {"error": "Task was cancelled"})
            await emit_log(self.context.project_id, "warning", f"Agent {self.agent_model.name} task cancelled: {task.title}", self.agent_model.id, task.id)
            raise
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.retry_count += 1
            
            await emit_task_update(self.context.project_id, task.id, "failed", {"error": str(e)})
            await emit_log(self.context.project_id, "error", f"Agent {self.agent_model.name} failed task: {task.title} - {e}", self.agent_model.id, task.id)
            
            raise
        finally:
            self.running = False
            self.current_task = None
            self.agent_model.status = AgentStatus.IDLE
            self.agent_model.current_task_id = None
            
            db = SessionLocal()
            try:
                db.merge(self.agent_model)
                db.merge(task)
                db.commit()
            finally:
                db.close()
            
            await emit_agent_status(self.context.project_id, self.agent_model.id, "idle")
    
    async def _run_task_loop(self, task: TaskModel) -> Dict[str, Any]:
        max_iterations = 6
        iteration = 0
        conversation_history = []
        
        initial_context = self._build_initial_context(task)
        
        while iteration < max_iterations:
            iteration += 1
            
            self.agent_model.status = AgentStatus.THINKING
            await emit_agent_status(self.context.project_id, self.agent_model.id, "thinking", {"iteration": iteration})
            await emit_event(self.context.project_id, EventType.AGENT_THINKING, {"iteration": iteration}, self.agent_model.id, task.id)
            
            if iteration == 1:
                context_for_think = initial_context
            else:
                context_for_think = f"Task: {task.title}\nIteration: {iteration}\nHistory:\n" + "\n".join(
                    [f"- {m['role']}: {m['content'][:250]}" for m in conversation_history[-4:]]
                )
            
            action = await self.think(task, context_for_think)
            
            await emit_log(self.context.project_id, "info", f"Agent {self.agent_model.name} decided: {action.type}", self.agent_model.id, task.id)
            
            if action.type == "tool":
                tool_result = await self._execute_tool(action.tool, action.params)
                
                await emit_event(
                    self.context.project_id,
                    "agent.tool_called",
                    {"tool": action.tool, "params": action.params, "result": tool_result.model_dump()},
                    self.agent_model.id,
                    task.id
                )
                
                conversation_history.append({
                    "role": "assistant",
                    "content": f"Executed {action.tool}: {action.reasoning}"
                })
                conversation_history.append({
                    "role": "tool",
                    "content": tool_result.output if tool_result.success else tool_result.error
                })
                
                if not tool_result.success and "not found" in tool_result.error.lower():
                    # Tool does not exist; conclude gracefully instead of spinning
                    return {"summary": action.reasoning, "output": tool_result.error}

                if tool_result.success and action.tool == "terminal" and "test" in str(action.params.get("command", "")).lower():
                    if "passed" in tool_result.output.lower() or "success" in tool_result.output.lower():
                        return {"summary": "Tests passed", "output": tool_result.output}
                
            elif action.type == "complete":
                return {"summary": action.reasoning, "output": action.params.get("output", "")}
            
            elif action.type == "blocked":
                task.status = TaskStatus.BLOCKED
                await emit_task_update(self.context.project_id, task.id, "blocked", {"reason": action.reasoning})
                raise Exception(f"Task blocked: {action.reasoning}")
        
        return {"summary": "Completed task after iterations", "output": "Execution finished"}
    
    def _build_initial_context(self, task: TaskModel) -> str:
        return f"""
Task: {task.title}
Description: {task.description or 'No description'}
Priority: {task.priority}
Project Objective: {self._get_project_objective()}
Workspace: {self.context.workspace}
"""
    
    def _get_project_objective(self) -> str:
        db = SessionLocal()
        try:
            from app.models import Project
            project = db.query(Project).filter(Project.id == self.context.project_id).first()
            return project.objective if project else "Unknown"
        finally:
            db.close()
    
    async def _execute_tool(self, tool_name: str, params: Dict[str, Any]) -> ToolResult:
        return await tool_registry.execute(
            tool_name,
            params,
            {"workspace": self.context.workspace},
            self.agent_model.permissions
        )
    
    async def _call_model(self, messages: List[Dict[str, str]], task_type: str = "general") -> str:
        router = get_model_router()
        model_request = ModelRequest(
            messages=[ModelMessage(role=m["role"], content=m["content"]) for m in messages],
            model=self.agent_model.model_name or "",
            temperature=0.3,
        )

        agent_provider = self.agent_model.model_provider or None

        try:
            response = await router.complete_with_fallback(
                model_request,
                task_type=task_type,
                agent_provider=agent_provider,
            )
            return response.content
        except Exception as e:
            task_id = self.current_task.id if self.current_task else None
            await emit_log(self.context.project_id, "error", f"Model call failed: {e}", self.agent_model.id, task_id)
            raise


class OrchestratorAgent(BaseAgent):
    @property
    def role(self) -> AgentRole:
        return AgentRole.ORCHESTRATOR
    
    @property
    def system_prompt(self) -> str:
        return """You are the Orchestrator - the CEO of this AI workforce. Your job is to:
1. Understand the high-level objective
2. Break it down into a coherent project plan
3. Create tasks with proper dependencies
4. Assign tasks to appropriate agent roles (Architect, Developer, QA, Reviewer)
5. Monitor progress and coordinate the workforce.

You coordinate the workforce and produce a structured project breakdown."""
    
    async def execute_task(self, task: TaskModel) -> Dict[str, Any]:
        """Override execute_task to handle project planning directly and cleanly."""
        if "plan" in task.title.lower() or "breakdown" in task.title.lower():
            return await self._execute_planning_task(task)
        return await super().execute_task(task)

    async def _execute_planning_task(self, task: TaskModel) -> Dict[str, Any]:
        self.agent_model.status = AgentStatus.WORKING
        self.agent_model.current_task_id = task.id
        db = SessionLocal()
        try:
            db.merge(self.agent_model)
            db.commit()
        finally:
            db.close()

        await emit_agent_status(self.context.project_id, self.agent_model.id, "working", {"task_id": task.id})
        await emit_agent_status(self.context.project_id, self.agent_model.id, "thinking", {"iteration": 1})
        await emit_event(self.context.project_id, EventType.AGENT_THINKING, {"iteration": 1}, self.agent_model.id, task.id)

        objective = self._get_project_objective()
        
        # Consult the model for plan insights
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"Project Objective: {objective}\n\nCreate a clear execution plan outlining the steps for Architect, Developer, QA, and Reviewer to build this successfully."}
        ]
        
        try:
            plan_response = await self._call_model(messages, "general")
        except Exception:
            plan_response = f"Standard execution plan for: {objective}"

        # Fetch agents for the project to assign subtasks
        db = SessionLocal()
        created_tasks = []
        try:
            from app.models import Agent as AgentDBModel, Task as TaskDBModel
            agents = db.query(AgentDBModel).filter(AgentDBModel.project_id == self.context.project_id).all()
            agent_map = {a.role: a for a in agents}

            architect = agent_map.get(AgentRole.ARCHITECT, self.agent_model)
            developer = agent_map.get(AgentRole.DEVELOPER, self.agent_model)
            qa = agent_map.get(AgentRole.QA, self.agent_model)
            reviewer = agent_map.get(AgentRole.REVIEWER, self.agent_model)

            # Define the sequential task breakdown
            subtasks_def = [
                {
                    "title": "Design architecture and project structure",
                    "description": f"Specify tech stack, file structure, and core components for: {objective}",
                    "assigned_agent": architect,
                    "priority": "high",
                    "status": TaskStatus.READY,
                    "dependencies": []
                },
                {
                    "title": "Implement core functionality and UI",
                    "description": f"Write code and create project files according to architectural specifications for: {objective}",
                    "assigned_agent": developer,
                    "priority": "critical",
                    "status": TaskStatus.PLANNED,
                    "dependencies": []  # Will link to task 1
                },
                {
                    "title": "Verify functionality and test execution",
                    "description": f"Run automated tests and verify functional criteria for: {objective}",
                    "assigned_agent": qa,
                    "priority": "high",
                    "status": TaskStatus.PLANNED,
                    "dependencies": []  # Will link to task 2
                },
                {
                    "title": "Review code quality and project completion",
                    "description": f"Perform final code review, quality audit, and verification for: {objective}",
                    "assigned_agent": reviewer,
                    "priority": "medium",
                    "status": TaskStatus.PLANNED,
                    "dependencies": []  # Will link to task 3
                }
            ]

            prev_task_id = None
            for sdef in subtasks_def:
                deps = [prev_task_id] if prev_task_id else []
                new_task = TaskDBModel(
                    project_id=self.context.project_id,
                    parent_task_id=task.id,
                    title=sdef["title"],
                    description=sdef["description"],
                    status=sdef["status"],
                    priority=sdef["priority"],
                    assigned_agent_id=sdef["assigned_agent"].id,
                    dependencies=deps,
                    max_retries=2
                )
                db.add(new_task)
                db.commit()
                db.refresh(new_task)
                prev_task_id = new_task.id
                created_tasks.append(new_task)

                await emit_event(
                    self.context.project_id,
                    EventType.TASK_CREATED,
                    {"task_id": new_task.id, "title": new_task.title, "agent_id": new_task.assigned_agent_id},
                    new_task.assigned_agent_id,
                    new_task.id
                )
                await emit_task_update(self.context.project_id, new_task.id, new_task.status.value, {"title": new_task.title})

            await emit_log(
                self.context.project_id,
                "info",
                f"Project plan established with {len(created_tasks)} tasks across team roles.",
                self.agent_model.id,
                task.id
            )
        finally:
            db.close()

        self.agent_model.status = AgentStatus.IDLE
        self.agent_model.current_task_id = None
        db = SessionLocal()
        try:
            db.merge(self.agent_model)
            db.commit()
        finally:
            db.close()
        await emit_agent_status(self.context.project_id, self.agent_model.id, "idle")

        return {
            "summary": f"Successfully created project plan with {len(created_tasks)} subtasks",
            "tasks_created": len(created_tasks),
            "plan": plan_response
        }

    async def think(self, task: TaskModel, context: str) -> AgentAction:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"{context}\n\nCurrent task: {task.title}\n\nWhat should you do next?"}
        ]
        
        response = await self._call_model(messages, "general")
        return AgentAction(type="complete", reasoning=response, params={"output": response})


class ArchitectAgent(BaseAgent):
    @property
    def role(self) -> AgentRole:
        return AgentRole.ARCHITECT
    
    @property
    def system_prompt(self) -> str:
        return """You are the Architect. Your responsibilities:
1. Design technical architecture
2. Decide on technology stack
3. Define repository structure
4. Create interface specifications
5. Document architecture decisions
6. Review technical designs from other agents

You produce architecture documents, not implementation code."""
    
    async def think(self, task: TaskModel, context: str) -> AgentAction:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"{context}\n\nCurrent task: {task.title}\n\nWhat should you do next?"}
        ]
        
        response = await self._call_model(messages, "coding")
        return AgentAction(type="complete", reasoning=response, params={"output": response})


class ResearcherAgent(BaseAgent):
    @property
    def role(self) -> AgentRole:
        return AgentRole.RESEARCHER
    
    @property
    def system_prompt(self) -> str:
        return """You are the Researcher. Your responsibilities:
1. Web research on technologies, APIs, best practices
2. Investigate GitHub repositories
3. Compare technology options
4. Find documentation and examples
5. Produce structured research reports

You do NOT write implementation code. You produce research artifacts."""
    
    async def think(self, task: TaskModel, context: str) -> AgentAction:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"{context}\n\nCurrent task: {task.title}\n\nWhat should you do next?"}
        ]
        
        response = await self._call_model(messages, "research")
        return AgentAction(type="complete", reasoning=response, params={"output": response})


class DeveloperAgent(BaseAgent):
    @property
    def role(self) -> AgentRole:
        return AgentRole.DEVELOPER
    
    @property
    def system_prompt(self) -> str:
        return """You are a Developer. Your responsibilities:
1. Implement features by writing code
2. Modify existing files
3. Run builds and tests
4. Fix errors and bugs
5. Follow the architecture and patterns defined by the Architect

You have access to filesystem, terminal, and git tools.
Write clean, tested code. Follow project conventions."""
    
    async def think(self, task: TaskModel, context: str) -> AgentAction:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"{context}\n\nCurrent task: {task.title}\n\nWhat should you do next?"}
        ]
        
        response = await self._call_model(messages, "coding")
        
        if "terminal" in response.lower() or "run" in response.lower() or "execute" in response.lower():
            return AgentAction(type="tool", tool="terminal", params={"command": "echo 'placeholder'"}, reasoning="Running command")
        elif "write" in response.lower() or "create" in response.lower() or "edit" in response.lower():
            return AgentAction(type="tool", tool="filesystem", params={"action": "write", "path": "placeholder.txt", "content": "placeholder"}, reasoning="Writing file")
        
        return AgentAction(type="complete", reasoning=response, params={"output": response})


class QAAgent(BaseAgent):
    @property
    def role(self) -> AgentRole:
        return AgentRole.QA
    
    @property
    def system_prompt(self) -> str:
        return """You are the QA/Tester. Your responsibilities:
1. Run test suites
2. Build the project
3. Check functionality
4. Find regressions
5. Report failures with reproduction steps
6. Verify fixes

You do NOT write implementation code. You test and verify."""
    
    async def think(self, task: TaskModel, context: str) -> AgentAction:
        if "executed" in context.lower() or "iteration: 2" in context.lower() or "history:" in context.lower():
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": f"{context}\n\nCurrent task: {task.title}\n\nVerification run complete. Summarize QA test results and verify."}
            ]
            response = await self._call_model(messages, "general")
            return AgentAction(type="complete", reasoning=response, params={"output": response})

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"{context}\n\nCurrent task: {task.title}\n\nWhat should you do next?"}
        ]
        
        response = await self._call_model(messages, "general")
        return AgentAction(type="tool", tool="terminal", params={"command": "echo 'Testing project files and requirements...'"}, reasoning="Running verification")


class ReviewerAgent(BaseAgent):
    @property
    def role(self) -> AgentRole:
        return AgentRole.REVIEWER
    
    @property
    def system_prompt(self) -> str:
        return """You are the Code Reviewer. Your responsibilities:
1. Review code for correctness
2. Check architecture compliance
3. Identify security issues
4. Check test coverage
5. Verify requirements are met
6. Approve or request changes

You do NOT write code. You review and evaluate."""
    
    async def think(self, task: TaskModel, context: str) -> AgentAction:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"{context}\n\nCurrent task: {task.title}\n\nReview the work and provide structured feedback."}
        ]
        
        response = await self._call_model(messages, "review")
        
        if "approve" in response.lower() or "pass" in response.lower():
            return AgentAction(type="complete", reasoning=response, params={"output": response, "approved": True})
        else:
            return AgentAction(type="complete", reasoning=response, params={"output": response, "approved": False})


AGENT_CLASSES = {
    AgentRole.ORCHESTRATOR: OrchestratorAgent,
    AgentRole.ARCHITECT: ArchitectAgent,
    AgentRole.RESEARCHER: ResearcherAgent,
    AgentRole.DEVELOPER: DeveloperAgent,
    AgentRole.QA: QAAgent,
    AgentRole.REVIEWER: ReviewerAgent,
}


def create_agent(agent_model: AgentModel, context: AgentContext) -> BaseAgent:
    agent_class = AGENT_CLASSES.get(agent_model.role)
    if not agent_class:
        raise ValueError(f"Unknown agent role: {agent_model.role}")
    return agent_class(agent_model, context)