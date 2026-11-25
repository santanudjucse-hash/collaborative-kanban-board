import React from 'react';
import { Priority, TaskFilters } from '../types/Task';
import { RotateCcw } from 'lucide-react';

interface FiltersProps {
  filters: TaskFilters;
  availableAssignees: string[];
  onPriorityChange: (priority: Priority | 'all') => void;
  onAssigneeChange: (assignee: string) => void;
  onReset: () => void;
}

export const Filters: React.FC<FiltersProps> = ({
  filters,
  availableAssignees,
  onPriorityChange,
  onAssigneeChange,
  onReset,
}) => {
  const isFiltered =
    filters.search !== '' || filters.priority !== 'all' || filters.assignee !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Priority Dropdown */}
      <div className="relative">
        <select
          value={filters.priority}
          onChange={(e) => onPriorityChange(e.target.value as Priority | 'all')}
          aria-label="Filter by priority"
          className="appearance-none bg-slate-900/90 border border-slate-700/80 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer shadow-inner"
        >
          <option value="all">Priority: All</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
          ▼
        </div>
      </div>

      {/* Assignee Dropdown */}
      <div className="relative">
        <select
          value={filters.assignee}
          onChange={(e) => onAssigneeChange(e.target.value)}
          aria-label="Filter by assignee"
          className="appearance-none bg-slate-900/90 border border-slate-700/80 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 cursor-pointer shadow-inner max-w-[150px] truncate"
        >
          <option value="all">Assignee: All</option>
          {availableAssignees.map((assignee) => (
            <option key={assignee} value={assignee}>
              {assignee}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
          ▼
        </div>
      </div>

      {/* Reset Filters button */}
      {isFiltered && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 rounded-lg text-xs text-slate-300 hover:text-white transition-all shadow-sm"
          title="Reset all search and filter conditions"
        >
          <RotateCcw className="w-3 h-3 text-slate-400" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};
