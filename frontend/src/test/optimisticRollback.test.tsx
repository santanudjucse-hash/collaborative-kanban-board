import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTasks } from '../hooks/useTasks';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getBoard: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
  getSimulateFailure: vi.fn().mockReturnValue(false),
  setSimulateFailure: vi.fn(),
}));

describe('Optimistic Updates and Automatic Rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getBoard as any).mockResolvedValue({
      Backlog: [
        {
          id: 'task-1',
          title: 'Initial Task',
          description: 'Description 1',
          priority: 'medium',
          assignee: 'Santanu',
          status: 'Backlog',
          position: 0,
          updatedAt: new Date().toISOString(),
        },
      ],
      Todo: [],
      'In Progress': [],
      Done: [],
    });
  });

  it('rolls back optimistic task creation when API call fails', async () => {
    // Simulate API rejection / server failure
    (api.createTask as any).mockRejectedValue(new Error('Network error 500'));

    const { result } = renderHook(() => useTasks());

    // Wait for initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.columns.Backlog).toHaveLength(1);

    // Attempt optimistic creation
    await act(async () => {
      try {
        await result.current.createTaskOptimistic({
          title: 'Will Fail',
          description: 'Fail desc',
          priority: 'high',
          assignee: 'Santanu',
          status: 'Backlog',
        });
      } catch {
        // Expected to reject
      }
    });

    // Verification: Board rolled back to original state (1 task only), and error toast was dispatched!
    expect(result.current.columns.Backlog).toHaveLength(1);
    expect(result.current.columns.Backlog[0].title).toBe('Initial Task');
    expect(result.current.toasts.some((t) => t.type === 'error')).toBe(true);
  });

  it('rolls back optimistic task update when API call fails', async () => {
    (api.updateTask as any).mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await Promise.resolve();
    });

    // Attempt optimistic edit
    await act(async () => {
      try {
        await result.current.updateTaskOptimistic('task-1', {
          title: 'Changed Title',
          priority: 'high',
        });
      } catch {
        // Expected to reject
      }
    });

    // Verification: Rolled back to original title
    expect(result.current.columns.Backlog[0].title).toBe('Initial Task');
    expect(result.current.toasts.some((t) => t.type === 'error')).toBe(true);
  });

  it('rolls back optimistic task deletion when API call fails', async () => {
    (api.deleteTask as any).mockRejectedValue(new Error('Delete rejected'));

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await Promise.resolve();
    });

    // Attempt optimistic deletion
    await act(async () => {
      try {
        await result.current.deleteTaskOptimistic('task-1');
      } catch {
        // Expected
      }
    });

    // Verification: Task restored back to column
    expect(result.current.columns.Backlog).toHaveLength(1);
    expect(result.current.columns.Backlog[0].id).toBe('task-1');
    expect(result.current.toasts.some((t) => t.type === 'error')).toBe(true);
  });

  it('rolls back optimistic move between columns when API fails', async () => {
    (api.updateTask as any).mockRejectedValue(new Error('Move failed'));

    const { result } = renderHook(() => useTasks());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.columns.Backlog).toHaveLength(1);
    expect(result.current.columns.Done).toHaveLength(0);

    // Move from Backlog to Done
    await act(async () => {
      await result.current.moveTaskOptimistic('task-1', 'Done', 0);
    });

    // Verification: Rolled back - task still in Backlog, not in Done
    expect(result.current.columns.Backlog).toHaveLength(1);
    expect(result.current.columns.Done).toHaveLength(0);
    expect(result.current.toasts.some((t) => t.type === 'error')).toBe(true);
  });
});

describe('URL State Management (useUrlFilters)', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('initializes default filters when URL has no query params', () => {
    const { result } = renderHook(() => useUrlFilters());
    expect(result.current.filters).toEqual({
      search: '',
      priority: 'all',
      assignee: 'all',
    });
  });

  it('initializes filters correctly from URL query parameters', () => {
    window.history.pushState(
      {},
      '',
      '/?search=Login&priority=high&assignee=Santanu'
    );

    const { result } = renderHook(() => useUrlFilters());
    expect(result.current.filters).toEqual({
      search: 'Login',
      priority: 'high',
      assignee: 'Santanu',
    });
  });

  it('updates URL search query parameter when setSearch is called', () => {
    const { result } = renderHook(() => useUrlFilters());

    act(() => {
      result.current.setSearch('Dashboard');
    });

    expect(window.location.search).toContain('search=Dashboard');
    expect(result.current.filters.search).toBe('Dashboard');
  });

  it('updates URL priority and assignee query parameters', () => {
    const { result } = renderHook(() => useUrlFilters());

    act(() => {
      result.current.setPriority('high');
      result.current.setAssignee('Santanu');
    });

    expect(window.location.search).toContain('priority=high');
    expect(window.location.search).toContain('assignee=Santanu');
  });

  it('resets URL query params when resetFilters is called', () => {
    window.history.pushState({}, '', '/?search=Login&priority=high');
    const { result } = renderHook(() => useUrlFilters());

    act(() => {
      result.current.resetFilters();
    });

    expect(window.location.search).toBe('');
    expect(result.current.filters).toEqual({
      search: '',
      priority: 'all',
      assignee: 'all',
    });
  });
});
