'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Play, Square, RefreshCw, CheckCircle, XCircle, AlertTriangle, Terminal, Download, Filter } from 'lucide-react';
import { cn, formatRelativeTime, formatDuration } from '../utils/helpers';
import { projectApi } from '../services/api';
import { useWorkforceStore } from '../services/store';
import type { Project } from '../types';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  duration: number;
  error?: string;
  file?: string;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export function TestsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId) : null;
  
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [output, setOutput] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'running'>('all');

  useEffect(() => {
    if (!pid) {
      navigate('/');
      return;
    }
    loadTestData();
  }, [pid, navigate]);

  const runTests = async (testCommand?: string) => {
    setRunning(true);
    setOutput('Running tests...\n');
    try {
      const cmd = testCommand || detectTestCommand();
      const response = await fetch(`/api/v1/projects/${pid}/tools/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, timeout: 120 }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setOutput(data.output || data.error || 'No output');
        parseTestOutput(data.output || '');
      }
    } catch (error) {
      setOutput('Error running tests: ' + error);
    } finally {
      setRunning(false);
    }
  };

  const detectTestCommand = () => {
    // Try to detect test framework
    return 'npm test 2>/dev/null || python -m pytest -v 2>/dev/null || go test ./... 2>/dev/null || echo "No test framework detected"';
  };

  const parseTestOutput = (text: string) => {
    const suites: TestSuite[] = [];
    // Simple parsing for common test outputs
    const lines = text.split('\n');
    let currentSuite: TestSuite | null = null;
    
    for (const line of lines) {
      // pytest style
      if (line.includes('::') && (line.includes('PASSED') || line.includes('FAILED') || line.includes('SKIPPED'))) {
        const parts = line.split(' ');
        const testName = parts[0];
        const status = line.includes('PASSED') ? 'passed' : line.includes('FAILED') ? 'failed' : 'skipped';
        if (!currentSuite) {
          currentSuite = { name: 'pytest', tests: [], passed: 0, failed: 0, skipped: 0, duration: 0 };
          suites.push(currentSuite);
        }
        currentSuite.tests.push({ name: testName, status, duration: 0 });
        if (status === 'passed') currentSuite.passed++;
        else if (status === 'failed') currentSuite.failed++;
        else currentSuite.skipped++;
      }
      // jest style
      else if (line.includes('✓') || line.includes('✕') || line.includes('○')) {
        const status = line.includes('✓') ? 'passed' : line.includes('✕') ? 'failed' : 'skipped';
        const testName = line.replace(/[✓✕○]\s*/, '').trim();
        if (!currentSuite) {
          currentSuite = { name: 'jest', tests: [], passed: 0, failed: 0, skipped: 0, duration: 0 };
          suites.push(currentSuite);
        }
        currentSuite.tests.push({ name: testName, status, duration: 0 });
        if (status === 'passed') currentSuite.passed++;
        else if (status === 'failed') currentSuite.failed++;
        else currentSuite.skipped++;
      }
      // go test style
      else if (line.startsWith('---') && (line.includes('PASS') || line.includes('FAIL'))) {
        const status = line.includes('PASS') ? 'passed' : 'failed';
        const testName = line.replace(/--- (PASS|FAIL): /, '').split(' ')[0];
        if (!currentSuite) {
          currentSuite = { name: 'go test', tests: [], passed: 0, failed: 0, skipped: 0, duration: 0 };
          suites.push(currentSuite);
        }
        currentSuite.tests.push({ name: testName, status, duration: 0 });
        if (status === 'passed') currentSuite.passed++;
        else currentSuite.failed++;
      }
    }
    
    if (suites.length > 0) {
      setSuites(suites);
    }
  };

  const loadTestData = async () => {
    setLoading(true);
    try {
      await runTests();
    } catch (error) {
      console.error('Failed to load test data:', error);
    } finally {
      setLoading(false);
    }
  };

  const allTests = suites.flatMap(s => s.tests.map(t => ({ ...t, suite: s.name })));
  const filteredTests = filter === 'all' ? allTests : allTests.filter(t => t.status === filter);
  const totalPassed = suites.reduce((sum, s) => sum + s.passed, 0);
  const totalFailed = suites.reduce((sum, s) => sum + s.failed, 0);
  const totalSkipped = suites.reduce((sum, s) => sum + s.skipped, 0);

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
          <h1 className="text-2xl font-bold">Tests</h1>
          <p className="text-muted-foreground">Test execution and results</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => runTests()} disabled={running} className="px-4 py-2 rounded-lg bg-green-500 text-green-500-foreground font-medium flex items-center gap-2 hover:bg-green-600 disabled:opacity-50 transition-colors">
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Tests
              </>
            )}
          </button>
          <button onClick={loadTestData} className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Tests</p>
              <p className="text-3xl font-bold">{totalPassed + totalFailed + totalSkipped}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Passed</p>
              <p className="text-3xl font-bold text-green-500">{totalPassed}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-3xl font-bold text-red-500">{totalFailed}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Skipped</p>
              <p className="text-3xl font-bold text-yellow-500">{totalSkipped}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Test Output
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value as any)}
                  className="px-2 py-1 text-sm bg-muted border border-border rounded"
                >
                  <option value="all">All</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="running">Running</option>
                </select>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{output || 'No test output yet. Click "Run Tests" to execute.'}</pre>
            </div>
          </div>

          {suites.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-4">Test Results</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {suites.map(suite => (
                  <div key={suite.name} className="border border-border rounded-lg overflow-hidden">
                    <div className="p-3 bg-muted/50 border-b border-border flex items-center justify-between">
                      <span className="font-medium">{suite.name}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-500">✓ {suite.passed}</span>
                        <span className="text-red-500">✕ {suite.failed}</span>
                        <span className="text-yellow-500">○ {suite.skipped}</span>
                        <span className="text-muted-foreground">{formatDuration(suite.duration)}</span>
                      </div>
                    </div>
                    <div className="p-3 max-h-64 overflow-y-auto">
                      {suite.tests
                        .filter(t => filter === 'all' || t.status === filter)
                        .map((test, i) => (
                          <div key={i} className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded">
                            <span className={cn('w-2 h-2 rounded', 
                              test.status === 'passed' && 'bg-green-500',
                              test.status === 'failed' && 'bg-red-500',
                              test.status === 'skipped' && 'bg-yellow-500',
                              test.status === 'running' && 'bg-blue-500 animate-pulse'
                            )} />
                            <span className="text-sm font-mono truncate flex-1">{test.name}</span>
                            <span className={cn('text-xs px-2 py-0.5 rounded',
                              test.status === 'passed' && 'bg-green-500/10 text-green-500',
                              test.status === 'failed' && 'bg-red-500/10 text-red-500',
                              test.status === 'skipped' && 'bg-yellow-500/10 text-yellow-500',
                              test.status === 'running' && 'bg-blue-500/10 text-blue-500'
                            )}>{test.status}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                ['npm test', 'NPM Test'],
                ['python -m pytest -v', 'Pytest Verbose'],
                ['python -m pytest --cov', 'Pytest with Coverage'],
                ['go test ./...', 'Go Test All'],
                ['cargo test', 'Cargo Test'],
              ].map(([cmd, label]) => (
                <button
                  key={cmd}
                  onClick={() => runTests(cmd)}
                  disabled={running}
                  className="w-full p-3 rounded-lg border border-border hover:bg-accent transition-colors text-left"
                >
                  <div className="font-mono text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground font-mono">{cmd}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-4">Export</h3>
            <button
              onClick={() => {
                const blob = new Blob([output], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `test-output-${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-full p-3 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Output as Text</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}