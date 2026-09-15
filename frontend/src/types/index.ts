export type ProjectStatus = 'active' | 'paused' | 'completed' | 'failed' | 'archived';
export type AgentRole = 'orchestrator' | 'architect' | 'researcher' | 'developer' | 'qa' | 'reviewer';
export type AgentStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'review' | 'error' | 'offline';
export type RuntimeType = 'kilo' | 'opencode' | 'custom_python' | 'subprocess';
export type TaskStatus = 'backlog' | 'planned' | 'ready' | 'assigned' | 'running' | 'blocked' | 'review' | 'failed' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

export type EventType = 
  | 'agent.created' | 'agent.started' | 'agent.stopped' | 'agent.thinking' | 'agent.tool_called' | 'agent.file_changed'
  | 'task.created' | 'task.assigned' | 'task.started' | 'task.blocked' | 'task.failed' | 'task.completed' | 'task.reassigned'
  | 'review.started' | 'review.failed' | 'review.passed'
  | 'model.requested' | 'model.started' | 'model.failed' | 'model.fallback'
  | 'human.approval_required' | 'human.approved' | 'human.rejected';

export interface ProjectCreate {
  name: string;
  objective: string;
  workspace_path?: string;
}

export interface ProjectUpdate {
  name?: string;
  objective?: string;
  status?: ProjectStatus;
}

export interface AgentCreate {
  role: AgentRole;
  name: string;
  runtime_type?: RuntimeType;
  model_provider?: string;
  model_name?: string;
  capabilities?: string[];
  permissions?: Record<string, any>;
}

export interface AgentUpdate {
  role?: AgentRole;
  name?: string;
  runtime_type?: RuntimeType;
  model_provider?: string;
  model_name?: string;
  capabilities?: string[];
  permissions?: Record<string, any>;
  status?: AgentStatus;
  current_task_id?: number | null;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority?: TaskPriority;
  parent_task_id?: number;
  assigned_agent_id?: number;
  dependencies?: number[];
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_agent_id?: number | null;
  dependencies?: number[];
  output?: Record<string, any> | null;
  error?: string | null;
  review_status?: ReviewStatus;
  review_notes?: string | null;
  retry_count?: number;
}

export interface EventCreate {
  event_type: EventType;
  agent_id?: number;
  task_id?: number;
  payload?: Record<string, any> | null;
}

export interface AgentMemoryCreate {
  key: string;
  value?: Record<string, any> | null;
}

export interface ProjectMemoryCreate {
  key: string;
  value?: Record<string, any> | null;
}

export interface ModelMetricCreate {
  provider: string;
  model: string;
  task_type?: string | null;
  success: boolean;
  latency_ms?: number | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
  cost_usd?: string | null;
  error?: string | null;
}

export interface Project {
  id: number;
  name: string;
  objective: string;
  workspace_path: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  agents?: Agent[];
}

export interface Agent {
  id: number;
  project_id: number;
  role: AgentRole;
  name: string;
  runtime_type: RuntimeType;
  model_provider: string | null;
  model_name: string | null;
  capabilities: string[];
  permissions: Record<string, any>;
  status: AgentStatus;
  current_task_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  parent_task_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_agent_id: number | null;
  dependencies: number[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  output: Record<string, any> | null;
  error: string | null;
  review_status: ReviewStatus;
  review_notes: string | null;
  retry_count: number;
  max_retries: number;
  subtasks?: Task[];
}

export interface Event {
  id: number;
  project_id: number;
  agent_id: number | null;
  task_id: number | null;
  event_type: EventType;
  payload: Record<string, any> | null;
  timestamp: string;
}

export interface AgentMemory {
  id: number;
  agent_id: number;
  key: string;
  value: Record<string, any> | null;
  created_at: string;
}

export interface ProjectMemory {
  id: number;
  project_id: number;
  key: string;
  value: Record<string, any> | null;
  created_at: string;
}

export interface ModelMetric {
  id: number;
  provider: string;
  model: string;
  task_type: string | null;
  success: boolean;
  latency_ms: number | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: string | null;
  error: string | null;
  timestamp: string;
}

export interface WorkspaceFile {
  name: string;
  type: 'file' | 'directory';
  size: number;
  path: string;
}

export interface WebSocketMessage {
  type: 'event' | 'agent_status' | 'task_update' | 'log' | 'pong';
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  agent_id: number | null;
  task_id: number | null;
}

export interface ApprovalRequest {
  agent_id: number;
  action: string;
  command: string;
  reason: string;
}

export interface ApprovalResponse {
  approved: boolean;
  reason?: string;
}