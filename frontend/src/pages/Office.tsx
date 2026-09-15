'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { VirtualOffice } from '../components/office/VirtualOffice';
import { OfficeControls } from '../components/office/OfficeControls';
import { AgentInspectorDrawer } from '../components/office/AgentInspectorDrawer';
import { useWorkforceStore } from '../services/store';
import { agentApi, workforceApi } from '../services/api';
import type { Agent } from '../types';
import { Loader2, Users, Activity, Sparkles } from 'lucide-react';

export function OfficePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const parsedProjectId = projectId ? parseInt(projectId) : 1;

  const { agents, setAgents } = useWorkforceStore();
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [officeMode, setOfficeMode] = useState<'work' | 'meeting' | 'break'>('work');
  const [viewMode, setViewMode] = useState<'2d' | 'isometric'>('2d');

  useEffect(() => {
    loadAgents();
  }, [parsedProjectId]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await agentApi.list(parsedProjectId);
      setAgents(data);
    } catch (e) {
      console.error('Failed to load agents:', e);
      // Fallback default agents if none created yet
      setAgents(DEFAULT_AGENTS);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkforce = async () => {
    try {
      await workforceApi.start(parsedProjectId, 5);
      setIsRunning(true);
    } catch (e) {
      console.error('Failed to start workforce:', e);
      setIsRunning(true);
    }
  };

  const handleStopWorkforce = async () => {
    try {
      await workforceApi.stop(parsedProjectId);
      setIsRunning(false);
    } catch (e) {
      console.error('Failed to stop workforce:', e);
      setIsRunning(false);
    }
  };

  const displayAgents = agents.length > 0 ? agents : DEFAULT_AGENTS;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Top Title & Stats Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Virtual Office Playground <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Watch AI agents collaborate, code, hold team meetings, and roam around their virtual office floor.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-xl">
            <Users className="w-4 h-4 text-primary" />
            <span>Active Agents: <strong className="text-foreground">{displayAgents.length}</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-xl">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Status: <strong className={isRunning ? 'text-emerald-400' : 'text-slate-400'}>{isRunning ? 'Running' : 'Idle'}</strong></span>
          </div>
        </div>
      </div>

      {/* Office Controls */}
      <OfficeControls
        officeMode={officeMode}
        onChangeOfficeMode={setOfficeMode}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        isWorkforceRunning={isRunning}
        onStartWorkforce={handleStartWorkforce}
        onStopWorkforce={handleStopWorkforce}
      />

      {/* Canvas Interactive Virtual Office */}
      <VirtualOffice
        agents={displayAgents}
        activeAgentId={selectedAgent?.id || null}
        onSelectAgent={(agent) => setSelectedAgent(agent)}
        officeMode={officeMode}
        viewMode={viewMode}
      />

      {/* Slide-over Agent Inspector Drawer */}
      <AgentInspectorDrawer
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 101,
    project_id: 1,
    role: 'orchestrator',
    name: 'Atlas (Orchestrator)',
    runtime_type: 'subprocess',
    status: 'working',
    model_provider: 'openrouter',
    model_name: 'Nex-N2.5-Pro',
    capabilities: ['orchestration', 'planning'],
    permissions: {},
    current_task_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 102,
    project_id: 1,
    role: 'architect',
    name: 'DaVinci (Architect)',
    runtime_type: 'subprocess',
    status: 'thinking',
    model_provider: 'opencode',
    model_name: 'Nemotron 3 Ultra',
    capabilities: ['system_design', 'schemas'],
    permissions: {},
    current_task_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 103,
    project_id: 1,
    role: 'developer',
    name: 'CoderPro (Lead Dev)',
    runtime_type: 'subprocess',
    status: 'working',
    model_provider: 'experiential_labs',
    model_name: 'North Mini Code',
    capabilities: ['filesystem', 'terminal', 'git'],
    permissions: {},
    current_task_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 104,
    project_id: 1,
    role: 'qa',
    name: 'Sentinel (QA Tester)',
    runtime_type: 'subprocess',
    status: 'working',
    model_provider: 'openrouter',
    model_name: 'claude-3.5-sonnet',
    capabilities: ['testing', 'automation'],
    permissions: {},
    current_task_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
