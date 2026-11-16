import React from 'react';

const colorMap = {
  // Order statuses
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  packed: 'bg-purple-100 text-purple-800 border-purple-200',
  dispatched: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',

  // Payment statuses
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  unpaid: 'bg-rose-100 text-rose-800 border-rose-200',

  // Production statuses
  planned: 'bg-sky-100 text-sky-800 border-sky-200',
  in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',

  // Stock / alerts
  in_stock: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  low_stock: 'bg-rose-100 text-rose-800 border-rose-200 font-semibold animate-pulse',
  out_of_stock: 'bg-slate-200 text-slate-800 border-slate-300',

  // Attendance
  present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  absent: 'bg-rose-100 text-rose-800 border-rose-200',
  half_day: 'bg-amber-100 text-amber-800 border-amber-200',
  leave: 'bg-purple-100 text-purple-800 border-purple-200',
  not_marked: 'bg-slate-100 text-slate-600 border-slate-200',

  // Roles
  owner: 'bg-emerald-900 text-emerald-100 border-emerald-800',
  manager: 'bg-blue-900 text-blue-100 border-blue-800',
  sales: 'bg-amber-900 text-amber-100 border-amber-800',
  worker: 'bg-slate-800 text-slate-100 border-slate-700',
};

export const Badge = ({ status, text, className = '' }) => {
  const normalizedKey = (status || '').toLowerCase().replace(/\s+/g, '_');
  const style = colorMap[normalizedKey] || 'bg-slate-100 text-slate-800 border-slate-200';
  const label = text || status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${style} ${className}`}
    >
      {label}
    </span>
  );
};
