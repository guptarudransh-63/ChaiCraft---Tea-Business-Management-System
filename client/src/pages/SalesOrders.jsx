import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { InvoiceView } from '../components/common/InvoiceView';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate, exportToCSV } from '../utils/formatters';
import {
  ShoppingCart,
  Plus,
  Search,
  FileText,
  Trash2,
  Download,
  AlertCircle,
  Truck,
  CheckCircle,
} from 'lucide-react';

export const SalesOrders = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // New Order Form state
  const [customerId, setCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState([{ product: '', quantity: 1, unitPrice: 0, total: 0 }]);
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('5'); // 5% GST on tea
  const [orderNotes, setOrderNotes] = useState('');
  const [initialStatus, setInitialStatus] = useState('confirmed');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let url = `/orders?search=${search}`;
      if (statusFilter) url += `&orderStatus=${statusFilter}`;
      if (paymentFilter) url += `&paymentStatus=${paymentFilter}`;
      const res = await api.get(url);
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers?status=active'),
        api.get('/products?category=finished_good'),
      ]);
      if (custRes.data.success) setCustomers(custRes.data.data);
      if (prodRes.data.success) setFinishedProducts(prodRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, paymentFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  // Line item handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...orderItems];
    if (field === 'product') {
      const selectedProd = finishedProducts.find((p) => p._id === value);
      updated[index].product = value;
      updated[index].unitPrice = selectedProd ? selectedProd.sellingPrice : 0;
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
      updated[index].availableStock = selectedProd ? selectedProd.currentStock : 0;
    } else if (field === 'quantity') {
      updated[index].quantity = Number(value);
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = Number(value);
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    setOrderItems(updated);
  };

  const addItemRow = () => {
    setOrderItems([...orderItems, { product: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItemRow = (index) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  // Calculations
  const subtotal = orderItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const discountVal = Number(discount) || 0;
  const taxable = Math.max(0, subtotal - discountVal);
  const taxAmount = (taxable * (Number(taxRate) || 0)) / 100;
  const grandTotal = Math.round(taxable + taxAmount);

  const selectedCustomerObj = customers.find((c) => c._id === customerId);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!customerId) {
      error('Please select a customer/dealer');
      return;
    }
    const validItems = orderItems.filter((i) => i.product && i.quantity > 0);
    if (validItems.length === 0) {
      error('Please select at least one valid tea product and quantity');
      return;
    }

    try {
      await api.post('/orders', {
        customer: customerId,
        items: validItems,
        discount: discountVal,
        taxRate: Number(taxRate),
        orderStatus: initialStatus,
        notes: orderNotes,
      });
      success('Order created successfully!');
      setShowCreateModal(false);
      // Reset form
      setCustomerId('');
      setOrderItems([{ product: '', quantity: 1, unitPrice: 0, total: 0 }]);
      setDiscount('0');
      setOrderNotes('');
      fetchOrders();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to create sales order');
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (newStatus === 'cancelled') {
      if (!window.confirm('Cancelling this order will restore reserved stock into inventory. Continue?')) {
        return;
      }
    }
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (err) {
      error(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleExportCSV = () => {
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      date: formatDate(o.orderDate),
      customer: o.customer?.name || 'N/A',
      itemsCount: o.items.length,
      subtotal: o.subtotal,
      tax: o.taxAmount,
      grandTotal: o.grandTotal,
      paidAmount: o.paidAmount,
      dueAmount: o.dueAmount,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
    }));
    exportToCSV(`Sales_Orders_${Date.now()}`, rows, [
      { key: 'orderNumber', label: 'Order #' },
      { key: 'date', label: 'Order Date' },
      { key: 'customer', label: 'Customer / Dealer' },
      { key: 'itemsCount', label: 'Item Count' },
      { key: 'grandTotal', label: 'Total (₹)' },
      { key: 'paidAmount', label: 'Paid (₹)' },
      { key: 'dueAmount', label: 'Due (₹)' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'orderStatus', label: 'Order Status' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Sales & Billing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Create dealer orders, manage dispatch pipeline & generate GST invoices.
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
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sales Order</span>
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
            placeholder="Search by order number (SO-2026-XXXX)..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Order Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="packed">Packed</option>
          <option value="dispatched">Dispatched</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Payment Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Orders List Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No sales orders found"
          description="Create a sales order for a dealer or customer to begin."
          actionText="Create Order"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Dealer / Customer</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Due</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Order Status</th>
                  <th className="py-3 px-4 text-right">Invoice & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      {o.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(o.orderDate)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{o.customer?.name}</div>
                      <span className="text-[10px] text-slate-400 capitalize">{o.customer?.area || o.customer?.customerType}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {formatCurrency(o.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${o.dueAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatCurrency(o.dueAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={o.paymentStatus} />
                    </td>
                    <td className="py-3 px-4">
                      {hasRole('owner', 'manager') && o.orderStatus !== 'cancelled' ? (
                        <select
                          value={o.orderStatus}
                          onChange={(e) => handleUpdateStatus(o._id, e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold capitalize focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="packed">Packed</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancel Order</option>
                        </select>
                      ) : (
                        <Badge status={o.orderStatus} />
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedInvoiceOrder(o)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      <Modal
        isOpen={!!selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
        title={`Invoice: ${selectedInvoiceOrder?.orderNumber}`}
        subtitle={`Issued to ${selectedInvoiceOrder?.customer?.name}`}
        maxWidth="max-w-4xl"
      >
        <InvoiceView order={selectedInvoiceOrder} onClose={() => setSelectedInvoiceOrder(null)} />
      </Modal>

      {/* Create Sales Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Sales Order & Bill"
        subtitle="Select customer, add tea packets, and review GST calculation"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-5">
          {/* Customer Selector & Credit Info */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Customer / Dealer
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="">Select a customer or distributor...</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.area}) — Due: ₹{c.outstandingAmount}
                </option>
              ))}
            </select>

            {selectedCustomerObj && (
              <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between">
                <span>Credit Limit: <strong className="text-slate-800">{formatCurrency(selectedCustomerObj.creditLimit)}</strong></span>
                <span>Current Dues: <strong className="text-rose-700">{formatCurrency(selectedCustomerObj.outstandingAmount)}</strong></span>
                <span>Terms: <strong className="text-slate-800">{selectedCustomerObj.paymentTermsDays} Days</strong></span>
              </div>
            )}
          </div>

          {/* Product Line Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Order Line Items
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {orderItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <select
                      required
                      value={item.product}
                      onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Select Tea Product...</option>
                      {finishedProducts.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.currentStock} in stock) — ₹{p.sellingPrice}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right"
                    />
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      placeholder="Price"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right font-medium"
                    />
                  </div>

                  <div className="w-24 text-right font-bold text-xs text-slate-800">
                    {formatCurrency(item.total)}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    disabled={orderItems.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax, Discount, Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="mt-1 block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                GST Tax Rate
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="mt-1 block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value="0">0% (Nil)</option>
                <option value="5">5% GST (Standard Tea)</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Initial Status
              </label>
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value)}
                className="mt-1 block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
              >
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed (Deduct Stock)</option>
                <option value="dispatched">Dispatched</option>
              </select>
            </div>
          </div>

          {/* Live Order Summary Box */}
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span className="font-semibold">-{formatCurrency(discountVal)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>GST ({taxRate}%):</span>
              <span className="font-semibold">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-emerald-950 pt-2 border-t border-emerald-200">
              <span>Grand Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Confirm & Generate Bill
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
