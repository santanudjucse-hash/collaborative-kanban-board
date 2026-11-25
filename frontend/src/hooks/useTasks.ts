import { useState, useEffect, useCallback, useRef } from 'react';
import { BoardColumns, Status, Task, ToastMessage } from '../types/Task';
import { api } from '../services/api';
import { useSSE } from './useSSE';
import { ORDERED_COLUMNS } from '../utils/taskUtils';

const EMPTY_BOARD: BoardColumns = {
  Backlog: [],
  Todo: [],
  'In Progress': [],
  Done: [],
};

const createSnapshot = (board: BoardColumns): BoardColumns => ({
  Backlog: (board.Backlog || []).map((t) => ({ ...t })),
  Todo: (board.Todo || []).map((t) => ({ ...t })),
  'In Progress': (board['In Progress'] || []).map((t) => ({ ...t })),
  Done: (board.Done || []).map((t) => ({ ...t })),
});

export function useTasks() {
  const [columns, setColumns] = useState<BoardColumns>(EMPTY_BOARD);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Track task IDs with ongoing optimistic operations to prevent race conditions & unwanted overwrite
  const pendingOperationsRef = useRef<Set<string>>(new Set());
  const [, setPendingVersion] = useState(0);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 1. Initial Data Fetch
  const fetchBoard = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getBoard();
      // Ensure all 4 columns exist
      const populated: BoardColumns = {
        Backlog: data.Backlog || [],
        Todo: data.Todo || [],
        'In Progress': data['In Progress'] || [],
        Done: data.Done || [],
      };
      setColumns(populated);
    } catch (err: any) {
      console.error('[Board] Failed to load board:', err);
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not fetch tasks from server. Reconnecting...',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // 2. Real-Time Collaboration SSE Handlers with Conflict Resolution
  const handleTaskCreated = useCallback((task: Task) => {
    setColumns((prev) => {
      // Check if task is already present (e.g. from local optimistic insert)
      const columnTasks = prev[task.status] || [];
      const exists = columnTasks.some((t) => t.id === task.id);
      if (exists) return prev;

      // Remove any temporary card matching this title/assignee or insert newly
      const updatedColumn = [...columnTasks.filter((t) => !t.id.startsWith('temp-')), task];
      updatedColumn.sort((a, b) => a.position - b.position);

      return {
        ...prev,
        [task.status]: updatedColumn,
      };
    });
  }, []);

  const handleTaskUpdated = useCallback((serverTask: Task) => {
    // CONFLICT RESOLUTION: If current user is currently performing an optimistic
    // operation on this task, do NOT overwrite local changes with stale broadcast
    if (pendingOperationsRef.current.has(serverTask.id)) {
      console.log(`[Conflict Guard] Ignoring SSE update for task ${serverTask.id} due to active pending local operation.`);
      return;
    }

    setColumns((prev) => {
      const nextBoard: BoardColumns = { ...prev };
      let foundInColumn: Status | null = null;

      // Locate where the task currently lives in local state
      for (const col of ORDERED_COLUMNS) {
        if (nextBoard[col].some((t) => t.id === serverTask.id)) {
          foundInColumn = col;
          break;
        }
      }

      // If status changed or not found
      if (foundInColumn && foundInColumn !== serverTask.status) {
        nextBoard[foundInColumn] = nextBoard[foundInColumn].filter((t) => t.id !== serverTask.id);
      }

      // Update or add in destination column
      const destColumn = nextBoard[serverTask.status] || [];
      const filtered = destColumn.filter((t) => t.id !== serverTask.id);
      nextBoard[serverTask.status] = [...filtered, serverTask].sort((a, b) => a.position - b.position);

      return nextBoard;
    });
  }, []);

  const handleTaskDeleted = useCallback(({ id }: { id: string; status?: string }) => {
    setColumns((prev) => {
      const nextBoard: BoardColumns = { ...prev };
      for (const col of ORDERED_COLUMNS) {
        if (nextBoard[col].some((t) => t.id === id)) {
          nextBoard[col] = nextBoard[col].filter((t) => t.id !== id);
          break;
        }
      }
      return nextBoard;
    });
  }, []);

  // Connect Server-Sent Events
  const { connectionStatus, reconnect } = useSSE({
    onTaskCreated: handleTaskCreated,
    onTaskUpdated: handleTaskUpdated,
    onTaskDeleted: handleTaskDeleted,
  });

  // 3. Optimistic Operations with Automatic Rollback

  /**
   * OPTIMISTIC TASK CREATION
   */
  const createTaskOptimistic = useCallback(
    async (taskData: Omit<Task, 'id' | 'position' | 'updatedAt'>) => {
      const targetStatus = taskData.status || 'Backlog';
      const tempId = `temp-${Date.now()}`;
      const snapshot = createSnapshot(columns);

      // 1. Create optimistic task
      const currentList = columns[targetStatus] || [];
      const optimisticTask: Task = {
        ...taskData,
        id: tempId,
        position: currentList.length,
        updatedAt: new Date().toISOString(),
      };

      // 2. Immediate local UI update
      setColumns((prev) => ({
        ...prev,
        [targetStatus]: [...prev[targetStatus], optimisticTask],
      }));

      pendingOperationsRef.current.add(tempId);
      setPendingVersion((v) => v + 1);

      try {
        // 3. API Request
        const createdTask = await api.createTask({
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          assignee: taskData.assignee,
          status: targetStatus,
        });

        // 4. Reconcile temporary ID with real server ID
        setColumns((prev) => ({
          ...prev,
          [targetStatus]: prev[targetStatus].map((t) => (t.id === tempId ? createdTask : t)),
        }));

        addToast({
          type: 'success',
          title: 'Task Created',
          message: `"${createdTask.title}" added to ${createdTask.status}.`,
        });

        return createdTask;
      } catch (err: any) {
        // 5. Automatic Rollback on failure
        console.error('[Optimistic Error] Failed to create task, rolling back:', err);
        setColumns(snapshot);
        addToast({
          type: 'error',
          title: 'Failed to Create Task',
          message: err?.response?.data?.error || 'Server error occurred. Changes rolled back.',
        });
        throw err;
      } finally {
        pendingOperationsRef.current.delete(tempId);
        setPendingVersion((v) => v + 1);
      }
    },
    [columns, addToast]
  );

  /**
   * OPTIMISTIC TASK UPDATE (Details / Fields)
   */
  const updateTaskOptimistic = useCallback(
    async (id: string, updates: Partial<Task>) => {
      const snapshot = createSnapshot(columns);

      // 1. Immediate local UI update
      setColumns((prev) => {
        const nextBoard: BoardColumns = createSnapshot(prev);
        let found = false;

        for (const col of ORDERED_COLUMNS) {
          const index = nextBoard[col].findIndex((t) => t.id === id);
          if (index !== -1) {
            found = true;
            const updatedTask = {
              ...nextBoard[col][index],
              ...updates,
              updatedAt: new Date().toISOString(),
            };

            // If status changed
            if (updates.status && updates.status !== col) {
              nextBoard[col] = nextBoard[col].filter((t) => t.id !== id);
              nextBoard[updates.status] = [...nextBoard[updates.status], updatedTask].sort(
                (a, b) => a.position - b.position
              );
            } else {
              nextBoard[col][index] = updatedTask;
            }
            break;
          }
        }

        return found ? nextBoard : prev;
      });

      pendingOperationsRef.current.add(id);
      setPendingVersion((v) => v + 1);

      try {
        // 2. API Request
        const serverTask = await api.updateTask(id, updates);

        // 3. Reconcile
        setColumns((prev) => {
          const nextBoard: BoardColumns = { ...prev };
          for (const col of ORDERED_COLUMNS) {
            const index = nextBoard[col].findIndex((t) => t.id === id);
            if (index !== -1) {
              if (serverTask.status !== col) {
                nextBoard[col] = nextBoard[col].filter((t) => t.id !== id);
                nextBoard[serverTask.status] = [...nextBoard[serverTask.status], serverTask].sort(
                  (a, b) => a.position - b.position
                );
              } else {
                nextBoard[col][index] = serverTask;
              }
              break;
            }
          }
          return nextBoard;
        });

        addToast({
          type: 'success',
          title: 'Task Updated',
          message: `Saved changes to "${serverTask.title}".`,
        });

        return serverTask;
      } catch (err: any) {
        // 4. Automatic Rollback on failure
        console.error('[Optimistic Error] Failed to update task, rolling back:', err);
        setColumns(snapshot);
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: err?.response?.data?.error || 'Could not update task. Reverted to previous state.',
        });
        throw err;
      } finally {
        pendingOperationsRef.current.delete(id);
        setPendingVersion((v) => v + 1);
      }
    },
    [columns, addToast]
  );

  /**
   * OPTIMISTIC TASK DELETION
   */
  const deleteTaskOptimistic = useCallback(
    async (id: string) => {
      const snapshot = createSnapshot(columns);
      let deletedTaskTitle = 'Task';

      // 1. Immediate local UI update
      setColumns((prev) => {
        const nextBoard: BoardColumns = { ...prev };
        for (const col of ORDERED_COLUMNS) {
          const target = nextBoard[col].find((t) => t.id === id);
          if (target) {
            deletedTaskTitle = target.title;
            nextBoard[col] = nextBoard[col].filter((t) => t.id !== id);
            break;
          }
        }
        return nextBoard;
      });

      pendingOperationsRef.current.add(id);
      setPendingVersion((v) => v + 1);

      try {
        // 2. API Request
        await api.deleteTask(id);

        addToast({
          type: 'info',
          title: 'Task Deleted',
          message: `"${deletedTaskTitle}" has been removed.`,
        });
      } catch (err: any) {
        // 3. Rollback on failure
        console.error('[Optimistic Error] Failed to delete task, rolling back:', err);
        setColumns(snapshot);
        addToast({
          type: 'error',
          title: 'Deletion Failed',
          message: err?.response?.data?.error || 'Could not delete task. Restored to board.',
        });
        throw err;
      } finally {
        pendingOperationsRef.current.delete(id);
        setPendingVersion((v) => v + 1);
      }
    },
    [columns, addToast]
  );

  /**
   * OPTIMISTIC DRAG & DROP MOVE (Inter-column or intra-column)
   */
  const moveTaskOptimistic = useCallback(
    async (taskId: string, targetStatus: Status, targetIndex: number) => {
      const snapshot = createSnapshot(columns);

      // Find original task
      let originalTask: Task | null = null;
      let sourceStatus: Status | null = null;

      for (const col of ORDERED_COLUMNS) {
        const found = columns[col].find((t) => t.id === taskId);
        if (found) {
          originalTask = found;
          sourceStatus = col;
          break;
        }
      }

      if (!originalTask || !sourceStatus) return;

      // Check if position or column actually changed
      const sourceCol = [...columns[sourceStatus]];
      const currentIndex = sourceCol.findIndex((t) => t.id === taskId);

      if (sourceStatus === targetStatus && currentIndex === targetIndex) {
        return; // No-op
      }

      // 1. Calculate new board optimistically
      const nextBoard: BoardColumns = { ...columns };

      if (sourceStatus === targetStatus) {
        // Intra-column reorder
        const items = [...nextBoard[sourceStatus]];
        const [moved] = items.splice(currentIndex, 1);
        items.splice(targetIndex, 0, moved);
        nextBoard[sourceStatus] = items.map((item, idx) => ({
          ...item,
          position: idx,
        }));
      } else {
        // Inter-column move
        nextBoard[sourceStatus] = nextBoard[sourceStatus]
          .filter((t) => t.id !== taskId)
          .map((item, idx) => ({ ...item, position: idx }));

        const destItems = [...nextBoard[targetStatus]];
        const movedItem: Task = {
          ...originalTask,
          status: targetStatus,
          position: targetIndex,
        };
        destItems.splice(targetIndex, 0, movedItem);
        nextBoard[targetStatus] = destItems.map((item, idx) => ({
          ...item,
          position: idx,
        }));
      }

      // 2. Immediate local UI update
      setColumns(nextBoard);
      pendingOperationsRef.current.add(taskId);
      setPendingVersion((v) => v + 1);

      try {
        // 3. API Request
        await api.updateTask(taskId, {
          status: targetStatus,
          position: targetIndex,
        });
      } catch (err: any) {
        // 4. Rollback on failure
        console.error('[Optimistic Error] Failed to persist drag move, rolling back:', err);
        setColumns(snapshot);
        addToast({
          type: 'error',
          title: 'Move Failed',
          message: err?.response?.data?.error || 'Network error while moving task. Reverted position.',
        });
      } finally {
        pendingOperationsRef.current.delete(taskId);
        setPendingVersion((v) => v + 1);
      }
    },
    [columns, addToast]
  );

  return {
    columns,
    isLoading,
    connectionStatus,
    toasts,
    pendingTaskIds: pendingOperationsRef.current,
    reconnect,
    addToast,
    removeToast,
    createTaskOptimistic,
    updateTaskOptimistic,
    deleteTaskOptimistic,
    moveTaskOptimistic,
  };
}
