'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Play, Square, RefreshCw, Brain, Users, FolderKanban, TrendingUp, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn, formatRelativeTime, getStatusColor } from '../utils/helpers';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { AgentCard } from '../components/agents/AgentCard';
import { TaskCard } from '../components/tasks/TaskCard';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { useWorkforceStore } from '../services/store';
import { projectApi, agentApi, taskApi, eventApi, workforceApi } from '../services/api';
import { wsService } from '../services/websocket';
import type { Project, Agent, Task, Event } from '../types';

export function Dashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId) : null;
  
  const {
    currentProject,
    agents,
    tasks,
    events,
    logs,
    agentStatuses,
    taskStatuses,
    isConnected,
    setCurrentProject,
    setAgents,
    setTasks,
    addEvent,
    addLog,
    setConnected,
    initializeWebSocket,
    disconnectWebSocket,
  } = useWorkforceStore();

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    if (!pid) {
      navigate('/');
      return;
    }

    let mounted = true;
    let unsub: (() => void) | null = null;

    const loadData = async () => {
      setLoading(true);
      try {
        const [project, agentsData, tasksData, eventsData] = await Promise.all([
          projectApi.get(pid),
          agentApi.list(pid),
          taskApi.list(pid),
          eventApi.list(pid, { limit: 100 }),
        ]);
        
        if (!mounted) return;
        
        setCurrentProject(project);
        setAgents(agentsData);
        setTasks(tasksData);
        eventsData.forEach(addEvent);
        
        unsub = initializeWebSocket(pid);
        setConnected(true);
      } catch (error) {
        console.error('Failed to load project:', error);
        navigate('/');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
      if (unsub) {
        unsub();
      }
      disconnectWebSocket();
    };
  }, [pid, navigate, setCurrentProject, setAgents, setTasks, addEvent, initializeWebSocket, disconnectWebSocket, setConnected]);

  const handleStartWorkforce = async () => {
    if (!pid) return;
    setStarting(true);
    try {
      await workforceApi.start(pid, 5);
    } catch (error) {
      console.error('Failed to start workforce:', error);
    } finally {
      setStarting(false);
    }
  };

  const handleStopWorkforce = async () => {
    if (!pid) return;
    setStopping(true);
    try {
      await workforceApi.stop(pid);
    } catch (error) {
      console.error('Failed to stop workforce:', error);
    } finally {
      setStopping(false);
    }
  };

  const handleRefresh = async () => {
    if (!pid) return;
    try {
      const [agentsData, tasksData] = await Promise.all([
        agentApi.list(pid),
        taskApi.list(pid),
      ]);
      setAgents(agentsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <p className="text-muted-foreground">The project may have been deleted.</p>
        </div>
      </div>
    );
  }

  const runningAgents = agents.filter(a => ['working', 'thinking', 'waiting', 'review'].includes(agentStatuses[a.id] || a.status)).length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  const runningTasks = tasks.filter(t => t.status === 'running').length;

  const agentRoleGroups = agents.reduce((acc, agent) => {
    const role = agent.role;
    if (!acc[role]) acc[role] = [];
    acc[role].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{currentProject.name}</h1>
          <p className="text-muted-foreground">{currentProject.objective}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleStartWorkforce}
            disabled={starting || stopping}
            className={cn(
              'px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors',
              'bg-green-500 text-green-500-foreground hover:bg-green-600 disabled:opacity-50'
            )}
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {starting ? 'Starting...' : 'Start Workforce'}
          </button>
          <button
            onClick={handleStopWorkforce}
            disabled={starting || stopping}
            className={cn(
              'px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors',
              'bg-red-500 text-red-500-foreground hover:bg-red-600 disabled:opacity-50'
            )}
          >
            {stopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            {stopping ? 'Stopping...' : 'Stop All'}
          </button>
        </div>
      </div>

      {/* Virtual Office Playground CTA Banner */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 border border-purple-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Users className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              Virtual Office Playground 🎮
            </h3>
            <p className="text-sm text-muted-foreground">
              Watch your AI agents roam around, sit at desks, hold team meetings, and collaborate live in 2D floor view!
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/project/${pid}/office`)}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
        >
          Open Agent Playground &rarr;
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Agents Active</p>
              <p className="text-3xl font-bold">{runningAgents}/{agents.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tasks Total</p>
              <p className="text-3xl font-bold">{totalTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold text-green-500">{completedTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-3xl font-bold text-red-500">{failedTasks}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Agent Workforce
              </h2>
              <StatusIndicator status={isConnected ? 'working' : 'offline'} size="sm" showLabel />
            </div>
            <div className="p-4 space-y-4">
              {Object.entries(agentRoleGroups).map(([role, roleAgents]) => (
                <div key={role} className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', getStatusColor(role))} />
                    {role.charAt(0).toUpperCase() + role.slice(1)}s ({roleAgents.length})
                  </h3>
                  <div className="space-y-2">
                    {roleAgents.map(agent => {
                      const currentTask = tasks.find(t => t.assigned_agent_id === agent.id && t.status === 'running');
                      return (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          currentTask={currentTask || null}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              {agents.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No agents created yet. Go to Agents page to add agents.
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <FolderKanban className="w-5 h-5" />
                Task Pipeline
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Running: {runningTasks}</span>
              </div>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {tasks.filter(t => !t.parent_task_id).map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasks.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No tasks yet. The Orchestrator will create tasks when workforce starts.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <ActivityFeed events={events} logs={logs} autoScroll />
          
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Quick Stats
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project Status</span>
                <StatusIndicator status={currentProject.status} showLabel />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Workspace</span>
                <span className="font-mono text-xs truncate max-w-[150px]">{currentProject.workspace_path}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatRelativeTime(currentProject.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatRelativeTime(currentProject.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}