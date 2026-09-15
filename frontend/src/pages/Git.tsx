'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, GitBranch, GitCommit, GitPullRequest, Terminal, RefreshCw, Plus, Copy, Download, Search } from 'lucide-react';
import { cn, formatRelativeTime } from '../utils/helpers';
import { projectApi } from '../services/api';
import { useWorkforceStore } from '../services/store';
import type { Project } from '../types';

export function GitPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId) : null;
  
  const [status, setStatus] = useState<string>('');
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [commits, setCommits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [command, setCommand] = useState('');

  useEffect(() => {
    if (!pid) {
      navigate('/');
      return;
    }
    loadGitData();
  }, [pid, navigate]);

  const runGitCommand = async (args: string[]) => {
    setRunning(true);
    try {
      const response = await fetch(`/api/v1/projects/${pid}/tools/git`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'custom', args }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.success ? data.output : data.error;
      }
    } catch (error) {
      console.error('Git command failed:', error);
      return 'Error executing command';
    } finally {
      setRunning(false);
    }
  };

  const loadGitData = async () => {
    setLoading(true);
    try {
      const [statusOut, branchesOut, branchOut, logOut] = await Promise.all([
        runGitCommand(['status', '--short']),
        runGitCommand(['branch', '-a']),
        runGitCommand(['branch', '--show-current']),
        runGitCommand(['log', '--oneline', '-20', '--pretty=format:%h|%s|%an|%ad', '--date=short']),
      ]);
      
      setStatus(statusOut || '');
      setBranches((branchesOut?.split('\n').filter(Boolean).map((b: string) => b.trim().replace('* ', '')) || []) as string[]);
      setCurrentBranch(branchOut?.trim() || '');
      
      if (logOut) {
        const commitsData = logOut.split('\n').filter(Boolean).map((line: string) => {
          const [hash, subject, author, date] = line.split('|');
          return { hash, subject, author, date };
        });
        setCommits(commitsData);
      }
    } catch (error) {
      console.error('Failed to load git data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    const args = command.trim().split(' ');
    const output = await runGitCommand(args);
    setCommand('');
    loadGitData();
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
          <h1 className="text-2xl font-bold">Git</h1>
          <p className="text-muted-foreground">Repository management</p>
        </div>
        <button onClick={loadGitData} disabled={running} className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2 text-sm">
          <RefreshCw className={cn('w-4 h-4', running && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Repository Status
              </h3>
              <span className={cn('px-2 py-1 text-xs rounded font-mono', status ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500')}>
                {status ? 'Changes' : 'Clean'}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium">{currentBranch || 'unknown'}</span>
            </div>
            {status && (
              <pre className="bg-muted p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">{status}</pre>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <GitCommit className="w-5 h-5" />
              Recent Commits
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {commits.map((commit, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-primary px-2 py-1 bg-primary/10 rounded">{commit.hash}</span>
                    <span className="flex-1 text-sm">{commit.subject}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{commit.author}</span>
                    <span>{commit.date}</span>
                  </div>
                </div>
              ))}
              {commits.length === 0 && (
                <div className="text-center text-muted-foreground py-8">No commits yet</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Branches
            </h3>
            <div className="space-y-1">
              {branches.map(branch => (
                <div key={branch} className={cn(
                  'p-2 rounded-lg font-mono text-sm transition-colors cursor-pointer',
                  branch === currentBranch ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                )}>
                  {branch === currentBranch && <span className="mr-2">●</span>}
                  {branch}
                </div>
              ))}
              {branches.length === 0 && <div className="text-muted-foreground text-sm text-center py-4">No branches</div>}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Quick Commands</h3>
            <div className="space-y-2">
              {[
                ['status', 'Show status'],
                ['diff', 'Show changes'],
                ['log --oneline -10', 'Recent commits'],
                ['branch', 'List branches'],
              ].map(([cmd, desc]) => (
                <button
                  key={cmd}
                  onClick={() => runGitCommand(cmd.split(' ')).then(loadGitData)}
                  disabled={running}
                  className="w-full p-2 rounded-lg border border-border hover:bg-accent transition-colors text-left text-sm font-mono flex items-center justify-between"
                >
                  <span>git {cmd}</span>
                  <span className="text-muted-foreground text-xs">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Custom Command</h3>
            <form onSubmit={handleCommand} className="flex gap-2">
              <input
                type="text"
                value={command}
                onChange={e => setCommand(e.target.value)}
                placeholder="git status, git diff, git commit -m 'msg', etc."
                className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                disabled={running}
              />
              <button type="submit" disabled={running || !command.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                Run
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}