import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'unknown';
  }
}

export function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm:ss');
  } catch {
    return 'invalid date';
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    working: 'bg-green-500',
    thinking: 'bg-yellow-500',
    waiting: 'bg-blue-500',
    review: 'bg-purple-500',
    error: 'bg-red-500',
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
  return colors[status] || 'bg-gray-500';
}

export function getStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-gray-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };
  return colors[priority] || 'bg-gray-500';
}

export function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    orchestrator: '🧠',
    architect: '🏗️',
    researcher: '🔍',
    developer: '💻',
    qa: '🧪',
    reviewer: '👁️',
  };
  return icons[role] || '🤖';
}

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    orchestrator: 'bg-purple-500',
    architect: 'bg-blue-500',
    researcher: 'bg-green-500',
    developer: 'bg-orange-500',
    qa: 'bg-cyan-500',
    reviewer: 'bg-pink-500',
  };
  return colors[role] || 'bg-gray-500';
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}