'use client';

import React from 'react';
import { cn } from '../../utils/helpers';
import { getRoleIcon, getRoleColor } from '../../utils/helpers';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Terminal, FileText, GitBranch, Play, Pause, RotateCcw, X } from 'lucide-react';
import type { Agent, Task } from '../../types';
import { useWorkforceStore } from '../../services/store';

interface AgentCardProps {
  agent: Agent;
  currentTask?: Task | null;
  onStart?: () => void;
  onStop?: () => void;
  onRestart?: () => void;
  onInspect?: () => void;
}

export function AgentCard({ agent, currentTask, onStart, onStop, onRestart, onInspect }: AgentCardProps) {
  const { agentStatuses } = useWorkforceStore();
  const liveStatus = agentStatuses[agent.id] || agent.status;

  return (
    <div className="agent-node group relative bg-card border border-border rounded-xl p-4 transition-all hover:border-primary/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-2xl', getRoleColor(agent.role))}>
            {getRoleIcon(agent.role)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{agent.name}</h3>
              <StatusIndicator status={liveStatus} size="sm" showLabel />
            </div>
            <p className="text-sm text-muted-foreground truncate capitalize">{agent.role}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              {agent.model_provider && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded">
                  <Terminal className="w-3 h-3" />
                  {agent.model_provider}/{agent.model_name || 'auto'}
                </span>
              )}
              <span className="flex items-center gap-1 px-2 py-0.5 bg-muted rounded">
                <FileText className="w-3 h-3" />
                {agent.runtime_type}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onInspect && (
            <button
              onClick={onInspect}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              title="Inspect Agent"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {agent.status === 'idle' && onStart && (
            <button
              onClick={onStart}
              className="p-2 rounded-lg hover:bg-green-500/10 text-green-500 transition-colors"
              title="Start Agent"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {(agent.status === 'working' || agent.status === 'thinking') && onStop && (
            <button
              onClick={onStop}
              className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
              title="Stop Agent"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {(agent.status === 'error') && onRestart && (
            <button
              onClick={onRestart}
              className="p-2 rounded-lg hover:bg-yellow-500/10 text-yellow-500 transition-colors"
              title="Restart Agent"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {currentTask && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Current Task</span>
            <StatusIndicator status={currentTask.status} size="sm" showLabel />
          </div>
          <h4 className="font-medium text-sm truncate">{currentTask.title}</h4>
          {currentTask.description && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{currentTask.description}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {agent.capabilities.map((cap) => (
          <span key={cap} className="px-2 py-0.5 text-xs bg-muted rounded text-muted-foreground">
            {cap}
          </span>
        ))}
      </div>
    </div>
  );
}