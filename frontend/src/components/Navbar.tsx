import React from 'react';
import { ConnectionStatus, Priority, TaskFilters } from '../types/Task';
import { SearchBar } from './SearchBar';
import { Filters } from './Filters';
import { KanbanSquare, Plus, Wifi, WifiOff, RefreshCcw, Bug } from 'lucide-react';

interface NavbarProps {
  filters: TaskFilters;
  availableAssignees: string[];
  connectionStatus: ConnectionStatus;
  simulateFailure: boolean;
  onSearchChange: (search: string) => void;
  onPriorityChange: (priority: Priority | 'all') => void;
  onAssigneeChange: (assignee: string) => void;
  onResetFilters: () => void;
  onAddTask: () => void;
  onReconnect: () => void;
  onToggleSimulateFailure: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  filters,
  availableAssignees,
  connectionStatus,
  simulateFailure,
  onSearchChange,
  onPriorityChange,
  onAssigneeChange,
  onResetFilters,
  onAddTask,
  onReconnect,
  onToggleSimulateFailure,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left Side: Brand, Board Title & Status */}
        <div className="flex items-center justify-between lg:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <KanbanSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Kanban Board
                </span>
                <span className="text-xs text-slate-600">•</span>
                <span className="text-xs text-slate-400">Collaborative Workspace</span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Product Engineering Board
              </h1>
            </div>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300"
                title="Real-Time Sync active via Server-Sent Events"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>Live SSE</span>
              </div>
            )}

            {connectionStatus === 'connecting' && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/30 text-[11px] font-semibold text-amber-300"
                title="Reconnecting to real-time events..."
              >
                <RefreshCcw className="w-3 h-3 animate-spin text-amber-400" />
                <span>Connecting</span>
              </div>
            )}

            {connectionStatus === 'disconnected' && (
              <button
                onClick={onReconnect}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-[11px] font-semibold text-rose-300 transition-colors"
                title="Offline. Click to reconnect."
              >
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span>Offline (Retry)</span>
              </button>
            )}
          </div>
        </div>

        {/* Center / Right: Search, Filters, Failure Simulation & Add Task */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <SearchBar value={filters.search} onChange={onSearchChange} />

          <Filters
            filters={filters}
            availableAssignees={availableAssignees}
            onPriorityChange={onPriorityChange}
            onAssigneeChange={onAssigneeChange}
            onReset={onResetFilters}
          />

          {/* Simulate Failure Toggle (Resilience / Rollback Verification) */}
          <button
            onClick={onToggleSimulateFailure}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              simulateFailure
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/40 shadow-sm'
                : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle simulated API errors to observe optimistic rollback in action"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>{simulateFailure ? 'Errors Simulated (500)' : 'Simulate Failure'}</span>
          </button>

          {/* Add Task Button */}
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>
    </header>
  );
};
