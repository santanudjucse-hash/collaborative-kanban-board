import { Status, Priority, Task, TaskFilters } from '../types/Task';

export const ORDERED_COLUMNS: Status[] = ['Backlog', 'Todo', 'In Progress', 'Done'];

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  high: {
    label: 'High',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
};

export const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; badgeBg: string; borderTop: string }
> = {
  Backlog: {
    label: 'Backlog',
    color: 'text-slate-400',
    badgeBg: 'bg-slate-800 text-slate-300',
    borderTop: 'border-t-slate-500',
  },
  Todo: {
    label: 'Todo',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-900/40 text-blue-300',
    borderTop: 'border-t-blue-500',
  },
  'In Progress': {
    label: 'In Progress',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-900/40 text-amber-300',
    borderTop: 'border-t-amber-500',
  },
  Done: {
    label: 'Done',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-900/40 text-emerald-300',
    borderTop: 'border-t-emerald-500',
  },
};

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-pink-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-rose-600',
  'bg-teal-600',
];

/**
 * Deterministically generates an avatar color and initials from an assignee name
 */
export function getAssigneeAvatar(name: string): { initials: string; bg: string } {
  if (!name || !name.trim()) {
    return { initials: '?', bg: 'bg-slate-600' };
  }

  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;

  return { initials, bg: AVATAR_COLORS[colorIndex] };
}

/**
 * Formats an ISO date into human-readable relative time (e.g., "5m ago", "2h ago")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 30) return 'just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Filters tasks combining search, priority, and assignee filters simultaneously.
 * Filtering never modifies the original dataset.
 */
export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task) => {
    // 1. Search filter (case-insensitive title matching)
    if (filters.search && filters.search.trim() !== '') {
      const query = filters.search.toLowerCase().trim();
      const titleMatch = task.title.toLowerCase().includes(query);
      const descMatch = (task.description || '').toLowerCase().includes(query);
      if (!titleMatch && !descMatch) {
        return false;
      }
    }

    // 2. Priority filter
    if (filters.priority && filters.priority !== 'all') {
      if (task.priority !== filters.priority) {
        return false;
      }
    }

    // 3. Assignee filter
    if (filters.assignee && filters.assignee !== 'all') {
      if (task.assignee.toLowerCase() !== filters.assignee.toLowerCase()) {
        return false;
      }
    }

    return true;
  });
}
