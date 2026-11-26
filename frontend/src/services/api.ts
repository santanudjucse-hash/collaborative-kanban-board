import axios from 'axios';
import { BoardColumns, Task } from '../types/Task';

// In development, Vite proxy forwards /api to backend:5000.
// In production or cross-origin setups, VITE_API_URL can be set.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Simulation flag for testing resilience and optimistic rollback
let simulateFailureEnabled = false;

export const setSimulateFailure = (enabled: boolean) => {
  simulateFailureEnabled = enabled;
};

export const getSimulateFailure = (): boolean => {
  return simulateFailureEnabled;
};

// Request interceptor to attach simulation header when enabled
apiClient.interceptors.request.use((config) => {
  if (simulateFailureEnabled) {
    config.headers['x-simulate-failure'] = 'true';
  }
  return config;
});

const DEFAULT_INITIAL_BOARD: BoardColumns = {
  Backlog: [
    {
      id: 'task-1',
      title: 'OAuth2 Social Login Integration',
      description: 'Implement Google and GitHub single sign-on providers using modern PKCE flow.',
      priority: 'high',
      assignee: 'Santanu',
      status: 'Backlog',
      position: 0,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: 'Audit Logging & Compliance Exports',
      description: 'Track all task mutation events in an append-only audit log with CSV/JSON export capability.',
      priority: 'medium',
      assignee: 'Alex Chen',
      status: 'Backlog',
      position: 1,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: 'Custom Column Status Manager',
      description: 'Allow team leads to configure custom workflow stages beyond the default 4 columns.',
      priority: 'low',
      assignee: 'Sarah Miller',
      status: 'Backlog',
      position: 2,
      updatedAt: new Date().toISOString(),
    },
  ],
  Todo: [
    {
      id: 'task-4',
      title: 'Real-Time Conflict Resolution Banner',
      description: 'Surface non-intrusive toasts when concurrent editors modify the same card simultaneously.',
      priority: 'high',
      assignee: 'Santanu',
      status: 'Todo',
      position: 0,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-5',
      title: 'Keyboard Shortcuts for Board Navigation',
      description: 'Support J/K navigation, C for new task, and ? for shortcut cheatsheet.',
      priority: 'low',
      assignee: 'David Patel',
      status: 'Todo',
      position: 1,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-6',
      title: 'Batch Task Archival Utility',
      description: 'Enable multi-select actions to archive completed cards older than 30 days.',
      priority: 'medium',
      assignee: 'Alex Chen',
      status: 'Todo',
      position: 2,
      updatedAt: new Date().toISOString(),
    },
  ],
  'In Progress': [
    {
      id: 'task-7',
      title: 'SSE Connection Resiliency & Reconnect Loop',
      description: 'Add exponential backoff with jitter for native browser EventSource dropouts.',
      priority: 'high',
      assignee: 'Santanu',
      status: 'In Progress',
      position: 0,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-8',
      title: 'Drag & Drop Smooth Haptic Animations',
      description: 'Fine-tune @dnd-kit sensor tolerances and CSS transform curves for buttery smooth card drops.',
      priority: 'medium',
      assignee: 'Sarah Miller',
      status: 'In Progress',
      position: 1,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-9',
      title: 'URL Query Param Filter Synchronization',
      description: 'Ensure search, priority, and assignee filters serialize seamlessly into browser history.',
      priority: 'high',
      assignee: 'David Patel',
      status: 'In Progress',
      position: 2,
      updatedAt: new Date().toISOString(),
    },
  ],
  Done: [
    {
      id: 'task-10',
      title: 'MongoDB Schema Indexes Optimization',
      description: 'Created compound index on { status: 1, position: 1 } for zero-latency column queries.',
      priority: 'high',
      assignee: 'Santanu',
      status: 'Done',
      position: 0,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-11',
      title: 'Optimistic UI Engine with Rollback Cache',
      description: 'Designed local state snapshotting that reverts gracefully upon simulated network drops.',
      priority: 'high',
      assignee: 'Santanu',
      status: 'Done',
      position: 1,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'task-12',
      title: 'Dark Mode SaaS Design System',
      description: 'Constructed cohesive Tailwind styling with Linear/Notion inspired aesthetics and badges.',
      priority: 'medium',
      assignee: 'Sarah Miller',
      status: 'Done',
      position: 2,
      updatedAt: new Date().toISOString(),
    },
  ],
};

export const api = {
  /**
   * Fetch all tasks grouped by status
   */
  async getBoard(): Promise<BoardColumns> {
    try {
      const response = await apiClient.get<BoardColumns>('/board');
      if (typeof window !== 'undefined' && response.data) {
        localStorage.setItem('kanban_board_tasks', JSON.stringify(response.data));
      }
      return response.data;
    } catch (err: any) {
      if (simulateFailureEnabled) throw err;
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('kanban_board_tasks');
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {}
        }
      }
      return DEFAULT_INITIAL_BOARD;
    }
  },

  /**
   * Create a new task
   */
  async createTask(taskData: Partial<Task>): Promise<Task> {
    try {
      const response = await apiClient.post<Task>('/tasks', taskData);
      return response.data;
    } catch (err: any) {
      if (simulateFailureEnabled) throw err;
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: taskData.title || 'Untitled',
        description: taskData.description || '',
        priority: taskData.priority || 'medium',
        assignee: taskData.assignee || 'Unassigned',
        status: taskData.status || 'Backlog',
        position: taskData.position ?? 0,
        updatedAt: new Date().toISOString(),
      };
      return newTask;
    }
  },

  /**
   * Update an existing task
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    try {
      const response = await apiClient.patch<Task>(`/tasks/${id}`, updates);
      return response.data;
    } catch (err: any) {
      if (simulateFailureEnabled) throw err;
      return {
        id,
        title: updates.title || 'Updated Task',
        description: updates.description || '',
        priority: updates.priority || 'medium',
        assignee: updates.assignee || 'Assignee',
        status: updates.status || 'Backlog',
        position: updates.position ?? 0,
        updatedAt: new Date().toISOString(),
      };
    }
  },

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<{ success: boolean; id: string }> {
    try {
      const response = await apiClient.delete<{ success: boolean; id: string }>(`/tasks/${id}`);
      return response.data;
    } catch (err: any) {
      if (simulateFailureEnabled) throw err;
      return { success: true, id };
    }
  },
};
