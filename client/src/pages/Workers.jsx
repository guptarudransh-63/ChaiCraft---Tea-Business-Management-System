import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Users,
  UserCheck,
  Calendar,
  Plus,
  Search,
  DollarSign,
  CheckCircle,
  Save,
  Phone,
} from 'lucide-react';

export const Workers = () => {
  const { hasRole, isOwner } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'monthly', 'staff'
  const [workers, setWorkers] = useState([]);
  const [dailyRoster, setDailyRoster] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  // New Worker Form
  const [workerForm, setWorkerForm] = useState({
    name: '',
    phone: '',
    role: 'Packaging Operator',
    department: 'Packaging',
    salary: '15000',
    address: '',
  });

  // Salary Form
  const [salaryForm, setSalaryForm] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    advance: '0',
    deductions: '0',
    paidAmount: '',
    notes: '',
  });

  const fetchDailyAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/attendance/daily?date=${selectedDate}`);
      if (res.data.success) {
        setDailyRoster(res.data.data.roster);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to load daily attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      setLoading(true);
      const [year, month] = selectedDate.split('-');
      const res = await api.get(`/attendance/monthly?year=${year}&month=${month}`);
      if (res.data.success) {
        setMonthlyReport(res.data.data.report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workers');
      if (res.data.success) {
        setWorkers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance') fetchDailyAttendance();
    else if (activeTab === 'monthly') fetchMonthlyReport();
    else if (activeTab === 'staff') fetchWorkers();
  }, [activeTab, selectedDate]);

  const handleStatusChange = (index, status) => {
    const updated = [...dailyRoster];
    updated[index].status = status;
    if (status === 'leave' || status === 'absent') {
      updated[index].checkInTime = '';
      updated[index].checkOutTime = '';
    } else {
      updated[index].checkInTime = updated[index].checkInTime || '09:00 AM';
      updated[index].checkOutTime = updated[index].checkOutTime || '06:00 PM';
    }
    setDailyRoster(updated);
  };

  const handleSaveAttendance = async () => {
    try {
      const entries = dailyRoster.map((r) => ({
        workerId: r.worker._id,
        status: r.status === 'not_marked' ? 'present' : r.status,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        notes: r.notes,
      }));

      await api.post('/attendance/daily', {
        date: selectedDate,
        entries,
      });

      success(`Attendance for ${formatDate(selectedDate)} saved successfully!`);
      fetchDailyAttendance();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save attendance');
    }
  };

  const handleSaveWorker = async (e) => {
    e.preventDefault();
    try {
      await api.post('/workers', {
        ...workerForm,
        salary: Number(workerForm.salary),
      });
      success('Worker added to staff roster');
      setShowAddWorkerModal(false);
      setWorkerForm({
        name: '',
        phone: '',
        role: 'Packaging Operator',
        department: 'Packaging',
        salary: '15000',
        address: '',
      });
      fetchWorkers();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save worker');
    }
  };

  const handleOpenSalary = (w) => {
    setSelectedWorker(w);
    setSalaryForm({
      month: new Date().toISOString().slice(0, 7),
      advance: '0',
      deductions: '0',
      paidAmount: (w.salary || 15000).toString(),
      notes: '',
    });
    setShowSalaryModal(true);
  };

  const submitSalary = async (e) => {
    e.preventDefault();
    try {
      await api.post('/workers/salary-payment', {
        workerId: selectedWorker._id,
        month: salaryForm.month,
        baseSalary: selectedWorker.salary,
        advance: Number(salaryForm.advance),
        deductions: Number(salaryForm.deductions),
        paidAmount: Number(salaryForm.paidAmount),
        notes: salaryForm.notes,
      });
      success(`Salary recorded for ${selectedWorker.name}`);
      setShowSalaryModal(false);
    } catch (err) {
      error(err.response?.data?.message || 'Salary payout failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Workers & Daily Attendance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage 10–15 factory staff roster, mark daily attendance & record payroll.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {activeTab === 'attendance' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs"
            />
          )}
          {hasRole('owner', 'manager') && (
            <button
              onClick={() => setShowAddWorkerModal(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Worker</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'attendance'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Daily Attendance Roster</span>
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'monthly'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Monthly Attendance Summary</span>
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'staff'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory {isOwner ? '& Salaries' : ''}</span>
        </button>
      </div>

      {/* Daily Attendance Tab View */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="text-xs text-slate-600">
              Date: <strong className="text-slate-900">{formatDate(selectedDate)}</strong>
            </div>
            <button
              onClick={handleSaveAttendance}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Attendance</span>
            </button>
          </div>

          {loading ? (
            <TableSkeleton rows={8} cols={4} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Worker Name</th>
                      <th className="py-3 px-4">Role & Dept</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Attendance Status</th>
                      <th className="py-3 px-4">Check-in / out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {dailyRoster.map((r, idx) => (
                      <tr key={r.worker._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900">{r.worker.name}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800">{r.worker.role}</span>
                          <span className="text-[10px] text-slate-400 block">{r.worker.department}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{r.worker.phone}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            {[
                              { id: 'present', label: 'Present', color: 'emerald' },
                              { id: 'half_day', label: 'Half Day', color: 'amber' },
                              { id: 'absent', label: 'Absent', color: 'rose' },
                              { id: 'leave', label: 'Leave', color: 'purple' },
                            ].map((btn) => (
                              <button
                                key={btn.id}
                                type="button"
                                onClick={() => handleStatusChange(idx, btn.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                                  r.status === btn.id
                                    ? btn.color === 'emerald'
                                      ? 'bg-emerald-700 text-white border-emerald-700'
                                      : btn.color === 'amber'
                                      ? 'bg-amber-600 text-white border-amber-600'
                                      : btn.color === 'rose'
                                      ? 'bg-rose-700 text-white border-rose-700'
                                      : 'bg-purple-700 text-white border-purple-700'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {r.status === 'present'
                            ? '09:00 AM - 06:00 PM'
                            : r.status === 'half_day'
                            ? '09:00 AM - 01:30 PM'
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Attendance Summary */}
      {activeTab === 'monthly' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Worker</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Present Days</th>
                <th className="py-3 px-4 text-center">Half Days</th>
                <th className="py-3 px-4 text-center">Absent Days</th>
                <th className="py-3 px-4 text-center">Leave Days</th>
                <th className="py-3 px-4 text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {monthlyReport.map((m) => (
                <tr key={m.worker._id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{m.worker.name}</td>
                  <td className="py-3 px-4 text-slate-600">{m.worker.department}</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-700">{m.present}</td>
                  <td className="py-3 px-4 text-center font-bold text-amber-700">{m.halfDay}</td>
                  <td className="py-3 px-4 text-center font-bold text-rose-700">{m.absent}</td>
                  <td className="py-3 px-4 text-center text-slate-500">{m.leave}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">
                    <span className={`px-2 py-0.5 rounded ${m.attendancePercentage >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {m.attendancePercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Directory Tab */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Worker Name</th>
                <th className="py-3 px-4">Role & Dept</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status</th>
                {isOwner && <th className="py-3 px-4 text-right">Monthly Salary</th>}
                {isOwner && <th className="py-3 px-4 text-right">Salary / Payout</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {workers.map((w) => (
                <tr key={w._id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{w.name}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{w.role}</div>
                    <span className="text-[10px] text-slate-400">{w.department}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{w.phone}</td>
                  <td className="py-3 px-4">
                    <Badge status={w.employmentStatus} />
                  </td>
                  {isOwner && (
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatCurrency(w.salary)}
                    </td>
                  )}
                  {isOwner && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenSalary(w)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-xs transition"
                      >
                        Record Salary
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Salary & Advance Modal (Owner Only) */}
      <Modal
        isOpen={showSalaryModal}
        onClose={() => setShowSalaryModal(false)}
        title={`Salary Payout: ${selectedWorker?.name}`}
        subtitle={`Base Salary: ₹${selectedWorker?.salary || 0} / month`}
      >
        <form onSubmit={submitSalary} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Salary Month (YYYY-MM)
              </label>
              <input
                type="month"
                required
                value={salaryForm.month}
                onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Paid Amount (₹)
              </label>
              <input
                type="number"
                required
                min="0"
                value={salaryForm.paidAmount}
                onChange={(e) => setSalaryForm({ ...salaryForm, paidAmount: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Advance Given (₹)
              </label>
              <input
                type="number"
                min="0"
                value={salaryForm.advance}
                onChange={(e) => setSalaryForm({ ...salaryForm, advance: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Deductions / Fines (₹)
              </label>
              <input
                type="number"
                min="0"
                value={salaryForm.deductions}
                onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSalaryModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Record Payout
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Worker Modal */}
      <Modal
        isOpen={showAddWorkerModal}
        onClose={() => setShowAddWorkerModal(false)}
        title="Add Factory Worker"
        subtitle="Register new tea packaging, blending, or maintenance operator"
      >
        <form onSubmit={handleSaveWorker} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                required
                value={workerForm.name}
                onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={workerForm.phone}
                onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                placeholder="9876500001"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Role / Designation
              </label>
              <input
                type="text"
                required
                value={workerForm.role}
                onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Department
              </label>
              <select
                value={workerForm.department}
                onChange={(e) => setWorkerForm({ ...workerForm, department: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="Packaging">Packaging</option>
                <option value="Blending">Blending</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Maintenance">Maintenance</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Monthly Salary (₹)
              </label>
              <input
                type="number"
                min="0"
                value={workerForm.salary}
                onChange={(e) => setWorkerForm({ ...workerForm, salary: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Address
            </label>
            <input
              type="text"
              value={workerForm.address}
              onChange={(e) => setWorkerForm({ ...workerForm, address: e.target.value })}
              placeholder="Residential address"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddWorkerModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Add Worker
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
