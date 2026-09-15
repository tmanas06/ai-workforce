'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Brain, Bot, Cpu, Zap, Loader2, Play, Pause, RotateCcw, X, Settings, Trash2, Eye } from 'lucide-react';
import { cn, getRoleIcon, getRoleColor } from '../utils/helpers';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { AgentCard } from '../components/agents/AgentCard';
import { agentApi, projectApi } from '../services/api';
import { useWorkforceStore } from '../services/store';
import type { Agent, AgentRole, AgentCreate, Project } from '../types';

export function AgentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId) : null;
  
  const { agents: storeAgents, setAgents, agentStatuses, addAgent, updateAgent, removeAgent } = useWorkforceStore();
  const [agents, setLocalAgents] = useState<Agent[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<AgentCreate>({
    role: 'developer',
    name: '',
    runtime_type: 'subprocess',
    model_provider: '',
    model_name: '',
    capabilities: [],
    permissions: { filesystem: 'workspace', terminal: 'restricted', network: false, sudo: false },
  });

  const roles: { value: AgentRole; label: string; icon: string; color: string }[] = [
    { value: 'orchestrator', label: 'Orchestrator', icon: '🧠', color: 'bg-purple-500' },
    { value: 'architect', label: 'Architect', icon: '🏗️', color: 'bg-blue-500' },
    { value: 'researcher', label: 'Researcher', icon: '🔍', color: 'bg-green-500' },
    { value: 'developer', label: 'Developer', icon: '💻', color: 'bg-orange-500' },
    { value: 'qa', label: 'QA / Tester', icon: '🧪', color: 'bg-cyan-500' },
    { value: 'reviewer', label: 'Reviewer', icon: '👁️', color: 'bg-pink-500' },
  ];

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
      const [projectData, agentsData] = await Promise.all([
        projectApi.get(pid!),
        agentApi.list(pid!),
      ]);
      setProject(projectData);
      setLocalAgents(agentsData);
      setAgents(agentsData);
    } catch (error) {
      console.error('Failed to load agents:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const agent = await agentApi.create(pid!, formData);
      addAgent(agent);
      setLocalAgents(prev => [...prev, agent]);
      setShowCreateModal(false);
      setFormData({
        role: 'developer',
        name: '',
        runtime_type: 'subprocess',
        model_provider: '',
        model_name: '',
        capabilities: [],
        permissions: { filesystem: 'workspace', terminal: 'restricted', network: false, sudo: false },
      });
    } catch (error) {
      console.error('Failed to create agent:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this agent?')) return;
    try {
      await agentApi.delete(id);
      removeAgent(id);
      setLocalAgents(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleStart = async (id: number) => {
    try {
      await agentApi.update(id, { status: 'working' });
      loadData();
    } catch (error) {
      console.error('Failed to start agent:', error);
    }
  };

  const handleStop = async (id: number) => {
    try {
      await agentApi.update(id, { status: 'idle' });
      loadData();
    } catch (error) {
      console.error('Failed to stop agent:', error);
    }
  };

  const handleRestart = async (id: number) => {
    try {
      await agentApi.update(id, { status: 'working' });
      loadData();
    } catch (error) {
      console.error('Failed to restart agent:', error);
    }
  };

  const handleInspect = (agent: Agent) => {
    navigate(`/project/${pid}/agent/${agent.id}`);
  };

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
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground">Manage your AI workforce agents</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => {
          const roleInfo = roles.find(r => r.value === agent.role);
          const liveStatus = agentStatuses[agent.id] || agent.status;
          const currentTask = null; // Would need task data
          
          return (
            <AgentCard
              key={agent.id}
              agent={agent}
              currentTask={currentTask}
              onStart={() => handleStart(agent.id)}
              onStop={() => handleStop(agent.id)}
              onRestart={() => handleRestart(agent.id)}
              onInspect={() => handleInspect(agent)}
            />
          );
        })}
        {agents.length === 0 && (
          <div className="col-span-full bg-card border border-border rounded-xl p-12 text-center">
            <Bot className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
            <p className="text-muted-foreground mb-6">Add agents to build your workforce</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 mx-auto hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Agent
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Add New Agent</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map(role => (
                    <button
                      type="button"
                      key={role.value}
                      onClick={() => setFormData(prev => ({ ...prev, role: role.value, name: `${role.label}-${agents.filter(a => a.role === role.value).length + 1}` }))}
                      className={cn(
                        'p-3 rounded-lg border-2 transition-all text-left',
                        formData.role === role.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xl mb-2', role.color)}>
                        {role.icon}
                      </div>
                      <div className="font-medium">{role.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Runtime</label>
                  <select
                    value={formData.runtime_type}
                    onChange={e => setFormData(prev => ({ ...prev, runtime_type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="subprocess">Subprocess (Default)</option>
                    <option value="kilo">Kilo</option>
                    <option value="opencode">OpenCode</option>
                    <option value="custom_python">Custom Python</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Model Provider</label>
                  <select
                    value={formData.model_provider}
                    onChange={e => {
                      const provider = e.target.value;
                      const defaults: Record<string, string> = {
                        openrouter: 'Nex-N2.5-Pro',
                        opencode: 'Nemotron 3 Ultra',
                        experiential_labs: 'North Mini Code',
                        ollama: 'llama3.1:8b',
                        openai_compatible: 'gpt-4o-mini',
                      };
                      setFormData(prev => ({ ...prev, model_provider: provider, model_name: defaults[provider] || '' }));
                    }}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Select Provider --</option>
                    <option value="openrouter">OpenRouter (Nex-N2.5-Pro)</option>
                    <option value="opencode">OpenCode (Nemotron 3 Ultra)</option>
                    <option value="experiential_labs">Experiential Labs (North Mini Code)</option>
                    <option value="ollama">Ollama (Local)</option>
                    <option value="openai_compatible">OpenAI Compatible</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model Name</label>
                {formData.model_provider === 'openrouter' ? (
                  <select
                    value={formData.model_name}
                    onChange={e => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Nex-N2.5-Pro">Nex-N2.5-Pro ⭐</option>
                    <option value="anthropic/claude-3.5-sonnet">claude-3.5-sonnet</option>
                    <option value="openai/gpt-4o">gpt-4o</option>
                    <option value="openai/gpt-4o-mini">gpt-4o-mini</option>
                    <option value="meta-llama/llama-3.1-405b-instruct">llama-3.1-405b</option>
                    <option value="qwen/qwen-2.5-72b-instruct">qwen-2.5-72b</option>
                  </select>
                ) : formData.model_provider === 'opencode' ? (
                  <select
                    value={formData.model_name}
                    onChange={e => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Nemotron 3 Ultra">Nemotron 3 Ultra ⭐</option>
                    <option value="nvidia/nemotron-3-ultra-550b-a55b:free">nemotron-3-ultra-550b</option>
                  </select>
                ) : formData.model_provider === 'experiential_labs' ? (
                  <select
                    value={formData.model_name}
                    onChange={e => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="North Mini Code">North Mini Code ⭐</option>
                    <option value="north-mini-code">north-mini-code</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.model_name}
                    onChange={e => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. llama3.1:8b, gpt-4o"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capabilities (comma separated)</label>
                <input
                  type="text"
                  value={(formData.capabilities || []).join(', ')}
                  onChange={e => setFormData(prev => ({ ...prev, capabilities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="filesystem, terminal, git, testing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Permissions</label>
                <div className="space-y-2">
                  {[
                    { key: 'filesystem', label: 'Filesystem', options: ['readonly', 'workspace', 'full'] },
                    { key: 'terminal', label: 'Terminal', options: ['none', 'restricted', 'full'] },
                    { key: 'network', label: 'Network Access', type: 'bool' },
                    { key: 'sudo', label: 'Sudo Access', type: 'bool' },
                  ].map(perm => (
                    <div key={perm.key} className="flex items-center gap-3">
                      {perm.type === 'bool' ? (
                        <>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions?.[perm.key] ?? false}
                              onChange={e => setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [perm.key]: e.target.checked } }))}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-sm">{perm.label}</span>
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="text-sm w-24">{perm.label}</label>
                          <select
                            value={formData.permissions?.[perm.key] || ''}
                            onChange={e => setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [perm.key]: e.target.value } }))}
                            className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            {perm.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </>
                      )}
                    </div>
                  ))}
                </div>
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
                  {creating ? 'Creating...' : 'Add Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}