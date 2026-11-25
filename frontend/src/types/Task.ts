export type Priority = 'low' | 'medium' | 'high';
export type Status = 'Backlog' | 'Todo' | 'In Progress' | 'Done';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assignee: string;
  status: Status;
  position: number;
  updatedAt: string;
}

export type BoardColumns = Record<Status, Task[]>;

export interface TaskFilters {
  search: string;
  priority: Priority | 'all';
  assignee: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
