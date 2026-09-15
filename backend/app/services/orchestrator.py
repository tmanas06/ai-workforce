from typing import Dict, List, Optional, Set
from sqlalchemy.orm import Session
from datetime import datetime
import asyncio
import logging

from app.models import Project, Agent, Task, TaskStatus, AgentStatus, AgentRole, Event, EventType
from app.agents import create_agent, AgentContext, BaseAgent
from app.tools import tool_registry
from app.websocket.manager import emit_event, emit_task_update, emit_agent_status, emit_log
from app.db.session import SessionLocal


logger = logging.getLogger(__name__)


class TaskScheduler:
    def __init__(self, project_id: int, max_parallel: int = 5):
        self.project_id = project_id
        self.max_parallel = max_parallel
        self.running_tasks: Dict[int, asyncio.Task] = {}
        self.agent_instances: Dict[int, BaseAgent] = {}
        self.stopped = False
    
    def get_ready_tasks(self, db: Session) -> List[Task]:
        tasks = db.query(Task).filter(
            Task.project_id == self.project_id,
            Task.status.in_([TaskStatus.READY, TaskStatus.PLANNED]),
            Task.assigned_agent_id.isnot(None)
        ).all()
        
        ready = []
        for task in tasks:
            if self._dependencies_met(task, db):
                ready.append(task)
        return ready
    
    def _dependencies_met(self, task: Task, db: Session) -> bool:
        if not task.dependencies:
            return True
        for dep_id in task.dependencies:
            dep = db.query(Task).filter(Task.id == dep_id).first()
            if not dep or dep.status != TaskStatus.COMPLETED:
                return False
        return True
    
    def get_available_agents(self, db: Session) -> List[Agent]:
        return db.query(Agent).filter(
            Agent.project_id == self.project_id,
            Agent.status.in_([AgentStatus.IDLE, AgentStatus.WAITING])
        ).all()
    
    async def start(self):
        self.stopped = False
        await self._run_loop()
    
    async def stop(self):
        self.stopped = True
        for task in self.running_tasks.values():
            task.cancel()
        await asyncio.gather(*self.running_tasks.values(), return_exceptions=True)
        self.running_tasks.clear()
    
    async def _run_loop(self):
        while not self.stopped:
            db = SessionLocal()
            try:
                ready_tasks = self.get_ready_tasks(db)
                available_agents = self.get_available_agents(db)
                
                for task in ready_tasks:
                    if len(self.running_tasks) >= self.max_parallel:
                        break
                    
                    agent = next((a for a in available_agents if a.id == task.assigned_agent_id), None)
                    if not agent:
                        continue
                    
                    if agent.id in [t.assigned_agent_id for t in self.running_tasks.values() if hasattr(t, 'assigned_agent_id')]:
                        continue
                    
                    await self._start_task(task, agent)
                
                await self._check_running_tasks()
                
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await emit_log(self.project_id, "error", f"Scheduler error: {e}")
            finally:
                db.close()
            
            await asyncio.sleep(2)
    
    async def _start_task(self, task: Task, agent: Agent):
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.utcnow()
        agent.status = AgentStatus.WORKING
        agent.current_task_id = task.id
        
        db = SessionLocal()
        try:
            db.merge(task)
            db.merge(agent)
            db.commit()
        finally:
            db.close()
        
        await emit_event(self.project_id, EventType.TASK_ASSIGNED, {"task_id": task.id, "title": task.title, "agent_id": agent.id}, agent.id, task.id)
        await emit_event(self.project_id, EventType.TASK_STARTED, {"task_id": task.id, "title": task.title, "agent_id": agent.id}, agent.id, task.id)
        await emit_task_update(self.project_id, task.id, "running", {"agent_id": agent.id})
        await emit_agent_status(self.project_id, agent.id, "working", {"task_id": task.id})
        
        context = AgentContext(
            project_id=self.project_id,
            agent_id=agent.id,
            workspace=self._get_workspace(db),
            task_id=task.id,
            permissions=agent.permissions
        )
        
        agent_instance = create_agent(agent, context)
        self.agent_instances[agent.id] = agent_instance
        
        asyncio_task = asyncio.create_task(self._run_agent_task(agent_instance, task))
        asyncio_task.assigned_agent_id = agent.id
        self.running_tasks[task.id] = asyncio_task
    
    def _get_workspace(self, db: Session) -> str:
        project = db.query(Project).filter(Project.id == self.project_id).first()
        return project.workspace_path if project else "."
    
    async def _run_agent_task(self, agent_instance: BaseAgent, task: Task):
        db = SessionLocal()
        try:
            result = await agent_instance.execute_task(task)
            
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.output = result
            
            db.merge(task)
            db.commit()
            
            await emit_event(self.project_id, EventType.TASK_COMPLETED, {"task_id": task.id, "result": result}, agent_instance.agent_model.id, task.id)
            
            await self._trigger_dependent_tasks(task.id)
            
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.retry_count += 1
            
            if task.retry_count < task.max_retries:
                task.status = TaskStatus.READY
                await emit_log(self.project_id, "warning", f"Task {task.id} failed, retrying ({task.retry_count}/{task.max_retries})", agent_instance.agent_model.id, task.id)
            else:
                await emit_log(self.project_id, "error", f"Task {task.id} failed permanently: {e}", agent_instance.agent_model.id, task.id)
                await emit_event(self.project_id, EventType.TASK_FAILED, {"task_id": task.id, "error": str(e)}, agent_instance.agent_model.id, task.id)
            
            db.merge(task)
            db.commit()
        finally:
            if task.id in self.running_tasks:
                del self.running_tasks[task.id]
            if agent_instance.agent_model.id in self.agent_instances:
                del self.agent_instances[agent_instance.agent_model.id]
            db.close()
    
    async def _check_running_tasks(self):
        done_tasks = []
        for task_id, asyncio_task in self.running_tasks.items():
            if asyncio_task.done():
                done_tasks.append(task_id)
        
        for task_id in done_tasks:
            del self.running_tasks[task_id]
    
    async def _trigger_dependent_tasks(self, completed_task_id: int):
        db = SessionLocal()
        try:
            dependent_tasks = db.query(Task).filter(
                Task.project_id == self.project_id,
                Task.dependencies.contains([completed_task_id])
            ).all()
            
            for task in dependent_tasks:
                if self._dependencies_met(task, db):
                    task.status = TaskStatus.READY
                    db.merge(task)
                    await emit_task_update(self.project_id, task.id, "ready")
            
            db.commit()
        finally:
            db.close()


class OrchestratorService:
    def __init__(self):
        self.schedulers: Dict[int, TaskScheduler] = {}
    
    async def start_project(self, project_id: int, max_parallel: int = 5):
        if project_id in self.schedulers:
            return
        
        scheduler = TaskScheduler(project_id, max_parallel)
        self.schedulers[project_id] = scheduler
        
        await self._initialize_orchestrator(project_id)
        # Start scheduler in background
        asyncio.create_task(scheduler.start())
    
    async def stop_project(self, project_id: int):
        if project_id in self.schedulers:
            await self.schedulers[project_id].stop()
            del self.schedulers[project_id]
        
        db = SessionLocal()
        try:
            agents = db.query(Agent).filter(Agent.project_id == project_id).all()
            for a in agents:
                a.status = AgentStatus.IDLE
                a.current_task_id = None
                db.merge(a)
                await emit_agent_status(project_id, a.id, "idle")

            running_tasks = db.query(Task).filter(
                Task.project_id == project_id,
                Task.status.in_([TaskStatus.RUNNING, TaskStatus.ASSIGNED])
            ).all()
            for t in running_tasks:
                t.status = TaskStatus.READY
                db.merge(t)
                await emit_task_update(project_id, t.id, "ready")

            db.commit()
        finally:
            db.close()
    
    async def stop_all(self):
        for scheduler in self.schedulers.values():
            await scheduler.stop()
        self.schedulers.clear()
    
    async def _initialize_orchestrator(self, project_id: int):
        db = SessionLocal()
        try:
            project = db.query(Project).filter(Project.id == project_id).first()
            if not project:
                return
            
            orchestrator = db.query(Agent).filter(
                Agent.project_id == project_id,
                Agent.role == AgentRole.ORCHESTRATOR
            ).first()
            
            if not orchestrator:
                orchestrator = Agent(
                    project_id=project_id,
                    role=AgentRole.ORCHESTRATOR,
                    name="Orchestrator",
                    runtime_type="subprocess",
                    capabilities=["planning", "delegation", "monitoring"],
                    permissions={"filesystem": "workspace", "terminal": "restricted"},
                    status=AgentStatus.IDLE
                )
                db.add(orchestrator)
                db.commit()
                db.refresh(orchestrator)
            
            # Ensure orchestrator agent status is reset to IDLE if stuck
            if orchestrator.status in [AgentStatus.ERROR, AgentStatus.WORKING, AgentStatus.THINKING]:
                orchestrator.status = AgentStatus.IDLE
                orchestrator.current_task_id = None
                db.merge(orchestrator)
                db.commit()

            context = AgentContext(
                project_id=project_id,
                agent_id=orchestrator.id,
                workspace=project.workspace_path,
                permissions=orchestrator.permissions
            )
            
            agent_instance = create_agent(orchestrator, context)
            self.schedulers[project_id].agent_instances[orchestrator.id] = agent_instance
            
            # Check for existing planning task to avoid duplicate task accumulation
            existing_planning_task = db.query(Task).filter(
                Task.project_id == project_id,
                Task.assigned_agent_id == orchestrator.id,
                Task.title == "Create project plan and task breakdown"
            ).order_by(Task.id.desc()).first()

            if existing_planning_task and existing_planning_task.status in [TaskStatus.READY, TaskStatus.ASSIGNED, TaskStatus.RUNNING]:
                planning_task = existing_planning_task
                if planning_task.status in [TaskStatus.ASSIGNED, TaskStatus.RUNNING]:
                    planning_task.status = TaskStatus.READY
                    db.merge(planning_task)
                    db.commit()
            elif existing_planning_task and existing_planning_task.status == TaskStatus.FAILED:
                # Retry the existing failed planning task cleanly
                existing_planning_task.status = TaskStatus.READY
                existing_planning_task.error = None
                existing_planning_task.retry_count = 0
                db.merge(existing_planning_task)
                db.commit()
                planning_task = existing_planning_task
                await emit_event(project_id, EventType.TASK_CREATED, {"task_id": planning_task.id, "title": planning_task.title}, orchestrator.id, planning_task.id)
                await emit_task_update(project_id, planning_task.id, "ready", {"title": planning_task.title})
            else:
                planning_task = Task(
                    project_id=project_id,
                    title="Create project plan and task breakdown",
                    description=f"Analyze the objective and create a detailed project plan with tasks, dependencies, and agent assignments.\n\nObjective: {project.objective}",
                    status=TaskStatus.READY,
                    priority="critical",
                    assigned_agent_id=orchestrator.id,
                    dependencies=[],
                    max_retries=2
                )
                db.add(planning_task)
                db.commit()
                db.refresh(planning_task)
                await emit_event(project_id, EventType.TASK_CREATED, {"task_id": planning_task.id, "title": planning_task.title}, orchestrator.id, planning_task.id)
                await emit_task_update(project_id, planning_task.id, "ready", {"title": planning_task.title})
            
        finally:
            db.close()


orchestrator_service = OrchestratorService()