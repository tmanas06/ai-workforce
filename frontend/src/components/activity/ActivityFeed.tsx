'use client';

import React from 'react';
import { cn } from '../../utils/helpers';
import { formatRelativeTime } from '../../utils/helpers';
import { Terminal, FileText, GitBranch, Brain, AlertTriangle, CheckCircle, XCircle, Loader2, Zap, MessageSquare } from 'lucide-react';
import type { Event, LogEntry } from '../../types';

interface ActivityFeedProps {
  events: Event[];
  logs: LogEntry[];
  autoScroll?: boolean;
}

const eventIcons: Record<string, React.ReactNode> = {
  'agent.created': <Brain className="w-4 h-4 text-purple-500" />,
  'agent.started': <Play className="w-4 h-4 text-green-500" />,
  'agent.stopped': <Pause className="w-4 h-4 text-gray-500" />,
  'agent.thinking': <Brain className="w-4 h-4 text-yellow-500 animate-pulse" />,
  'agent.tool_called': <Terminal className="w-4 h-4 text-blue-500" />,
  'agent.file_changed': <FileText className="w-4 h-4 text-orange-500" />,
  'task.created': <MessageSquare className="w-4 h-4 text-blue-500" />,
  'task.assigned': <GitBranch className="w-4 h-4 text-cyan-500" />,
  'task.started': <Loader2 className="w-4 h-4 text-green-500 animate-spin" />,
  'task.blocked': <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  'task.failed': <XCircle className="w-4 h-4 text-red-500" />,
  'task.completed': <CheckCircle className="w-4 h-4 text-green-500" />,
  'task.reassigned': <GitBranch className="w-4 h-4 text-orange-500" />,
  'review.started': <Brain className="w-4 h-4 text-pink-500" />,
  'review.passed': <CheckCircle className="w-4 h-4 text-green-500" />,
  'review.failed': <XCircle className="w-4 h-4 text-red-500" />,
  'model.fallback': <Zap className="w-4 h-4 text-yellow-500" />,
};

const logLevelIcons: Record<string, React.ReactNode> = {
  info: <MessageSquare className="w-4 h-4 text-blue-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  error: <XCircle className="w-4 h-4 text-red-500" />,
  debug: <Terminal className="w-4 h-4 text-gray-500" />,
};

export function ActivityFeed({ events, logs, autoScroll = true }: ActivityFeedProps) {
  const feedRef = React.useRef<HTMLDivElement>(null);
  const [showEvents, setShowEvents] = React.useState(true);
  const [showLogs, setShowLogs] = React.useState(true);
  const [filter, setFilter] = React.useState('');

  React.useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events, logs, autoScroll]);

  const allItems = [
    ...events.map(e => ({ ...e, type: 'event' as const, time: e.timestamp })),
    ...logs.map(l => ({ ...l, type: 'log' as const, time: l.timestamp })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .filter(item => {
      if (filter) {
        const search = filter.toLowerCase();
        const text = item.type === 'event' 
          ? `${item.event_type} ${JSON.stringify(item.payload)}`
          : item.message;
        return text.toLowerCase().includes(search);
      }
      return true;
    })
    .slice(0, 200);

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-border bg-card/50">
        <h3 className="font-semibold">Live Activity</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-2 py-1 text-sm bg-muted border border-border rounded w-40"
          />
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} className="w-3 h-3" />
            Events
          </label>
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <input type="checkbox" checked={showLogs} onChange={(e) => setShowLogs(e.target.checked)} className="w-3 h-3" />
            Logs
          </label>
        </div>
      </div>
      
      <div ref={feedRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {allItems.map((item, index) => {
          if (item.type === 'event' && !showEvents) return null;
          if (item.type === 'log' && !showLogs) return null;
          
          if (item.type === 'event') {
            const event = item as Event;
            const Icon = eventIcons[event.event_type] || <MessageSquare className="w-4 h-4 text-gray-500" />;
            return (
              <div key={index} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg animate-fade-in">
                <div className="flex-shrink-0 mt-0.5">{Icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-muted-foreground">{formatRelativeTime(event.timestamp)}</span>
                    <span className="text-xs px-2 py-0.5 bg-muted rounded font-mono">{event.event_type}</span>
                    {event.agent_id && <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">Agent #{event.agent_id}</span>}
                    {event.task_id && <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded">Task #{event.task_id}</span>}
                  </div>
                  {event.payload && (
                    <pre className="mt-1 text-xs text-muted-foreground font-mono overflow-x-auto max-h-24 overflow-y-auto">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            );
          } else {
            const log = item as LogEntry;
            const Icon = logLevelIcons[log.level] || <MessageSquare className="w-4 h-4 text-gray-500" />;
            return (
              <div key={index} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg animate-fade-in border-l-2 border-l-current" style={{ borderColor: log.level === 'error' ? 'hsl(var(--destructive))' : log.level === 'warning' ? 'hsl(var(--warning))' : 'hsl(var(--primary))' }}>
                <div className="flex-shrink-0 mt-0.5">{Icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-muted-foreground">{formatRelativeTime(log.timestamp)}</span>
                    <span className="text-xs px-2 py-0.5 bg-muted rounded capitalize">{log.level}</span>
                    {log.agent_id && <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">Agent #{log.agent_id}</span>}
                    {log.task_id && <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded">Task #{log.task_id}</span>}
                  </div>
                  <p className="text-sm font-mono mt-1">{log.message}</p>
                </div>
              </div>
            );
          }
        })}
        {allItems.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No activity yet
          </div>
        )}
      </div>
    </div>
  );
}

import { Play, Pause } from 'lucide-react';