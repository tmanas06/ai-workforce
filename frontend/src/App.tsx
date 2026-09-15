'use client';

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { OfficePage } from './pages/Office';
import { ProjectsPage } from './pages/Projects';
import { AgentsPage } from './pages/Agents';
import { TasksPage } from './pages/Tasks';
import { ActivityPage } from './pages/Activity';
import { FilesPage } from './pages/Files';
import { GitPage } from './pages/Git';
import { TestsPage } from './pages/Tests';
import { ModelsPage } from './pages/Models';
import { MemoryPage } from './pages/Memory';
import { SettingsPage } from './pages/Settings';
import { Loader2 } from 'lucide-react';
import { useWorkforceStore } from './services/store';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading AI Workforce...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { projects, setProjects } = useWorkforceStore();

  useEffect(() => {
    // Load projects from localStorage on startup
    const stored = localStorage.getItem('workforce-store');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.state?.projects) {
          setProjects(parsed.state.projects);
        }
      } catch (e) {
        console.error('Failed to load stored projects:', e);
      }
    }
  }, [setProjects]);

  return (
    <Routes>
      <Route path="/" element={<ProjectsPage />} />
      <Route path="/project/:projectId" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="office" element={<OfficePage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="git" element={<GitPage />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="models" element={<ModelsPage />} />
        <Route path="memory" element={<MemoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <>
      <AppContent />
    </>
  );
}