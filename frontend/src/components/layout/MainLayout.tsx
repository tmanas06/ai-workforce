'use client';

import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../utils/helpers';
import { LayoutDashboard, Settings, FolderKanban, GitBranch, Database, Activity, Brain, Building } from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '', icon: LayoutDashboard },
  { name: 'Virtual Office', href: 'office', icon: Building },
  { name: 'Agents', href: 'agents', icon: Brain },
  { name: 'Tasks', href: 'tasks', icon: FolderKanban },
  { name: 'Activity', href: 'activity', icon: Activity },
  { name: 'Files', href: 'files', icon: GitBranch },
  { name: 'Git', href: 'git', icon: Database },
  { name: 'Tests', href: 'tests', icon: Activity },
  { name: 'Models', href: 'models', icon: Brain },
  { name: 'Memory', href: 'memory', icon: Database },
  { name: 'Settings', href: 'settings', icon: Settings },
];

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background">
      <aside className={cn(
        'fixed left-0 top-0 z-40 h-full border-r border-border bg-card transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20'
      )}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              {sidebarOpen && <span className="font-semibold text-lg">AI Workforce</span>}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
              </svg>
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    !sidebarOpen && 'justify-center'
                  )}
                  title={sidebarOpen ? undefined : item.name}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
          
          <div className="border-t border-border p-3" style={{ display: sidebarOpen ? 'block' : 'none' }}>
            <div className="text-xs text-muted-foreground">v0.1.0 MVP</div>
          </div>
        </div>
      </aside>
      
      <main className={cn('flex-1 flex flex-col overflow-hidden', sidebarOpen ? 'ml-64' : 'ml-20')}>
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-6 gap-4">
          <h1 className="text-xl font-semibold">
            {navigation.find(n => location.pathname === n.href || (n.href !== '/' && location.pathname.startsWith(n.href)))?.name || 'AI Workforce'}
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}