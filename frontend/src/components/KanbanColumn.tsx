import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Status, Task } from '../types/Task';
import { STATUS_CONFIG } from '../utils/taskUtils';
import { TaskCard } from './TaskCard';
import { Plus, Inbox } from 'lucide-react';

interface KanbanColumnProps {
  status: Status;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (status: Status) => void;
  pendingTaskIds: Set<string>;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onTaskClick,
  onAddTask,
  pendingTaskIds,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: 'Column',
      status,
    },
  });

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Backlog;
  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full min-h-[500px] max-h-[calc(100vh-140px)] rounded-2xl bg-slate-900/50 border border-t-4 transition-all duration-200 shadow-xl overflow-hidden ${
        config.borderTop
      } ${
        isOver
          ? 'border-indigo-500/60 bg-indigo-950/20 ring-2 ring-indigo-500/30'
          : 'border-slate-800/80 hover:border-slate-700/60'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/30">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-slate-100 tracking-tight">{config.label}</h2>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${config.badgeBg}`}
          >
            {tasks.length}
          </span>
        </div>

        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={`Add task to ${config.label}`}
          aria-label={`Add task to ${config.label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Droppable Task List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              isPending={pendingTaskIds.has(task.id)}
            />
          ))}
        </SortableContext>

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-800/70 rounded-xl my-2">
            <Inbox className="w-8 h-8 text-slate-600 mb-2 stroke-1" />
            <p className="text-xs font-medium text-slate-400">No tasks in this column</p>
            <button
              onClick={() => onAddTask(status)}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add a task</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
