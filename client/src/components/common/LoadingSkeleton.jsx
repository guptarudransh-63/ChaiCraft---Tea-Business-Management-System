import React from 'react';

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="h-11 bg-slate-100 border-b border-slate-200 flex items-center px-4 space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-200 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="h-14 px-4 flex items-center space-x-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 bg-slate-100 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="flex justify-between items-center">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-8 w-8 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-7 w-28 bg-slate-200 rounded" />
          <div className="h-3 w-36 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
};
