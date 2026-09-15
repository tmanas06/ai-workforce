import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Agent, Task, Event, LogEntry, AgentStatus, TaskStatus } from '../types';
import { wsService } from './websocket';

interface WorkforceState {
  projects: Project[];
  currentProject: Project | null;
  agents: Agent[];
  tasks: Task[];
  events: Event[];
  logs: LogEntry[];
  agentStatuses: Record<number, AgentStatus>;
  taskStatuses: Record<number, TaskStatus>;
  isConnected: boolean;
  activeApprovals: Record<number, { agentId: number; action: string; command: string; reason: string }>;
  
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  removeProject: (id: number) => void;
  setCurrentProject: (project: Project | null) => void;
  
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agent: Agent) => void;
  removeAgent: (id: number) => void;
  setAgentStatus: (agentId: number, status: AgentStatus, details?: any) => void;
  
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  removeTask: (id: number) => void;
  setTaskStatus: (taskId: number, status: TaskStatus, details?: any) => void;
  
  addEvent: (event: Event) => void;
  addLog: (log: LogEntry) => void;
  clearLogs: () => void;
  
  setConnected: (connected: boolean) => void;
  addApproval: (id: number, approval: { agentId: number; action: string; command: string; reason: string }) => void;
  removeApproval: (id: number) => void;
  
  initializeWebSocket: (projectId: number) => (() => void) | null;
  disconnectWebSocket: () => void;
}

export const useWorkforceStore = create<WorkforceState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      agents: [],
      tasks: [],
      events: [],
      logs: [],
      agentStatuses: {},
      taskStatuses: {},
      isConnected: false,
      activeApprovals: {},
      
      setProjects: (projects) => set({ projects }),
      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (project) => set((state) => ({
        projects: state.projects.map(p => p.id === project.id ? project : p),
        currentProject: state.currentProject?.id === project.id ? project : state.currentProject,
      })),
      removeProject: (id) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
      })),
      setCurrentProject: (project) => set({ currentProject: project }),
      
      setAgents: (agents) => set({ agents }),
      addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
      updateAgent: (agent) => set((state) => ({
        agents: state.agents.map(a => a.id === agent.id ? agent : a),
      })),
      removeAgent: (id) => set((state) => ({
        agents: state.agents.filter(a => a.id !== id),
      })),
      setAgentStatus: (agentId, status, details) => set((state) => ({
        agentStatuses: { ...state.agentStatuses, [agentId]: status },
        agents: state.agents.map(a => a.id === agentId ? { ...a, status } : a),
      })),
      
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (task) => set((state) => ({
        tasks: state.tasks.map(t => t.id === task.id ? task : t),
      })),
      removeTask: (id) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id),
      })),
      setTaskStatus: (taskId, status, details) => set((state) => ({
        taskStatuses: { ...state.taskStatuses, [taskId]: status },
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, status } : t),
      })),
      
      addEvent: (event) => set((state) => ({
        events: [event, ...state.events].slice(0, 500),
      })),
      addLog: (log) => set((state) => ({
        logs: [log, ...state.logs].slice(0, 1000),
      })),
      clearLogs: () => set({ logs: [] }),
      
      setConnected: (connected) => set({ isConnected: connected }),
      
      addApproval: (id, approval) => set((state) => ({
        activeApprovals: { ...state.activeApprovals, [id]: approval },
      })),
      removeApproval: (id) => set((state) => {
        const { [id]: _, ...rest } = state.activeApprovals;
        return { activeApprovals: rest };
      }),
      
      initializeWebSocket: (projectId) => {
        const unsubscribe = wsService.subscribe((message) => {
          const state = get();
          
          switch (message.type) {
            case 'event':
              if (message.project_id === projectId) {
                state.addEvent(message as unknown as Event);
              }
              break;
            case 'agent_status':
              if (message.project_id === projectId) {
                state.setAgentStatus(message.agent_id, message.status, message.details);
              }
              break;
            case 'task_update':
              if (message.project_id === projectId) {
                state.setTaskStatus(message.task_id, message.status, message.details);
              }
              break;
            case 'log':
              if (message.project_id === projectId) {
                state.addLog(message as unknown as LogEntry);
              }
              break;
          }
        });
        
        wsService.connect(projectId);
        set({ isConnected: true });
        
        return unsubscribe;
      },
      
      disconnectWebSocket: () => {
        wsService.disconnect();
        set({ isConnected: false });
      },
    }),
    {
      name: 'workforce-store',
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject,
      }),
    }
  )
);