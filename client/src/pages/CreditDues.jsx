import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';
import {
  CreditCard,
  Plus,
  Search,
  IndianRupee,
  AlertTriangle,
  Download,
  CheckCircle,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export const CreditDues = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('customers'); // 'customers' or 'suppliers' or 'receipts'
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payPartyType, setPayPartyType] = useState('customer'); // 'customer' or 'supplier'
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRefNo, setPayRefNo] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [custRes, suppRes, payRes] = await Promise.all([
        api.get('/customers?hasDue=true'),
        api.get('/suppliers'),
        api.get('/payments'),
      ]);
      if (custRes.data.success) setCustomers(custRes.data.data);
      if (suppRes.data.success) setSuppliers(suppRes.data.data.filter((s) => s.outstandingPayable > 0));
      if (payRes.data.success) setPayments(payRes.data.data);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to load credit dues data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalCustomerDues = customers.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + s.outstandingPayable, 0);

  const handleOpenPayment = (type, partyId) => {
    setPayPartyType(type);
    setSelectedPartyId(partyId || '');
    setPayAmount('');
    setPayRefNo('');
    setPayNotes('');
    setShowPayModal(true);
  };

  const selectedPartyObj =
    payPartyType === 'customer'
      ? customers.find((c) => c._id === selectedPartyId)
      : suppliers.find((s) => s._id === selectedPartyId);

  const currentOutstanding =
    payPartyType === 'customer'
      ? selectedPartyObj?.outstandingAmount || 0
      : selectedPartyObj?.outstandingPayable || 0;

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedPartyId || !payAmount || Number(payAmount) <= 0) {
      error('Please select an account and valid payment amount');
      return;
    }

    try {
      const res = await api.post('/payments', {
        partyType: payPartyType,
        partyId: selectedPartyId,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        referenceNumber: payRefNo,
        notes: payNotes,
      });

      success(`Payment of ₹${payAmount} recorded! Receipt: ${res.data.data.receiptNumber}`);
      setShowPayModal(false);
      fetchData();
    } catch (err) {
      error(err.response?.data?.message || 'Payment recording failed');
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'customers') {
      const rows = customers.map((c) => ({
        name: c.name,
        contact: c.contactPerson,
        phone: c.phone,
        area: c.area,
        creditLimit: c.creditLimit,
        due: c.outstandingAmount,
      }));
      exportToCSV(`Customer_Dues_${Date.now()}`, rows, [
        { key: 'name', label: 'Dealer / Customer' },
        { key: 'contact', label: 'Contact Person' },
        { key: 'phone', label: 'Phone' },
        { key: 'area', label: 'Area' },
        { key: 'creditLimit', label: 'Credit Limit (₹)' },
        { key: 'due', label: 'Outstanding Balance (₹)' },
      ]);
    } else {
      const rows = payments.map((p) => ({
        receipt: p.receiptNumber,
        date: formatDate(p.paymentDate),
        party: p.party?.name || 'N/A',
        type: p.partyType,
        amount: p.amount,
        method: p.paymentMethod,
        ref: p.referenceNumber,
      }));
      exportToCSV(`Payment_Receipts_${Date.now()}`, rows, [
        { key: 'receipt', label: 'Receipt #' },
        { key: 'date', label: 'Date' },
        { key: 'party', label: 'Party Name' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Amount (₹)' },
        { key: 'method', label: 'Payment Mode' },
        { key: 'ref', label: 'Reference #' },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Credit & Due Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor client overdue credit, garden payables & record payment receipts.
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
            onClick={() => handleOpenPayment('customer', '')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Customer Receivables"
          value={formatCurrency(totalCustomerDues)}
          subtitle={`${customers.length} dealers with pending balance`}
          icon={ArrowDownLeft}
          color="rose"
        />
        <StatCard
          title="Total Supplier Payables"
          value={formatCurrency(totalSupplierPayables)}
          subtitle={`${suppliers.length} vendors awaiting payout`}
          icon={ArrowUpRight}
          color="amber"
        />
        <StatCard
          title="Payments Collected"
          value={formatCurrency(payments.reduce((s, p) => p.partyType === 'customer' ? s + p.amount : s, 0))}
          subtitle={`${payments.length} total transaction receipts`}
          icon={CheckCircle}
          color="tea"
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'customers'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Customer Receivables ({customers.length})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'suppliers'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Supplier Payables ({suppliers.length})
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'receipts'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Payment Receipts Log ({payments.length})
        </button>
      </div>

      {/* Active Tab View */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : activeTab === 'customers' ? (
        customers.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All customer accounts settled!"
            description="No outstanding customer balances currently recorded."
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Dealer / Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4 text-right">Credit Limit</th>
                  <th className="py-3 px-4 text-right">Outstanding Due</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 text-slate-600">{c.contactPerson} ({c.phone})</td>
                    <td className="py-3 px-4 text-slate-500">{c.area}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(c.creditLimit)}</td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                      {formatCurrency(c.outstandingAmount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenPayment('customer', c._id)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-xs transition"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'suppliers' ? (
        suppliers.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="All supplier bills cleared!"
            description="No pending payables to tea gardens or packaging vendors."
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Supplier Business</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Total Purchases</th>
                  <th className="py-3 px-4 text-right">Payable Balance</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4 text-slate-600">{s.contactPerson} ({s.phone})</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(s.totalPurchased)}</td>
                    <td className="py-3 px-4 text-right font-black text-amber-700 text-sm">
                      {formatCurrency(s.outstandingPayable)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenPayment('supplier', s._id)}
                        className="px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold rounded-lg text-xs transition"
                      >
                        Record Payout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Receipts Tab */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Party</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Reference / UTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {payments.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                    {p.receiptNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{formatDate(p.paymentDate)}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{p.party?.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.partyType === 'customer' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.partyType === 'customer' ? 'Received' : 'Paid Out'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="py-3 px-4 font-medium capitalize text-slate-600">
                    {p.paymentMethod.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {p.referenceNumber || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title={payPartyType === 'customer' ? 'Record Customer Receipt' : 'Record Supplier Payment'}
        subtitle="Atomically updates outstanding balance and creates payment receipt"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="flex space-x-2 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                setPayPartyType('customer');
                setSelectedPartyId('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                payPartyType === 'customer'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Customer / Dealer Receipt
            </button>
            <button
              type="button"
              onClick={() => {
                setPayPartyType('supplier');
                setSelectedPartyId('');
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                payPartyType === 'supplier'
                  ? 'bg-amber-700 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Supplier Vendor Payout
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Select {payPartyType === 'customer' ? 'Customer' : 'Supplier'} Account
            </label>
            <select
              required
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">Select account...</option>
              {payPartyType === 'customer'
                ? customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} — Due: ₹{c.outstandingAmount}
                    </option>
                  ))
                : suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} — Payable: ₹{s.outstandingPayable}
                    </option>
                  ))}
            </select>
          </div>

          {selectedPartyObj && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">Current Outstanding Balance:</span>
              <span className="text-sm font-black text-rose-700 font-mono">
                {formatCurrency(currentOutstanding)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                required
                min="1"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="e.g. 15000"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Payment Mode
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="upi">UPI (GPay/PhonePe/Paytm)</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Bank UTR / Cheque / Reference No.
            </label>
            <input
              type="text"
              value={payRefNo}
              onChange={(e) => setPayRefNo(e.target.value)}
              placeholder="e.g. UTR-HDFC-9928172"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Remarks
            </label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Notes on installment or clearance..."
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPayModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Record & Generate Receipt
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
