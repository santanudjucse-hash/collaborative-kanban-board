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

export const api = {
  /**
   * Fetch all tasks grouped by status
   */
  async getBoard(): Promise<BoardColumns> {
    const response = await apiClient.get<BoardColumns>('/board');
    return response.data;
  },

  /**
   * Create a new task
   */
  async createTask(taskData: Partial<Task>): Promise<Task> {
    const response = await apiClient.post<Task>('/tasks', taskData);
    return response.data;
  },

  /**
   * Update an existing task
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const response = await apiClient.patch<Task>(`/tasks/${id}`, updates);
    return response.data;
  },

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<{ success: boolean; id: string }> {
    const response = await apiClient.delete<{ success: boolean; id: string }>(`/tasks/${id}`);
    return response.data;
  },
};
