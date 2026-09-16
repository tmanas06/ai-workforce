'use client';

import React from 'react';
import { cn } from '../../utils/helpers';
import { getStatusColor, getPriorityColor } from '../../utils/helpers';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Clock, AlertTriangle, CheckCircle, XCircle, Loader2, GitBranch, Square, RotateCcw, Trash2 } from 'lucide-react';
import type { Task } from '../../types';
import { formatRelativeTime } from '../../utils/helpers';

interface TaskCardProps {
  task: Task;
  level?: number;
  onClick?: () => void;
  onCancel?: (taskId: number) => void;
  onRetry?: (taskId: number) => void;
  onDelete?: (taskId: number) => void;
}

export function TaskCard({ task, level = 0, onClick, onCancel, onRetry, onDelete }: TaskCardProps) {
  const statusIcons: Record<string, React.ReactNode> = {
    running: <Loader2 className="w-4 h-4 animate-spin text-green-500" />,
    completed: <CheckCircle className="w-4 h-4 text-green-500" />,
    failed: <XCircle className="w-4 h-4 text-red-500" />,
    blocked: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    pending: <Clock className="w-4 h-4 text-gray-500" />,
    cancelled: <Square className="w-4 h-4 text-gray-400" />,
  };

  return (
    <div
      className={cn(
        'group relative bg-card border border-border rounded-lg p-4 transition-all hover:border-primary/50 cursor-pointer',
        level > 0 && 'ml-6 border-l-2 border-border pl-4'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0">
            {statusIcons[task.status] || (
              <div className={cn('w-2 h-2 rounded-full', getStatusColor(task.status))} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{task.title}</h4>
              <StatusIndicator status={task.status} size="sm" showLabel />
              <span className={cn('px-2 py-0.5 text-xs rounded', getPriorityColor(task.priority))}>
                {task.priority}
              </span>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 truncate">{task.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {task.assigned_agent_id && (
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  Agent #{task.assigned_agent_id}
                </span>
              )}
              {task.dependencies.length > 0 && (
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  Deps: {task.dependencies.length}
                </span>
              )}
              {task.retry_count > 0 && (
                <span className="flex items-center gap-1 text-orange-500">
                  <RotateCcw className="w-3 h-3" />
                  Retry: {task.retry_count}/{task.max_retries}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {task.started_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Started {formatRelativeTime(task.started_at)}
            </span>
          )}
          {task.completed_at && (
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircle className="w-3 h-3" />
              Done {formatRelativeTime(task.completed_at)}
            </span>
          )}
          {onCancel && ['running', 'assigned', 'ready', 'planned', 'blocked'].includes(task.status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel(task.id);
              }}
              className="px-2 py-1 text-xs font-medium rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 flex items-center gap-1 transition-colors"
              title="Cancel Task"
            >
              <Square className="w-3 h-3" />
              Cancel
            </button>
          )}
          {onRetry && ['failed', 'cancelled'].includes(task.status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry(task.id);
              }}
              className="px-2 py-1 text-xs font-medium rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 flex items-center gap-1 transition-colors"
              title="Retry Task"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="px-2 py-1 text-xs font-medium rounded bg-muted/80 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 border border-border hover:border-red-500/30 flex items-center gap-1 transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      </div>

      {task.output && (
        <div className="mt-3 p-3 bg-muted/50 rounded border border-border">
          <div className="font-mono text-xs text-muted-foreground">
            {typeof task.output === 'string' ? task.output : JSON.stringify(task.output, null, 2)}
          </div>
        </div>
      )}

      {task.status === 'failed' && task.error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
          <div className="font-mono text-xs text-red-400">{task.error}</div>
        </div>
      )}

      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-4 space-y-2">
          {task.subtasks.map((subtask) => (
            <TaskCard key={subtask.id} task={subtask} level={level + 1} onClick={onClick} />
          ))}
        </div>
      )}
    </div>
  );
}