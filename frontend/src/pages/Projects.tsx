'use client';

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Play, Trash2, Edit, MoreVertical, Loader2, Archive, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn, formatRelativeTime, getStatusColor } from '../utils/helpers';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { projectApi } from '../services/api';
import type { Project, ProjectStatus } from '../types';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', objective: '', workspace_path: '' });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectApi.list();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const project = await projectApi.create(formData);
      setProjects(prev => [project, ...prev]);
      setShowCreateModal(false);
      setFormData({ name: '', objective: '', workspace_path: '' });
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectApi.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4 text-green-500" />;
      case 'paused': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'archived': return <Archive className="w-4 h-4 text-gray-500" />;
      default: return <FolderKanban className="w-4 h-4 text-gray-500" />;
    }
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
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your AI workforce projects</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FolderKanban className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
          <p className="text-muted-foreground mb-6">Create your first AI workforce project to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 mx-auto hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <Link key={project.id} to={`/project/${project.id}`} className="group">
              <div className="bg-card border border-border rounded-xl p-6 transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FolderKanban className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.workspace_path}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusIndicator status={project.status} size="sm" showLabel />
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.objective}</p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {formatRelativeTime(project.created_at)}</span>
                  <span>Updated {formatRelativeTime(project.updated_at)}</span>
                </div>
              </div>
              </Link>
            ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md animate-slide-up">
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Linux Desktop Customizer"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Objective</label>
                <textarea
                  value={formData.objective}
                  onChange={e => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Build a modern Linux desktop customization application with drag-and-drop widgets."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Workspace Path (optional)</label>
                <input
                  type="text"
                  value={formData.workspace_path}
                  onChange={e => setFormData(prev => ({ ...prev, workspace_path: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="~/AIWorkforce/workspaces/my-project"
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
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}