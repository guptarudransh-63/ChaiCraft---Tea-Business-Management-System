import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { formatDate } from '../utils/formatters';
import { HardHat, UserCheck, Factory, Calendar, Clock, Lock } from 'lucide-react';

export const WorkerPortal = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkerData = async () => {
      try {
        setLoading(true);
        const [attRes, batchRes] = await Promise.all([
          api.get('/attendance/my'),
          api.get('/production'),
        ]);
        if (attRes.data.success) setAttendance(attRes.data.data);
        if (batchRes.data.success) {
          // Filter batches where worker is involved or recent
          setBatches(batchRes.data.data.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 flex items-center justify-center text-3xl font-bold shadow-inner">
            👷
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif">Welcome, {user?.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Role: <span className="text-emerald-400 font-semibold">{user?.workerRef?.role || 'Packaging Operator'}</span> | Department: <span className="text-slate-200">{user?.workerRef?.department || 'Packaging'}</span>
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Staff Duty Active</span>
          </span>
        </div>
      </div>

      {/* Role Restriction Banner */}
      <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
        <span>
          As a factory operator, you have access to your personal work schedule and assigned tasks. Sensitive business financials, revenue, and owner settings are restricted.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance History */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>My Attendance Records</span>
            </h3>
            <span className="text-xs text-slate-400">Past 30 Days</span>
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : attendance.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No attendance logged yet</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {attendance.map((a) => (
                <div key={a._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{formatDate(a.date)}</span>
                    <span className="text-slate-400 text-[10px] block font-mono">
                      {a.checkInTime ? `${a.checkInTime} - ${a.checkOutTime}` : 'Off Duty'}
                    </span>
                  </div>
                  <Badge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Production Batches */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Factory className="w-4 h-4 text-blue-700" />
              <span>Current Production Line Tasks</span>
            </h3>
            <span className="text-xs text-slate-400">Factory Floor</span>
          </div>

          {loading ? (
            <TableSkeleton rows={4} cols={3} />
          ) : batches.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No production tasks assigned currently</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {batches.map((b) => (
                <div key={b._id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-emerald-800">{b.batchNumber}</span>
                    <h4 className="font-bold text-slate-800 mt-0.5">{b.product?.name}</h4>
                    <span className="text-slate-400 text-[11px] block">
                      Target: {b.plannedQuantity} pkts • Date: {formatDate(b.productionDate)}
                    </span>
                  </div>
                  <Badge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
