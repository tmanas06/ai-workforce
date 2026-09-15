'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Trash2, Download, Filter, X } from 'lucide-react';
import { cn, formatRelativeTime } from '../utils/helpers';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { eventApi, projectApi } from '../services/api';
import { useWorkforceStore } from '../services/store';
import type { Event, Project } from '../types';

export function ActivityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId) : null;
  
  const { events, logs, addEvent, addLog, clearLogs } = useWorkforceStore();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showLogs, setShowLogs] = useState(true);
  const [filter, setFilter] = useState('');

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
      const [projectData, eventsData] = await Promise.all([
        projectApi.get(pid!),
        eventApi.list(pid!, { limit: 500 }),
      ]);
      setProject(projectData);
      eventsData.forEach(addEvent);
    } catch (error) {
      console.error('Failed to load activity:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const data = {
      project: project,
      events: events,
      logs: logs,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-${project?.name || 'project'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-muted-foreground">Real-time event stream and logs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => clearLogs()}
            className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2 text-sm text-red-500"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter events and logs..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm w-64"
            />
          </div>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showEvents}
                onChange={e => setShowEvents(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">Events</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLogs}
                onChange={e => setShowLogs(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">Logs</span>
            </label>
          </div>
          <div className="text-sm text-muted-foreground">
            {events.length} events, {logs.length} logs
          </div>
        </div>
      </div>

      <ActivityFeed 
        events={events} 
        logs={logs} 
        autoScroll={true}
      />
    </div>
  );
}