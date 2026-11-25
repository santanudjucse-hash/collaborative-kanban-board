import React from 'react';
import { ORDERED_COLUMNS } from '../utils/taskUtils';

export const BoardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl mx-auto px-4 py-8">
      {ORDERED_COLUMNS.map((col) => (
        <div
          key={col}
          className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 animate-pulse"
        >
          {/* Column Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 bg-slate-800 rounded-md" />
            <div className="h-5 w-8 bg-slate-800 rounded-full" />
          </div>

          {/* Cards Skeletons */}
          <div className="flex flex-col gap-3 mt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-2.5"
              >
                <div className="h-4 w-14 bg-slate-700/50 rounded-full" />
                <div className="h-4 w-3/4 bg-slate-700/70 rounded-md" />
                <div className="h-3 w-5/6 bg-slate-800 rounded-md" />
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-700" />
                    <div className="h-3 w-16 bg-slate-700 rounded-md" />
                  </div>
                  <div className="h-3 w-12 bg-slate-800 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
