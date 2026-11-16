import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { StatCard } from '../components/common/StatCard';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';
import {
  BarChart3,
  Download,
  IndianRupee,
  Boxes,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

export const Reports = () => {
  const { error } = useToast();
  const [activeReport, setActiveReport] = useState('sales'); // 'sales', 'inventory', 'dues'
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/${activeReport}`);
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const handleExportCSV = () => {
    if (!reportData) return;

    if (activeReport === 'sales') {
      const rows = reportData.orders.map((o) => ({
        order: o.orderNumber,
        date: formatDate(o.orderDate),
        customer: o.customer?.name,
        amount: o.grandTotal,
        paid: o.paidAmount,
        due: o.dueAmount,
        status: o.orderStatus,
      }));
      exportToCSV(`Sales_Report_${Date.now()}`, rows, [
        { key: 'order', label: 'Order Number' },
        { key: 'date', label: 'Date' },
        { key: 'customer', label: 'Customer' },
        { key: 'amount', label: 'Invoice Total (₹)' },
        { key: 'paid', label: 'Paid Amount (₹)' },
        { key: 'due', label: 'Balance Due (₹)' },
        { key: 'status', label: 'Order Status' },
      ]);
    } else if (activeReport === 'inventory') {
      const rows = reportData.products.map((p) => ({
        name: p.name,
        sku: p.sku,
        category: p.category,
        stock: p.currentStock,
        unit: p.unit,
        cost: p.costPrice,
        selling: p.sellingPrice,
        valuation: p.valuation,
      }));
      exportToCSV(`Inventory_Valuation_${Date.now()}`, rows, [
        { key: 'name', label: 'Product Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'category', label: 'Category' },
        { key: 'stock', label: 'Stock' },
        { key: 'unit', label: 'Unit' },
        { key: 'cost', label: 'Unit Cost (₹)' },
        { key: 'selling', label: 'Selling Price (₹)' },
        { key: 'valuation', label: 'Valuation Total (₹)' },
      ]);
    } else {
      const rows = reportData.customers.map((c) => ({
        name: c.name,
        phone: c.phone,
        type: c.customerType,
        creditLimit: c.creditLimit,
        due: c.outstandingAmount,
      }));
      exportToCSV(`Dealer_Dues_Report_${Date.now()}`, rows, [
        { key: 'name', label: 'Dealer Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'type', label: 'Category' },
        { key: 'creditLimit', label: 'Credit Limit (₹)' },
        { key: 'due', label: 'Outstanding Due (₹)' },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Business Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Export operational summaries, inventory valuation audits & sales performance.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Export Current Report to CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3">
        {[
          { id: 'sales', label: 'Sales & Invoicing Performance' },
          { id: 'inventory', label: 'Inventory Valuation Audit' },
          { id: 'dues', label: 'Dealer Receivables & Aging' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeReport === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : !reportData ? (
        <div className="text-center py-12 text-slate-400 text-xs">No data available</div>
      ) : activeReport === 'sales' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Billed Revenue"
              value={formatCurrency(reportData.summary.totalRevenue)}
              subtitle={`${reportData.summary.orderCount} orders invoiced`}
              icon={IndianRupee}
              color="tea"
            />
            <StatCard
              title="Collected Amount"
              value={formatCurrency(reportData.summary.totalCollected)}
              subtitle="Received in bank/cash"
              icon={TrendingUp}
              color="blue"
            />
            <StatCard
              title="Pending Receivable Balance"
              value={formatCurrency(reportData.summary.totalDue)}
              subtitle="Outstanding customer debt"
              icon={BarChart3}
              color="rose"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Tea Product Sales Breakdown</h3>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4 text-right">Units Sold</th>
                  <th className="py-2.5 px-4 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {reportData.productBreakdown?.map((pb, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{pb.productName}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{pb.sku}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-800">{pb.quantity} pkts</td>
                    <td className="py-2.5 px-4 text-right font-black text-emerald-800">{formatCurrency(pb.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeReport === 'inventory' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Inventory Valuation"
              value={formatCurrency(reportData.summary.totalValuation)}
              subtitle={`${reportData.summary.totalProducts} total SKUs tracked`}
              icon={Boxes}
              color="tea"
            />
            <StatCard
              title="Finished Goods Stock Value"
              value={formatCurrency(reportData.summary.finishedValuation)}
              subtitle="Packets ready for dispatch"
              icon={Boxes}
              color="blue"
            />
            <StatCard
              title="Raw Materials & Bulk Leaf"
              value={formatCurrency(reportData.summary.rawValuation)}
              subtitle="Leaf, pouches, spices & cartons"
              icon={Boxes}
              color="amber"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-4">SKU</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Current Stock</th>
                  <th className="py-2.5 px-4 text-right">Unit Cost</th>
                  <th className="py-2.5 px-4 text-right font-bold">Total Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {reportData.products?.map((p) => (
                  <tr key={p._id}>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{p.sku}</td>
                    <td className="py-2.5 px-4 capitalize text-slate-600">{p.category.replace('_', ' ')}</td>
                    <td className="py-2.5 px-4 text-right font-bold">{p.currentStock} {p.unit}</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(p.costPrice)}</td>
                    <td className="py-2.5 px-4 text-right font-black text-emerald-800">{formatCurrency(p.valuation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <StatCard
            title="Total Outstanding Dealer Credit"
            value={formatCurrency(reportData.totalOutstanding)}
            subtitle={`${reportData.customerCount} accounts with pending invoices`}
            icon={IndianRupee}
            color="rose"
          />

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Dealer / Business</th>
                  <th className="py-2.5 px-4">Phone</th>
                  <th className="py-2.5 px-4">Area</th>
                  <th className="py-2.5 px-4 text-right">Credit Limit</th>
                  <th className="py-2.5 px-4 text-right font-bold">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {reportData.customers?.map((c) => (
                  <tr key={c._id}>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-2.5 px-4 text-slate-600">{c.area || 'General'}</td>
                    <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(c.creditLimit)}</td>
                    <td className="py-2.5 px-4 text-right font-black text-rose-600">{formatCurrency(c.outstandingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
