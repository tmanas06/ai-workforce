'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Folder, File, ChevronRight, ChevronDown, Search, RefreshCw, Download, Upload, Plus, Trash2, Edit2, Copy } from 'lucide-react';
import { cn, formatRelativeTime } from '../utils/helpers';
import { projectApi } from '../services/api';
import { useWorkforceStore } from '../services/store';
import type { Project } from '../types';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  size: number;
  path: string;
  children?: FileNode[];
  expanded?: boolean;
}

export function FilesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const pid = projectId ? parseInt(projectId) : null;
  
  const { currentProject } = useWorkforceStore();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<string>('.');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!pid) {
      navigate('/');
      return;
    }
    loadFiles();
  }, [pid, navigate]);

  const loadFiles = async (path: string = '.') => {
    setLoading(true);
    try {
      // Use the filesystem tool via API - for now we'll use a simple approach
      const response = await fetch(`/api/v1/projects/${pid}/tools/filesystem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', path }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const fileList = JSON.parse(data.output);
          setFiles(fileList.map((f: any) => ({ ...f, path: path === '.' ? f.name : `${path}/${f.name}` })));
          setCurrentPath(path);
        }
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (file: FileNode) => {
    if (file.type === 'directory') {
      setFiles(prev => prev.map(f => 
        f.path === file.path ? { ...f, expanded: !f.expanded } : f
      ));
      if (!file.expanded) {
        loadFiles(file.path);
      }
    }
  };

  const readFile = async (file: FileNode) => {
    try {
      const response = await fetch(`/api/v1/projects/${pid}/tools/filesystem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', path: file.path }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Open in new tab or modal
          const blob = new Blob([data.output], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      }
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  };

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(filter.toLowerCase())
  );

  const renderFileTree = (fileList: FileNode[], depth: number = 0) => (
    <div className="space-y-1">
      {fileList.map(file => (
        <div key={file.path} className="flex items-center gap-2">
          <span style={{ paddingLeft: `${depth * 16}px` }} className="flex items-center gap-2">
            {file.type === 'directory' && (
              <button
                onClick={() => toggleExpand(file)}
                className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
              >
                {file.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            {file.type === 'directory' ? (
              <Folder className="w-4 h-4 text-yellow-500" />
            ) : (
              <File className="w-4 h-4 text-blue-500" />
            )}
            <span className="truncate flex-1 font-mono text-sm" title={file.path}>{file.name}</span>
            {file.type === 'file' && (
              <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
            )}
          </span>
          {file.type === 'file' && (
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => readFile(file)} className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors" title="View">
                <Download className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

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
          <h1 className="text-2xl font-bold">Files</h1>
          <p className="text-muted-foreground">Browse project workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadFiles(currentPath)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2 text-sm" title="Upload">
            <Upload className="w-4 h-4" />
          </button>
          <button className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2 text-sm" title="New File">
            <Plus className="w-4 h-4" />
          </button>
          <button className="px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-2 text-sm" title="New Folder">
            <Folder className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1 bg-muted rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter files..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 text-sm font-mono"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
            {currentPath.split('/').filter(Boolean).map((part, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3" />}
                <button 
                  onClick={() => loadFiles(arr.slice(0, i + 1).join('/'))}
                  className="hover:text-primary transition-colors"
                >
                  {part}
                </button>
              </span>
            ))}
          </div>
        </div>
        
        <div className="p-4 max-h-[600px] overflow-y-auto font-mono text-sm">
          {filteredFiles.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {filter ? 'No files match filter' : 'No files in this directory'}
            </div>
          ) : (
            renderFileTree(filteredFiles)
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}