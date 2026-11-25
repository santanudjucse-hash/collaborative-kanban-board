import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../types/Task';
import { PRIORITY_CONFIG, getAssigneeAvatar, formatRelativeTime } from '../utils/taskUtils';
import { Clock, RefreshCw } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  isPending?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, isPending = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const avatar = getAssigneeAvatar(task.assignee);
  const relativeTime = formatRelativeTime(task.updatedAt);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      className={`group relative bg-slate-900/90 hover:bg-slate-850 border rounded-xl p-3.5 flex flex-col gap-2.5 transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
        isDragging
          ? 'opacity-40 border-indigo-500/50 shadow-2xl scale-[1.02] ring-2 ring-indigo-500/30'
          : 'border-slate-800 hover:border-slate-700/80 shadow-md hover:shadow-lg'
      } ${isPending ? 'ring-1 ring-amber-500/30' : ''}`}
    >
      {/* Top row: Priority badge + Pending indicator */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${priorityMeta.bg} ${priorityMeta.text} ${priorityMeta.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
          {priorityMeta.label}
        </span>

        {isPending && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            <span>Syncing</span>
          </span>
        )}
      </div>

      {/* Task Title */}
      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-200 leading-snug line-clamp-2 transition-colors">
        {task.title}
      </h3>

      {/* Short Description */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer: Assignee & Last updated */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`w-5 h-5 rounded-full ${avatar.bg} text-white flex items-center justify-center font-bold text-[10px] shadow-sm flex-shrink-0`}
            title={task.assignee}
          >
            {avatar.initials}
          </div>
          <span className="truncate max-w-[100px] text-slate-300 font-medium">
            {task.assignee}
          </span>
        </div>

        {relativeTime && (
          <div className="flex items-center gap-1 text-slate-400 flex-shrink-0" title={`Updated: ${task.updatedAt}`}>
            <Clock className="w-3 h-3" />
            <span>{relativeTime}</span>
          </div>
        )}
      </div>
    </div>
  );
};
