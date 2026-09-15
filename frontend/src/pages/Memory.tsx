'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Brain, Database, Plus, Edit2, Trash2, Download, RefreshCw, Copy, Search, X } from 'lucide-react';
import { cn, formatRelativeTime } from '../utils/helpers';
import { projectApi, agentMemoryApi, projectMemoryApi } from '../services/api';
import { useWorkforceStore } from '../services/store';
import type { Project, AgentMemory, ProjectMemory } from '../types';

export function MemoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId) : null;
  
  const [project, setProject] = useState<Project | null>(null);
  const [projectMemories, setProjectMemories] = useState<ProjectMemory[]>([]);
  const [agentMemories, setAgentMemories] = useState<Record<number, AgentMemory[]>>({});
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState<{ agentId: number; agentName: string } | null>(null);
  const [editingMemory, setEditingMemory] = useState<{ type: 'project' | 'agent'; agentId?: number; key: string; value: any } | null>(null);
  const [formData, setFormData] = useState({ key: '', value: '' });

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
      const [projectData, pMemories] = await Promise.all([
        projectApi.get(pid!),
        projectMemoryApi.list(pid!),
      ]);
      setProject(projectData);
      setProjectMemories(pMemories);
      
      // Load agent memories
      const agents = projectData.agents || [];
      for (const agent of agents) {
        try {
          const memories = await agentMemoryApi.list(agent.id);
          setAgentMemories(prev => ({ ...prev, [agent.id]: memories }));
        } catch (e) {
          console.error(`Failed to load memories for agent ${agent.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to load memory:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectMemorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedValue: any;
      try {
        parsedValue = JSON.parse(formData.value);
      } catch {
        parsedValue = formData.value;
      }
      
      await projectMemoryApi.set(pid!, { key: formData.key, value: parsedValue });
      loadData();
      setShowProjectModal(false);
      setFormData({ key: '', value: '' });
    } catch (error) {
      console.error('Failed to save project memory:', error);
    }
  };

  const handleAgentMemorySubmit = async (e: React.FormEvent) => {
    if (!showAgentModal) return;
    e.preventDefault();
    try {
      let parsedValue: any;
      try {
        parsedValue = JSON.parse(formData.value);
      } catch {
        parsedValue = formData.value;
      }
      
      await agentMemoryApi.set(showAgentModal.agentId, { key: formData.key, value: parsedValue });
      loadData();
      setShowAgentModal(null);
      setFormData({ key: '', value: '' });
    } catch (error) {
      console.error('Failed to save agent memory:', error);
    }
  };

  const handleEdit = (type: 'project' | 'agent', key: string, value: any, agentId?: number) => {
    setEditingMemory({ type, agentId, key, value });
    setFormData({ key, value: JSON.stringify(value, null, 2) });
    if (type === 'project') setShowProjectModal(true);
    else if (agentId) setShowAgentModal({ agentId, agentName: `Agent #${agentId}` });
  };

  const handleDelete = async (type: 'project' | 'agent', key: string, agentId?: number) => {
    if (!confirm(`Delete memory key "${key}"?`)) return;
    // Note: DELETE endpoints not implemented in backend yet
    console.log('Delete not implemented yet');
  };

  const handleCopy = (value: any) => {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
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
          <h1 className="text-2xl font-bold">Memory</h1>
          <p className="text-muted-foreground">Agent and project persistent memory</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={() => setShowProjectModal(true)} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Project Memory
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Database className="w-5 h-5" />
              Project Memory ({projectMemories.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {projectMemories.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No project memories yet. Click "Project Memory" to add.
              </div>
            ) : (
              projectMemories.map(memory => (
                <div key={memory.key} className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{memory.key}</code>
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(memory.created_at)}</span>
                      </div>
                      <pre className="text-sm text-muted-foreground max-h-32 overflow-y-auto font-mono">
                        {JSON.stringify(memory.value, null, 2)}
                      </pre>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleCopy(memory.value)} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors" title="Copy">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleEdit('project', memory.key, memory.value)} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors" title="Edit">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDelete('project', memory.key)} className="p-1 rounded hover:bg-accent text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Agent Memories
          </h3>
          <div className="space-y-4">
            {Object.entries(agentMemories).length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No agent memories yet. Memories are created when agents run.
              </div>
            ) : (
              Object.entries(agentMemories).map(([agentId, memories]) => (
                <div key={agentId} className="border border-border rounded-lg overflow-hidden">
                  <div className="p-3 bg-muted/50 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">Agent #{agentId}</span>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded">{memories.length} entries</span>
                    </div>
                    <button onClick={() => setShowAgentModal({ agentId: parseInt(agentId), agentName: `Agent #${agentId}` })} className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </button>
                  </div>
                  <div className="p-3 max-h-64 overflow-y-auto">
                    {memories.length === 0 ? (
                      <div className="text-center text-muted-foreground py-4">No memories</div>
                    ) : (
                      memories.map(memory => (
                        <div key={memory.key} className="p-2 bg-muted/30 rounded mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{memory.key}</code>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleCopy(memory.value)} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors" title="Copy">
                                <Copy className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleEdit('agent', memory.key, memory.value, parseInt(agentId))} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors" title="Edit">
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <pre className="text-xs text-muted-foreground max-h-24 overflow-y-auto font-mono">
                            {JSON.stringify(memory.value, null, 2)}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {(showProjectModal || showAgentModal || editingMemory) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingMemory ? 'Edit Memory' : showProjectModal ? 'Add Project Memory' : 'Add Agent Memory'}
            </h2>
            <form onSubmit={showProjectModal || editingMemory?.type === 'project' ? handleProjectMemorySubmit : handleAgentMemorySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Key</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={e => setFormData(prev => ({ ...prev, key: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!!editingMemory}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Value (JSON)</label>
                <textarea
                  value={formData.value}
                  onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  rows={10}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowProjectModal(false); setShowAgentModal(null); setEditingMemory(null); setFormData({ key: '', value: '' }); }} className="px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
                  {editingMemory ? 'Save Changes' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}