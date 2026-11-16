import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { StatCard } from '../components/common/StatCard';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';
import {
  Receipt,
  Plus,
  Trash2,
  Download,
  Zap,
  Truck,
  Fuel,
  Wrench,
  Package,
} from 'lucide-react';

export const Expenses = () => {
  const { hasRole, isOwner } = useAuth();
  const { success, error } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    category: 'transport',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'upi',
    vendor: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = categoryFilter ? `/expenses?category=${categoryFilter}` : '/expenses';
      const [listRes, sumRes] = await Promise.all([
        api.get(url),
        api.get('/expenses/summary'),
      ]);
      if (listRes.data.success) setExpenses(listRes.data.data);
      if (sumRes.data.success) setSummary(sumRes.data.data);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryFilter]);

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', {
        ...form,
        amount: Number(form.amount),
      });
      success('Expense recorded successfully');
      setShowAddModal(false);
      setForm({
        category: 'transport',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'upi',
        vendor: '',
      });
      fetchData();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      success('Expense deleted');
      fetchData();
    } catch (err) {
      error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleExportCSV = () => {
    const rows = expenses.map((e) => ({
      date: formatDate(e.date),
      category: e.category,
      amount: e.amount,
      description: e.description,
      vendor: e.vendor || '-',
      method: e.paymentMethod,
    }));
    exportToCSV(`Expenses_${Date.now()}`, rows, [
      { key: 'date', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount (₹)' },
      { key: 'description', label: 'Description' },
      { key: 'vendor', label: 'Vendor/Payee' },
      { key: 'method', label: 'Payment Method' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Factory Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track electricity, transport freight, generator diesel & maintenance costs.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-2xs flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Factory Expenses"
            value={formatCurrency(summary.totalExpense)}
            subtitle="All logged operational expenditures"
            icon={Receipt}
            color="rose"
          />
          <StatCard
            title="Power & Electricity"
            value={formatCurrency(summary.categoryBreakdown?.electricity || 0)}
            subtitle="Factory electricity & utility"
            icon={Zap}
            color="amber"
          />
          <StatCard
            title="Transport & Freight"
            value={formatCurrency(summary.categoryBreakdown?.transport || 0)}
            subtitle="Dispatch tempo & logistics"
            icon={Truck}
            color="blue"
          />
          <StatCard
            title="Diesel & Maintenance"
            value={formatCurrency((summary.categoryBreakdown?.fuel || 0) + (summary.categoryBreakdown?.maintenance || 0))}
            subtitle="Generator diesel & repairs"
            icon={Wrench}
            color="slate"
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {[
          { id: '', label: 'All Expenses' },
          { id: 'transport', label: 'Transport' },
          { id: 'electricity', label: 'Electricity' },
          { id: 'fuel', label: 'Fuel / Diesel' },
          { id: 'packaging', label: 'Packaging' },
          { id: 'maintenance', label: 'Maintenance' },
          { id: 'salaries', label: 'Salaries' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              categoryFilter === tab.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Expense Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses logged in this category"
          description="Click the button above to record a new business expense."
          actionText="Record Expense"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Vendor / Payee</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                {isOwner && <th className="py-3 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {expenses.map((e) => (
                <tr key={e._id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 text-slate-500">{formatDate(e.date)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{e.description}</td>
                  <td className="py-3 px-4 text-slate-600">{e.vendor || '-'}</td>
                  <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 capitalize">{e.paymentMethod.replace('_', ' ')}</td>
                  {isOwner && (
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteExpense(e._id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Expense Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Business Expense"
        subtitle="Log operational costs to calculate accurate monthly net profit"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4">
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
                <option value="transport">Transport & Freight</option>
                <option value="electricity">Electricity & Utilities</option>
                <option value="fuel">Generator Fuel / Diesel</option>
                <option value="packaging">Packaging Supplies</option>
                <option value="maintenance">Maintenance & Repairs</option>
                <option value="rent">Factory Rent</option>
                <option value="salaries">Salaries & Wages</option>
                <option value="marketing">Marketing & Samples</option>
                <option value="miscellaneous">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Amount (₹)
              </label>
              <input
                type="number"
                required
                min="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 4500"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Expense Date
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Payment Method
              </label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="upi">UPI (GPay/PhonePe)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Vendor / Payee Name
            </label>
            <input
              type="text"
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              placeholder="e.g. KESCO Power / Indian Oil"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Description / Notes
            </label>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Details of expense..."
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
              Save Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
