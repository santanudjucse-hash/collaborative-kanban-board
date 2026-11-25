import { describe, it, expect } from 'vitest';
import { filterTasks, ORDERED_COLUMNS, getAssigneeAvatar, formatRelativeTime } from '../utils/taskUtils';
import { Task, TaskFilters } from '../types/Task';

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Login Page Redesign',
    description: 'Implement responsive form',
    priority: 'high',
    assignee: 'Santanu',
    status: 'Backlog',
    position: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'OAuth Integration',
    description: 'Google SSO login',
    priority: 'medium',
    assignee: 'Santanu',
    status: 'Todo',
    position: 0,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    title: 'API Rate Limiting',
    description: 'Prevent DDoS attacks',
    priority: 'high',
    assignee: 'Alex Chen',
    status: 'In Progress',
    position: 0,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    title: 'Database Indexing',
    description: 'Speed up query execution',
    priority: 'low',
    assignee: 'Sarah Miller',
    status: 'Done',
    position: 0,
    updatedAt: new Date().toISOString(),
  },
];

describe('Task Utilities & Combined Filtering', () => {
  it('should maintain the exact four columns in correct order', () => {
    expect(ORDERED_COLUMNS).toEqual(['Backlog', 'Todo', 'In Progress', 'Done']);
  });

  it('should filter tasks by search query (case-insensitive in title or description)', () => {
    const filters: TaskFilters = { search: 'login', priority: 'all', assignee: 'all' };
    const filtered = filterTasks(MOCK_TASKS, filters);
    expect(filtered).toHaveLength(2); // "Login Page Redesign" and "Google SSO login"
    expect(filtered.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('should filter tasks by priority', () => {
    const filters: TaskFilters = { search: '', priority: 'high', assignee: 'all' };
    const filtered = filterTasks(MOCK_TASKS, filters);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((t) => t.priority === 'high')).toBe(true);
  });

  it('should filter tasks by assignee', () => {
    const filters: TaskFilters = { search: '', priority: 'all', assignee: 'Santanu' };
    const filtered = filterTasks(MOCK_TASKS, filters);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((t) => t.assignee === 'Santanu')).toBe(true);
  });

  it('should combine search, priority, and assignee filters simultaneously', () => {
    // Search = "Login", Priority = High, Assignee = Santanu
    const filters: TaskFilters = {
      search: 'Login',
      priority: 'high',
      assignee: 'Santanu',
    };
    const filtered = filterTasks(MOCK_TASKS, filters);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Login Page Redesign');
    expect(filtered[0].priority).toBe('high');
    expect(filtered[0].assignee).toBe('Santanu');
  });

  it('should return empty array if combined filters match nothing', () => {
    const filters: TaskFilters = {
      search: 'Nonexistent',
      priority: 'high',
      assignee: 'Santanu',
    };
    const filtered = filterTasks(MOCK_TASKS, filters);
    expect(filtered).toHaveLength(0);
  });

  it('should extract correct avatar initials', () => {
    expect(getAssigneeAvatar('Santanu').initials).toBe('SA');
    expect(getAssigneeAvatar('Alex Chen').initials).toBe('AC');
    expect(getAssigneeAvatar('Sarah Miller').initials).toBe('SM');
    expect(getAssigneeAvatar('').initials).toBe('?');
  });

  it('should format relative timestamps accurately', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('just now');
    const pastHour = new Date(Date.now() - 3600000).toISOString();
    expect(formatRelativeTime(pastHour)).toBe('1h ago');
  });
});
