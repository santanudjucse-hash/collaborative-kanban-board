import React, { useState, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskModal } from './components/TaskModal';
import { ToastContainer } from './components/Toast';
import { BoardSkeleton } from './components/Loading';
import { useTasks } from './hooks/useTasks';
import { useUrlFilters } from './hooks/useUrlFilters';
import { Status, Task } from './types/Task';
import { ORDERED_COLUMNS, filterTasks } from './utils/taskUtils';
import { getSimulateFailure, setSimulateFailure as setApiSimulateFailure } from './services/api';

export const App: React.FC = () => {
  const {
    columns,
    isLoading,
    connectionStatus,
    toasts,
    pendingTaskIds,
    reconnect,
    removeToast,
    createTaskOptimistic,
    updateTaskOptimistic,
    deleteTaskOptimistic,
    moveTaskOptimistic,
  } = useTasks();

  const { filters, setSearch, setPriority, setAssignee, resetFilters } = useUrlFilters();

  // Failure simulation state for resilience demonstration
  const [simulateFailure, setSimulateFailureState] = useState<boolean>(() => getSimulateFailure());

  const handleToggleSimulateFailure = () => {
    const nextVal = !simulateFailure;
    setSimulateFailureState(nextVal);
    setApiSimulateFailure(nextVal);
  };

  // Modal dialog state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [modalDefaultStatus, setModalDefaultStatus] = useState<Status>('Backlog');

  const handleOpenCreateModal = (status: Status = 'Backlog') => {
    setTaskToEdit(null);
    setModalDefaultStatus(status);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTaskToEdit(null);
  };

  const handleSaveTask = async (taskData: {
    title: string;
    description: string;
    priority: any;
    assignee: string;
    status: Status;
  }) => {
    if (taskToEdit) {
      await updateTaskOptimistic(taskToEdit.id, taskData);
    } else {
      await createTaskOptimistic(taskData);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTaskOptimistic(taskId);
  };

  // Derive unique list of assignees across all active tasks
  const availableAssignees = useMemo(() => {
    const assigneesSet = new Set<string>();
    for (const col of ORDERED_COLUMNS) {
      columns[col]?.forEach((t) => {
        if (t.assignee && t.assignee.trim()) {
          assigneesSet.add(t.assignee.trim());
        }
      });
    }
    return Array.from(assigneesSet).sort();
  }, [columns]);

  // Compute filtered tasks for each column based on search and filters
  const filteredTasksByColumn = useMemo(() => {
    const result: Record<Status, Task[]> = {
      Backlog: [],
      Todo: [],
      'In Progress': [],
      Done: [],
    };

    for (const col of ORDERED_COLUMNS) {
      const items = columns[col] || [];
      result[col] = filterTasks(items, filters);
    }

    return result;
  }, [columns, filters]);

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col text-slate-100">
      {/* Top Navigation Bar */}
      <Navbar
        filters={filters}
        availableAssignees={availableAssignees}
        connectionStatus={connectionStatus}
        simulateFailure={simulateFailure}
        onSearchChange={setSearch}
        onPriorityChange={setPriority}
        onAssigneeChange={setAssignee}
        onResetFilters={resetFilters}
        onAddTask={() => handleOpenCreateModal('Backlog')}
        onReconnect={reconnect}
        onToggleSimulateFailure={handleToggleSimulateFailure}
      />

      {/* Main Board View */}
      {isLoading ? (
        <BoardSkeleton />
      ) : (
        <KanbanBoard
          columns={columns}
          filteredTasksByColumn={filteredTasksByColumn}
          onTaskClick={handleOpenEditModal}
          onAddTask={handleOpenCreateModal}
          onMoveTask={moveTaskOptimistic}
          pendingTaskIds={pendingTaskIds}
        />
      )}

      {/* Task Creation & Editing Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        taskToEdit={taskToEdit}
        defaultStatus={modalDefaultStatus}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
