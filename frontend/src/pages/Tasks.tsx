'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Loader2, Filter, X, ChevronDown, ChevronUp, ArrowUpDown, Clock, AlertTriangle, CheckCircle, XCircle, Loader2 as LoaderIcon, GitBranch } from 'lucide-react';
import { cn, formatRelativeTime, getStatusColor, getPriorityColor } from '../utils/helpers';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { TaskCard } from '../components/tasks/TaskCard';
import { taskApi, projectApi, agentApi } from '../services/api';
import { useWorkforceStore } from '../services/store';
import type { Task, TaskStatus, TaskPriority, Agent } from '../types';

export function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId) : null;
  
  const { tasks: storeTasks, setTasks, taskStatuses, addTask, updateTask, removeTask } = useWorkforceStore();
  const [tasks, setLocalTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<any>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterAgent, setFilterAgent] = useState<number | 'all'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    parent_task_id: undefined as number | undefined,
    assigned_agent_id: undefined as number | undefined,
    dependencies: [] as number[],
  });

  const statuses: TaskStatus[] = ['backlog', 'planned', 'ready', 'assigned', 'running', 'blocked', 'review', 'failed', 'completed', 'cancelled'];

  useEffect(() => {
    if (!pid) {
      navigate('/');
      return;
    }
    loadData();
  }, [pid, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectData, tasksData, agentsData] = await Promise.all([
        projectApi.get(pid!),
        taskApi.list(pid!),
        agentApi.list(pid!),
      ]);
      setProject(projectData);
      setLocalTasks(tasksData);
      setAgents(agentsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const task = await taskApi.create(pid!, formData);
      addTask(task);
      setLocalTasks(prev => [...prev, task]);
      setShowCreateModal(false);
      setFormData({ title: '', description: '', priority: 'medium', parent_task_id: undefined, assigned_agent_id: undefined, dependencies: [] });
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (taskId: number, status: TaskStatus) => {
    try {
      await taskApi.update(taskId, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleCancelTask = async (id: number) => {
    try {
      await taskApi.cancel(id);
      loadData();
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const handleRetryTask = async (id: number) => {
    try {
      await taskApi.retry(id);
      loadData();
    } catch (error) {
      console.error('Failed to retry task:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    try {
      await taskApi.delete(id);
      removeTask(id);
      setLocalTasks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const filteredTasks = tasks.filter(t => !t.parent_task_id)
    .filter(t => filterStatus === 'all' || t.status === filterStatus)
    .filter(t => filterAgent === 'all' || t.assigned_agent_id === filterAgent);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Manage project tasks and dependencies</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="all">All Statuses</option>
              {statuses.map(s => (
                <option key={s} value={s}>
                  <StatusIndicator status={s} size="sm" showLabel />
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            <select
              value={filterAgent}
              onChange={e => setFilterAgent(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="all">All Agents</option>
              {agents.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onCancel={handleCancelTask}
            onRetry={handleRetryTask}
            onDelete={handleDelete}
          />
        ))}
        {filteredTasks.length === 0 && tasks.length > 0 && (
          <div className="text-center text-muted-foreground py-8">
            No tasks match the current filters
          </div>
        )}
        {tasks.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <FolderKanban className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No tasks yet</h2>
            <p className="text-muted-foreground mb-6">Tasks will be created by the Orchestrator when you start the workforce</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 mx-auto hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Task Manually
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Create New Task</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Assigned Agent</label>
                  <select
                    value={formData.assigned_agent_id || ''}
                    onChange={e => setFormData(prev => ({ ...prev, assigned_agent_id: e.target.value ? parseInt(e.target.value) : undefined }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Parent Task (optional)</label>
                <select
                  value={formData.parent_task_id || ''}
                  onChange={e => setFormData(prev => ({ ...prev, parent_task_id: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">None</option>
                  {tasks.filter(t => !t.parent_task_id).map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Dependencies (comma-separated task IDs)</label>
                <input
                  type="text"
                  value={formData.dependencies.join(', ')}
                  onChange={e => setFormData(prev => ({ ...prev, dependencies: e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1, 2, 3"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}