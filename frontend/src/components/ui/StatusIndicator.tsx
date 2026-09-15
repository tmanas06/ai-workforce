'use client';

import { cn } from '../../utils/helpers';

interface StatusIndicatorProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function StatusIndicator({ status, size = 'md', showLabel = false, className }: StatusIndicatorProps) {
  const statusColors: Record<string, string> = {
    working: 'bg-green-500 shadow-[0_0_8px_theme(colors.green.500)]',
    thinking: 'bg-yellow-500 shadow-[0_0_8px_theme(colors.yellow.500)]',
    waiting: 'bg-blue-500 shadow-[0_0_8px_theme(colors.blue.500)]',
    review: 'bg-purple-500 shadow-[0_0_8px_theme(colors.purple.500)]',
    error: 'bg-red-500 shadow-[0_0_8px_theme(colors.red.500)]',
    idle: 'bg-gray-500',
    offline: 'bg-gray-400',
    backlog: 'bg-gray-500',
    planned: 'bg-gray-500',
    ready: 'bg-blue-500',
    assigned: 'bg-blue-500',
    running: 'bg-green-500',
    blocked: 'bg-yellow-500',
    failed: 'bg-red-500',
    completed: 'bg-green-500',
    cancelled: 'bg-gray-500',
    pending: 'bg-yellow-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    changes_requested: 'bg-orange-500',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full transition-all duration-200',
          sizeClasses[size],
          statusColors[status] || 'bg-gray-500'
        )}
      />
      {showLabel && (
        <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
      )}
    </div>
  );
}