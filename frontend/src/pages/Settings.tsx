'use client';

import React, { useState } from 'react';
import { Loader2, Key, Server, Database, Shield, Bell, Palette, Save, Check, AlertTriangle, Info, Trash2, Plus } from 'lucide-react';
import { cn } from '../utils/helpers';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'providers' | 'security' | 'appearance'>('general');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: Server },
    { id: 'providers', label: 'Model Providers', icon: Key },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const [settings, setSettings] = useState({
    general: {
      workspace_path: '~/AIWorkforce/workspaces',
      max_parallel_agents: 5,
      agent_timeout: 300,
      auto_start_workforce: false,
      log_level: 'info',
    },
    providers: {
      openrouter_enabled: true,
      openrouter_api_key: '',
      openrouter_base_url: 'https://openrouter.ai/api/v1',
      opencode_enabled: true,
      opencode_api_key: '',
      opencode_base_url: 'https://api.opencode.ai/v1',
      experiential_labs_enabled: true,
      experiential_labs_api_key: '',
      experiential_labs_base_url: 'https://api.experientiallabs.ai/v1',
      ollama_enabled: true,
      ollama_base_url: 'http://localhost:11434',
      openai_enabled: false,
      openai_api_key: '',
      openai_base_url: 'https://api.openai.com/v1',
      google_enabled: false,
      google_api_key: '',
    },
    security: {
      require_approval_sudo: true,
      require_approval_install: true,
      require_approval_delete: true,
      require_approval_network: true,
      allowed_directories: ['~/AIWorkforce/workspaces'],
      blocked_commands: ['rm -rf /', 'dd if=', 'mkfs', 'shutdown', 'reboot'],
    },
    appearance: {
      theme: 'dark',
      compact_mode: false,
      show_timestamps: true,
      animate_transitions: true,
      font_size: 'medium',
    },
  });

  const handleSave = async (tab: string) => {
    setSaving(true);
    setSaved(false);
    // Save to localStorage for now
    localStorage.setItem(`ai-workforce-${tab}`, JSON.stringify(settings[tab as keyof typeof settings]));
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChange = (tab: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [tab]: { ...prev[tab as keyof typeof settings], [key]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure AI Workforce</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="border-b border-border">
          <nav className="flex overflow-x-auto" aria-label="Settings tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="font-semibold mb-4">Workspace</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Workspace Base Path</label>
                    <input
                      type="text"
                      value={settings.general.workspace_path}
                      onChange={e => handleChange('general', 'workspace_path', e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Parallel Agents</label>
                      <input
                        type="number"
                        value={settings.general.max_parallel_agents}
                        onChange={e => handleChange('general', 'max_parallel_agents', parseInt(e.target.value))}
                        min={1}
                        max={20}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Agent Timeout (seconds)</label>
                      <input
                        type="number"
                        value={settings.general.agent_timeout}
                        onChange={e => handleChange('general', 'agent_timeout', parseInt(e.target.value))}
                        min={30}
                        max={3600}
                        className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Behavior</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-start workforce on project open</p>
                      <p className="text-sm text-muted-foreground">Automatically start the agent workforce when opening a project</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.general.auto_start_workforce}
                      onChange={e => handleChange('general', 'auto_start_workforce', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Logging</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Log Level</label>
                  <select
                    value={settings.general.log_level}
                    onChange={e => handleChange('general', 'log_level', e.target.value)}
                    className="w-full max-w-xs px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => handleSave('general')} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save General Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'providers' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">API keys are stored locally in your browser. Never commit them to version control.</span>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  OpenRouter
                </h3>
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable OpenRouter</p>
                      <p className="text-sm text-muted-foreground">Access to 100+ models including Claude, GPT, Gemini, Llama</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.providers.openrouter_enabled}
                      onChange={e => handleChange('providers', 'openrouter_enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.providers.openrouter_api_key}
                      onChange={e => handleChange('providers', 'openrouter_api_key', e.target.value)}
                      placeholder="sk-or-v1-..."
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL</label>
                    <input
                      type="text"
                      value={settings.providers.openrouter_base_url}
                      onChange={e => handleChange('providers', 'openrouter_base_url', e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-400" />
                  OpenCode (Nemotron 3 Ultra)
                </h3>
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable OpenCode</p>
                      <p className="text-sm text-muted-foreground">Access Nemotron 3 Ultra and coding models</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.providers.opencode_enabled}
                      onChange={e => handleChange('providers', 'opencode_enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.providers.opencode_api_key}
                      onChange={e => handleChange('providers', 'opencode_api_key', e.target.value)}
                      placeholder="sk-ng..."
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL</label>
                    <input
                      type="text"
                      value={settings.providers.opencode_base_url}
                      onChange={e => handleChange('providers', 'opencode_base_url', e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  Experiential Labs (North Mini Code)
                </h3>
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Experiential Labs</p>
                      <p className="text-sm text-muted-foreground">Access North Mini Code models</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.providers.experiential_labs_enabled}
                      onChange={e => handleChange('providers', 'experiential_labs_enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.providers.experiential_labs_api_key}
                      onChange={e => handleChange('providers', 'experiential_labs_api_key', e.target.value)}
                      placeholder="xpl_..."
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL</label>
                    <input
                      type="text"
                      value={settings.providers.experiential_labs_base_url}
                      onChange={e => handleChange('providers', 'experiential_labs_base_url', e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Ollama (Local)
                </h3>
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Ollama</p>
                      <p className="text-sm text-muted-foreground">Run models locally on your machine</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.providers.ollama_enabled}
                      onChange={e => handleChange('providers', 'ollama_enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL</label>
                    <input
                      type="text"
                      value={settings.providers.ollama_base_url}
                      onChange={e => handleChange('providers', 'ollama_base_url', e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Make sure Ollama is running: <code className="font-mono">ollama serve</code></p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  OpenAI Compatible
                </h3>
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable OpenAI Compatible</p>
                      <p className="text-sm text-muted-foreground">OpenAI API and compatible endpoints</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.providers.openai_enabled}
                      onChange={e => handleChange('providers', 'openai_enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.providers.openai_api_key}
                      onChange={e => handleChange('providers', 'openai_api_key', e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Base URL</label>
                    <input
                      type="text"
                      value={settings.providers.openai_base_url}
                      onChange={e => handleChange('providers', 'openai_base_url', e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Google / Gemini
                </h3>
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Google</p>
                      <p className="text-sm text-muted-foreground">Google Gemini models</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.providers.google_enabled}
                      onChange={e => handleChange('providers', 'google_enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.providers.google_api_key}
                      onChange={e => handleChange('providers', 'google_api_key', e.target.value)}
                      className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => handleSave('providers')} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Provider Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm">These settings control what agents can do without human approval.</span>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Approval Requirements</h3>
                <div className="space-y-3">
                  {[
                    { key: 'require_approval_sudo', label: 'Require approval for sudo commands', desc: 'Any command using sudo' },
                    { key: 'require_approval_install', label: 'Require approval for package installs', desc: 'npm install, pip install, apt install, etc.' },
                    { key: 'require_approval_delete', label: 'Require approval for destructive operations', desc: 'rm -rf, file deletion outside workspace' },
                    { key: 'require_approval_network', label: 'Require approval for network access', desc: 'Outbound connections, API calls' },
                  ].map(item => (
                    <label key={item.key} className="flex items-start justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.security[item.key as keyof typeof settings.security] as boolean}
                        onChange={e => handleChange('security', item.key, e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary mt-0.5"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Allowed Directories</h3>
                <div className="space-y-2">
                  {settings.security.allowed_directories.map((dir, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={dir}
                        onChange={e => {
                          const newDirs = [...settings.security.allowed_directories];
                          newDirs[i] = e.target.value;
                          handleChange('security', 'allowed_directories', newDirs);
                        }}
                        className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                      />
                      <button onClick={() => handleChange('security', 'allowed_directories', settings.security.allowed_directories.filter((_, j) => j !== i))} className="p-2 text-red-500 hover:bg-red-500/10 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => handleChange('security', 'allowed_directories', [...settings.security.allowed_directories, ''])} className="px-3 py-2 text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Directory
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Blocked Commands</h3>
                <div className="space-y-2">
                  {settings.security.blocked_commands.map((cmd, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cmd}
                        onChange={e => {
                          const newCmds = [...settings.security.blocked_commands];
                          newCmds[i] = e.target.value;
                          handleChange('security', 'blocked_commands', newCmds);
                        }}
                        className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                      />
                      <button onClick={() => handleChange('security', 'blocked_commands', settings.security.blocked_commands.filter((_, j) => j !== i))} className="p-2 text-red-500 hover:bg-red-500/10 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => handleChange('security', 'blocked_commands', [...settings.security.blocked_commands, ''])} className="px-3 py-2 text-sm text-primary hover:text-primary/80 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Command
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => handleSave('security')} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Security Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="font-semibold mb-4">Theme</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Theme</label>
                    <select
                      value={settings.appearance.theme}
                      onChange={e => handleChange('appearance', 'theme', e.target.value)}
                      className="w-full max-w-xs px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-4">UI Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Compact Mode</p>
                      <p className="text-sm text-muted-foreground">Reduce spacing for more content on screen</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.appearance.compact_mode}
                      onChange={e => handleChange('appearance', 'compact_mode', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Timestamps</p>
                      <p className="text-sm text-muted-foreground">Display timestamps in activity feed and logs</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.appearance.show_timestamps}
                      onChange={e => handleChange('appearance', 'show_timestamps', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Animate Transitions</p>
                      <p className="text-sm text-muted-foreground">Enable smooth animations</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.appearance.animate_transitions}
                      onChange={e => handleChange('appearance', 'animate_transitions', e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <div>
                    <label className="block text-sm font-medium mb-1">Font Size</label>
                    <select
                      value={settings.appearance.font_size}
                      onChange={e => handleChange('appearance', 'font_size', e.target.value)}
                      className="w-full max-w-xs px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => handleSave('appearance')} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Appearance Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Info className="w-5 h-5" />
          About
        </h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-mono">0.1.0 MVP</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Backend</dt>
            <dd className="font-mono">FastAPI + SQLite</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Frontend</dt>
            <dd className="font-mono">React + TypeScript + Vite</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Real-time</dt>
            <dd className="font-mono">WebSocket</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}