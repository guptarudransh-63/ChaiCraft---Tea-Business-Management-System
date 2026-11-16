import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';
import {
  Users2,
  Plus,
  Search,
  BookOpen,
  CreditCard,
  Download,
  AlertCircle,
  Phone,
  MapPin,
} from 'lucide-react';

export const Dealers = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dueFilter, setDueFilter] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLedgerCust, setSelectedLedgerCust] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Add Form
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    area: '',
    customerType: 'wholesaler',
    creditLimit: '100000',
    paymentTermsDays: '15',
    gstNumber: '',
    notes: '',
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      let url = `/customers?search=${search}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      if (dueFilter) url += `&hasDue=true`;

      const res = await api.get(url);
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to fetch dealers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, typeFilter, dueFilter]);

  const handleOpenLedger = async (cust) => {
    setSelectedLedgerCust(cust);
    try {
      setLedgerLoading(true);
      const res = await api.get(`/customers/${cust._id}/ledger`);
      if (res.data.success) {
        setLedgerData(res.data.data);
      }
    } catch (err) {
      error('Failed to load customer ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', {
        ...formData,
        creditLimit: Number(formData.creditLimit),
        paymentTermsDays: Number(formData.paymentTermsDays),
      });
      success('Dealer/Customer created successfully');
      setShowAddModal(false);
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        area: '',
        customerType: 'wholesaler',
        creditLimit: '100000',
        paymentTermsDays: '15',
        gstNumber: '',
        notes: '',
      });
      fetchCustomers();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to create dealer');
    }
  };

  const handleExportCSV = () => {
    const rows = customers.map((c) => ({
      name: c.name,
      contactPerson: c.contactPerson,
      phone: c.phone,
      area: c.area,
      customerType: c.customerType,
      creditLimit: c.creditLimit,
      totalPurchases: c.totalPurchases,
      totalPaid: c.totalPaid,
      outstandingAmount: c.outstandingAmount,
    }));
    exportToCSV(`Dealers_List_${Date.now()}`, rows, [
      { key: 'name', label: 'Business Name' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'phone', label: 'Phone' },
      { key: 'area', label: 'Area / City' },
      { key: 'customerType', label: 'Type' },
      { key: 'creditLimit', label: 'Credit Limit (₹)' },
      { key: 'totalPurchases', label: 'Total Purchases (₹)' },
      { key: 'totalPaid', label: 'Total Paid (₹)' },
      { key: 'outstandingAmount', label: 'Outstanding Due (₹)' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Dealers & Distributors
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage wholesale clients, credit limits, account ledgers & collection history.
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
            <span>Add Dealer / Customer</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search business name, contact, area, phone..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Categories</option>
          <option value="distributor">Distributor</option>
          <option value="wholesaler">Wholesaler</option>
          <option value="retailer">Retailer</option>
          <option value="direct">Direct Customer</option>
        </select>

        <button
          onClick={() => setDueFilter(!dueFilter)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
            dueFilter
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {dueFilter ? '✓ Only Pending Dues' : 'Filter Pending Dues'}
        </button>
      </div>

      {/* Dealers Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No dealers or customers found"
          description="Add a new distributor or dealer to track sales and credit dues."
          actionText="Add Dealer"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Business Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Area / Region</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Outstanding Due</th>
                  <th className="py-3 px-4 text-right">Ledger Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {customers.map((c) => {
                  const hasDue = c.outstandingAmount > 0;
                  return (
                    <tr key={c._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        {c.gstNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">GST: {c.gstNumber}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{c.contactPerson || '-'}</div>
                        <span className="text-[11px] text-slate-500">{c.phone}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {c.area || 'General'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={c.customerType} />
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        {formatCurrency(c.creditLimit)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-black text-sm ${hasDue ? 'text-rose-600' : 'text-slate-400'}`}>
                          {formatCurrency(c.outstandingAmount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenLedger(c)}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>View Ledger</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Ledger Modal (Statement of Account) */}
      <Modal
        isOpen={!!selectedLedgerCust}
        onClose={() => {
          setSelectedLedgerCust(null);
          setLedgerData(null);
        }}
        title={`Account Ledger: ${selectedLedgerCust?.name}`}
        subtitle={`Live chronological statement of account with running balance`}
        maxWidth="max-w-4xl"
      >
        {ledgerLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : !ledgerData ? (
          <p className="text-xs text-slate-400 py-6 text-center">Loading ledger...</p>
        ) : (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold">Total Invoiced (Debits):</span>
                <p className="text-sm font-bold text-slate-800">{formatCurrency(ledgerData.summary.totalDebit)}</p>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Total Received (Credits):</span>
                <p className="text-sm font-bold text-emerald-700">{formatCurrency(ledgerData.summary.totalCredit)}</p>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Current Outstanding Balance:</span>
                <p className="text-base font-black text-rose-700">{formatCurrency(ledgerData.summary.closingBalance)}</p>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reference #</th>
                    <th className="py-2.5 px-3 text-right">Debit (Sale)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                    <th className="py-2.5 px-3 text-right font-bold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {ledgerData.ledger.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(entry.date)}</td>
                      <td className="py-2.5 px-3 font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          entry.type === 'SALE_INVOICE' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {entry.type === 'SALE_INVOICE' ? 'Sales Invoice' : 'Payment Received'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium">{entry.reference}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-900">
                        {formatCurrency(entry.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Dealer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Dealer / Customer"
        subtitle="Specify credit terms, GSTIN, area and contact person"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Business Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sharma Traders"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Contact Person Name
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Mukesh Sharma"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9839011111"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Area / City
              </label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g. Kanpur Central"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Customer Category
              </label>
              <select
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="distributor">Distributor</option>
                <option value="wholesaler">Wholesaler</option>
                <option value="retailer">Retailer</option>
                <option value="direct">Direct Customer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Credit Limit (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder="50000"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Payment Terms (Days)
              </label>
              <input
                type="number"
                min="0"
                value={formData.paymentTermsDays}
                onChange={(e) => setFormData({ ...formData, paymentTermsDays: e.target.value })}
                placeholder="15"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              GSTIN
            </label>
            <input
              type="text"
              value={formData.gstNumber}
              onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })}
              placeholder="09AAACS1122K1Z4"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Full Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Shop/warehouse address..."
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
              Save Dealer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
