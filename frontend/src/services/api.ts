import axios from 'axios';
import type {
  Project, ProjectCreate, ProjectUpdate,
  Agent, AgentCreate, AgentUpdate,
  Task, TaskCreate, TaskUpdate,
  Event, EventCreate,
  AgentMemory, AgentMemoryCreate,
  ProjectMemory, ProjectMemoryCreate,
  ModelMetric, ModelMetricCreate,
  ApprovalRequest, ApprovalResponse
} from '../types';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export const projectApi = {
  list: (params?: { status?: string; skip?: number; limit?: number }) =>
    api.get<Project[]>('/projects', { params }).then(r => r.data),
  get: (id: number) => api.get<Project>(`/projects/${id}`).then(r => r.data),
  create: (data: ProjectCreate) => api.post<Project>('/projects', data).then(r => r.data),
  update: (id: number, data: ProjectUpdate) => api.patch<Project>(`/projects/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/projects/${id}`).then(r => r.data),
};

export const agentApi = {
  list: (projectId: number) => api.get<Agent[]>(`/projects/${projectId}/agents`).then(r => r.data),
  get: (id: number) => api.get<Agent>(`/agents/${id}`).then(r => r.data),
  create: (projectId: number, data: AgentCreate) => api.post<Agent>(`/projects/${projectId}/agents`, data).then(r => r.data),
  update: (id: number, data: AgentUpdate) => api.patch<Agent>(`/agents/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/agents/${id}`).then(r => r.data),
};

export const taskApi = {
  list: (projectId: number, params?: { status?: string; assigned_agent_id?: number }) =>
    api.get<Task[]>(`/projects/${projectId}/tasks`, { params }).then(r => r.data),
  get: (id: number) => api.get<Task>(`/tasks/${id}`).then(r => r.data),
  create: (projectId: number, data: TaskCreate) => api.post<Task>(`/projects/${projectId}/tasks`, data).then(r => r.data),
  update: (id: number, data: TaskUpdate) => api.patch<Task>(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/tasks/${id}`).then(r => r.data),
};

export const eventApi = {
  list: (projectId: number, params?: { agent_id?: number; task_id?: number; event_type?: string; limit?: number }) =>
    api.get<Event[]>(`/projects/${projectId}/events`, { params }).then(r => r.data),
  create: (projectId: number, data: EventCreate) => api.post<Event>(`/projects/${projectId}/events`, data).then(r => r.data),
};

export const agentMemoryApi = {
  list: (agentId: number) => api.get<AgentMemory[]>(`/agents/${agentId}/memory`).then(r => r.data),
  set: (agentId: number, data: AgentMemoryCreate) => api.post<AgentMemory>(`/agents/${agentId}/memory`, data).then(r => r.data),
};

export const projectMemoryApi = {
  list: (projectId: number) => api.get<ProjectMemory[]>(`/projects/${projectId}/memory`).then(r => r.data),
  set: (projectId: number, data: ProjectMemoryCreate) => api.post<ProjectMemory>(`/projects/${projectId}/memory`, data).then(r => r.data),
};

export const modelMetricApi = {
  list: (params?: { provider?: string; model?: string; limit?: number }) =>
    api.get<ModelMetric[]>('/model-metrics', { params }).then(r => r.data),
  create: (data: ModelMetricCreate) => api.post<ModelMetric>('/model-metrics', data).then(r => r.data),
};

export const workforceApi = {
  start: (projectId: number, maxParallel: number = 5) =>
    api.post('/workforce/start', { project_id: projectId, max_parallel_agents: maxParallel }).then(r => r.data),
  stop: (projectId: number) => api.post('/workforce/stop', { project_id: projectId }).then(r => r.data),
  stopAll: () => api.post('/workforce/stop-all').then(r => r.data),
};

export const approvalApi = {
  request: (data: ApprovalRequest) => api.post<ApprovalResponse>('/approvals/request', data).then(r => r.data),
  respond: (requestId: number, data: ApprovalResponse) => api.post<ApprovalResponse>(`/approvals/${requestId}/respond`, data).then(r => r.data),
};

export default api;