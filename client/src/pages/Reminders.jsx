import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate } from '../utils/formatters';
import {
  BellRing,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export const Reminders = () => {
  const { hasRole, isOwner } = useAuth();
  const { success, error } = useToast();

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'license',
    dueDate: '',
    reminderDaysBefore: '30',
    notes: '',
  });

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reminders');
      if (res.data.success) {
        setReminders(res.data.data);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleResolve = async (id) => {
    try {
      await api.put(`/reminders/${id}`, { status: 'resolved' });
      success('Reminder marked as resolved');
      fetchReminders();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to resolve reminder');
    }
  };

  const handleSaveReminder = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reminders', {
        ...form,
        reminderDaysBefore: Number(form.reminderDaysBefore),
      });
      success('Reminder created');
      setShowAddModal(false);
      setForm({
        title: '',
        category: 'license',
        dueDate: '',
        reminderDaysBefore: '30',
        notes: '',
      });
      fetchReminders();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to create reminder');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Expiry & Business Reminders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Never miss food safety renewals, batch shelf expirations, GST filings or calibrations.
          </p>
        </div>

        {hasRole('owner', 'manager') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Reminder</span>
          </button>
        )}
      </div>

      {/* Reminders List Cards */}
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="No active reminders"
          description="Add regulatory license, tax filing or machine maintenance alerts."
          actionText="Create Reminder"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reminders.map((r) => {
            const isDueSoon = r.computedStatus === 'due_soon';
            const isExpired = r.computedStatus === 'expired';
            const isResolved = r.status === 'resolved';

            return (
              <div
                key={r._id}
                className={`p-5 rounded-xl border bg-white shadow-xs flex flex-col justify-between transition ${
                  isExpired
                    ? 'border-rose-300 bg-rose-50/20'
                    : isDueSoon
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {r.category.replace(/_/g, ' ')}
                    </span>
                    <Badge
                      status={
                        isResolved
                          ? 'completed'
                          : isExpired
                          ? 'cancelled'
                          : isDueSoon
                          ? 'in_progress'
                          : 'planned'
                      }
                      text={
                        isResolved
                          ? 'Resolved'
                          : isExpired
                          ? 'Expired'
                          : isDueSoon
                          ? `Due in ${r.daysRemaining} days`
                          : `Upcoming`
                      }
                    />
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-3">{r.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{r.notes || 'No extra notes'}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Due: <strong className="text-slate-800">{formatDate(r.dueDate)}</strong></span>
                    </span>
                    <span>Alert {r.reminderDaysBefore}d prior</span>
                  </div>
                </div>

                {!isResolved && (
                  <div className="mt-4 pt-2">
                    <button
                      onClick={() => handleResolve(r._id)}
                      className="w-full py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark as Resolved</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Reminder Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Schedule Business Reminder"
        subtitle="Set license renewal, maintenance calibration or expiry alerts"
      >
        <form onSubmit={handleSaveReminder} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Reminder Title
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. FSSAI License Renewal Inspection"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="license">Food Safety / FSSAI License</option>
                <option value="tax_filing">GST / Tax Filing</option>
                <option value="equipment_maintenance">Equipment Calibration</option>
                <option value="product_expiry">Finished Product Expiry</option>
                <option value="raw_material_expiry">Raw Tea Leaf Shelf Expiry</option>
                <option value="supplier_contract">Supplier Agreement</option>
                <option value="custom">General Reminder</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Target Due Date
              </label>
              <input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Alert Trigger Window (Days Before Due Date)
            </label>
            <input
              type="number"
              min="1"
              value={form.reminderDaysBefore}
              onChange={(e) => setForm({ ...form, reminderDaysBefore: e.target.value })}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Notes & Action Steps
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Contact person, inspector phone, document requirements..."
              rows={2}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Save Reminder
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
