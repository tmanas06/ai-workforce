'use client';

import React, { useState } from 'react';
import type { Agent } from '../../types';
import { X, Brain, Terminal, Shield, Cpu, Activity, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface AgentInspectorDrawerProps {
  agent: Agent | null;
  onClose: () => void;
  onSendInstruction?: (agentId: number, prompt: string) => void;
}

export function AgentInspectorDrawer({ agent, onClose, onSendInstruction }: AgentInspectorDrawerProps) {
  const [prompt, setPrompt] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!agent) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !onSendInstruction) return;
    onSendInstruction(agent.id, prompt.trim());
    setPrompt('');
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 bg-card border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
            {agent.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-base">{agent.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{agent.role} Agent</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Status Card */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Current Status</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full font-medium capitalize',
                agent.status === 'working' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                agent.status === 'thinking' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                agent.status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                'bg-slate-500/10 text-slate-400 border border-slate-500/30'
              )}
            >
              ● {agent.status}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="text-muted-foreground">Model Engine</div>
            <div className="font-mono text-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              {agent.model_provider || 'openrouter'} / {agent.model_name || 'auto'}
            </div>
          </div>
        </div>

        {/* Capabilities & Permissions */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Capabilities & Tools
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(agent.capabilities || ['filesystem', 'terminal', 'git']).map((cap) => (
              <span key={cap} className="px-2 py-1 bg-muted rounded-md text-xs font-mono text-slate-300">
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Agent Interaction Form */}
        <div className="space-y-2 pt-2 border-t border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" /> Direct Agent Prompt
          </h4>
          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Send instruction to ${agent.name}...`}
              rows={3}
              className="w-full p-3 text-xs bg-muted/60 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
            />
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="w-full py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> Send Instruction
            </button>
          </form>
          {sentSuccess && (
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 justify-center py-1 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Instruction queued for {agent.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
