'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Brain, Zap, Database, TrendingUp, RefreshCw, Download, Filter, X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { cn, formatRelativeTime, formatDuration } from '../utils/helpers';
import { modelMetricApi } from '../services/api';
import type { ModelMetric } from '../types';

export function ModelsPage() {
  const [metrics, setMetrics] = useState<ModelMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string | null>('all');
  const [filterTaskType, setFilterTaskType] = useState<string | null>('all');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await modelMetricApi.list({ limit: 500 });
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const providers = [...new Set(metrics.map(m => m.provider))].sort();
  const models = [...new Set(metrics.map(m => m.model))].sort();
  const taskTypes = [...new Set(metrics.map(m => m.task_type).filter((t): t is string => Boolean(t)))].sort();

  const filteredMetrics = metrics.filter(m => 
    (filterProvider === 'all' || m.provider === filterProvider) &&
    (filterModel === 'all' || m.model === filterModel) &&
    (filterTaskType === 'all' || m.task_type === filterTaskType)
  );

  const stats = filteredMetrics.reduce((acc, m) => {
    acc.total++;
    if (m.success) acc.success++;
    else acc.failed++;
    acc.totalLatency += m.latency_ms || 0;
    acc.totalTokens += (m.tokens_input || 0) + (m.tokens_output || 0);
    return acc;
  }, { total: 0, success: 0, failed: 0, totalLatency: 0, totalTokens: 0 });

  const avgLatency = stats.total > 0 ? stats.totalLatency / stats.total : 0;
  const successRate = stats.total > 0 ? (stats.success / stats.total * 100).toFixed(1) : 0;

  const providerStats = providers.map(provider => {
    const pMetrics = filteredMetrics.filter(m => m.provider === provider);
    const pTotal = pMetrics.length;
    const pSuccess = pMetrics.filter(m => m.success).length;
    const pLatency = pMetrics.reduce((sum, m) => sum + (m.latency_ms || 0), 0) / (pTotal || 1);
    const rate = pTotal > 0 ? (pSuccess / pTotal * 100) : 0;
    return { provider, total: pTotal, success: pSuccess, failed: pTotal - pSuccess, rate, avgLatency: pLatency };
  }).sort((a, b) => b.rate - a.rate);

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
          <h1 className="text-2xl font-bold">Models</h1>
          <p className="text-muted-foreground">Model performance metrics and routing</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadMetrics} className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
              <option value="all">All Providers</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select value={(filterModel ?? 'all') as string} onChange={e => setFilterModel(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
              <option value="all">All Models</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select value={(filterTaskType ?? 'all') as string} onChange={e => setFilterTaskType(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm">
              <option value="all">All Task Types</option>
              {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="text-sm text-muted-foreground">{filteredMetrics.length} / {metrics.length} records</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Brain className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-3xl font-bold text-green-500">{successRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Latency</p>
              <p className="text-3xl font-bold">{formatDuration(avgLatency)}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              <p className="text-3xl font-bold">{stats.totalTokens.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Database className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-3xl font-bold text-red-500">{stats.failed}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Provider Performance
          </h3>
          <div className="space-y-3">
            {providerStats.map(p => {
              const rateNum = p.rate;
              return (
                <div key={p.provider} className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{p.provider}</span>
                    <span className={cn('px-2 py-0.5 text-xs rounded font-mono', 
                      rateNum >= 90 ? 'bg-green-500/10 text-green-500' :
                      rateNum >= 70 ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    )}>{rateNum.toFixed(1)}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <span>Requests: <span className="text-foreground">{p.total}</span></span>
                    <span>Avg Latency: <span className="text-foreground">{formatDuration(p.avgLatency)}</span></span>
                    <span>Failed: <span className="text-red-500">{p.failed}</span></span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${rateNum.toFixed(1)}%` }} />
                  </div>
                </div>
              );
            })}
            {providerStats.length === 0 && <div className="text-center text-muted-foreground py-8">No metrics data yet</div>}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-4">Recent Requests</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredMetrics.slice(0, 50).map((metric, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded', metric.success ? 'bg-green-500' : 'bg-red-500')} />
                    <span className="font-mono text-sm font-medium">{metric.model}</span>
                    <span className="text-xs px-2 py-0.5 bg-muted rounded">{metric.provider}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(metric.timestamp)}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Latency: <span className="text-foreground font-mono">{formatDuration(metric.latency_ms ?? 0)}</span></span>
                  <span>Tokens: <span className="text-foreground font-mono">{(metric.tokens_input || 0) + (metric.tokens_output || 0)}</span></span>
                  {metric.task_type && <span>Type: <span className="text-foreground">{metric.task_type}</span></span>}
                </div>
                {metric.error && (
                  <div className="mt-2 text-xs text-red-500 font-mono">{metric.error}</div>
                )}
              </div>
            ))}
            {filteredMetrics.length === 0 && <div className="text-center text-muted-foreground py-8">No metrics matching filters</div>}
          </div>
        </div>
      </div>
    </div>
  );
}