'use client';

import React from 'react';
import { Users, Coffee, Briefcase, Play, Square, RefreshCw, Eye } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface OfficeControlsProps {
  officeMode: 'work' | 'meeting' | 'break';
  onChangeOfficeMode: (mode: 'work' | 'meeting' | 'break') => void;
  viewMode: '2d' | 'isometric';
  onChangeViewMode: (mode: '2d' | 'isometric') => void;
  isWorkforceRunning: boolean;
  onStartWorkforce: () => void;
  onStopWorkforce: () => void;
}

export function OfficeControls({
  officeMode,
  onChangeOfficeMode,
  viewMode,
  onChangeViewMode,
  isWorkforceRunning,
  onStartWorkforce,
  onStopWorkforce,
}: OfficeControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-lg">
      {/* Office Locations / Modes */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Locations:</span>
        <button
          onClick={() => onChangeOfficeMode('work')}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all',
            officeMode === 'work'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Briefcase className="w-4 h-4" />
          Work Bays
        </button>

        <button
          onClick={() => onChangeOfficeMode('meeting')}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all',
            officeMode === 'meeting'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Users className="w-4 h-4" />
          Team Meeting Room
        </button>

        <button
          onClick={() => onChangeOfficeMode('break')}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all',
            officeMode === 'break'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Coffee className="w-4 h-4" />
          Coffee Break
        </button>
      </div>

      {/* Workforce Execution Controls */}
      <div className="flex items-center gap-3">
        {isWorkforceRunning ? (
          <button
            onClick={onStopWorkforce}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-red-700 transition-colors shadow-md shadow-red-600/20"
          >
            <Square className="w-4 h-4 fill-white" />
            Stop Workforce
          </button>
        ) : (
          <button
            onClick={onStartWorkforce}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
          >
            <Play className="w-4 h-4 fill-white" />
            Start Workforce
          </button>
        )}
      </div>
    </div>
  );
}
