import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDateTime } from '../utils/formatters';
import { ShieldCheck, Search, Filter } from 'lucide-react';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = filterEntity ? `/audit-logs?entity=${filterEntity}` : '/audit-logs';
      const res = await api.get(url);
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterEntity]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Security & Business Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable log of price changes, stock adjustments, order cancellations & payments.
          </p>
        </div>

        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        >
          <option value="">All Entities</option>
          <option value="Product">Products / Stock</option>
          <option value="Order">Sales Orders</option>
          <option value="Payment">Payments</option>
          <option value="ProductionBatch">Production Batches</option>
          <option value="User">User Accounts</option>
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No audit entries found"
          description="Actions performed by staff will appear here."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4">Details / Change Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{log.entity}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900">{log.performedBy?.name}</span>
                    <span className="text-[10px] text-slate-400 block capitalize">{log.performedBy?.role}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                    {log.details || 'State transition'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
