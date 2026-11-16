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
  Truck,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Download,
  AlertCircle,
  Building2,
  BookOpen,
} from 'lucide-react';

export const Purchases = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'suppliers'
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [selectedSupplierLedger, setSelectedSupplierLedger] = useState(null);
  const [supplierLedgerData, setSupplierLedgerData] = useState(null);

  // New PO State
  const [poSupplier, setPoSupplier] = useState('');
  const [poInvoiceNo, setPoInvoiceNo] = useState('');
  const [poItems, setPoItems] = useState([{ product: '', quantity: 1, unitCost: 0, total: 0 }]);
  const [poNotes, setPoNotes] = useState('');

  // New Supplier State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstNumber: '',
    paymentTermsDays: '30',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [poRes, suppRes, rmRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/products?category=raw_material'),
      ]);
      if (poRes.data.success) setPurchases(poRes.data.data);
      if (suppRes.data.success) setSuppliers(suppRes.data.data);
      if (rmRes.data.success) setRawMaterials(rmRes.data.data);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to fetch purchase records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePOItemChange = (index, field, value) => {
    const updated = [...poItems];
    if (field === 'product') {
      const selectedRM = rawMaterials.find((r) => r._id === value);
      updated[index].product = value;
      updated[index].unitCost = selectedRM ? selectedRM.costPrice : 0;
      updated[index].total = updated[index].quantity * updated[index].unitCost;
      updated[index].unit = selectedRM ? selectedRM.unit : 'kg';
    } else if (field === 'quantity') {
      updated[index].quantity = Number(value);
      updated[index].total = updated[index].quantity * updated[index].unitCost;
    } else if (field === 'unitCost') {
      updated[index].unitCost = Number(value);
      updated[index].total = updated[index].quantity * updated[index].unitCost;
    }
    setPoItems(updated);
  };

  const addPORow = () => {
    setPoItems([...poItems, { product: '', quantity: 1, unitCost: 0, total: 0 }]);
  };

  const removePORow = (index) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index));
    }
  };

  const poTotal = poItems.reduce((acc, i) => acc + (Number(i.total) || 0), 0);

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!poSupplier) {
      error('Please select a supplier');
      return;
    }
    const valid = poItems.filter((i) => i.product && i.quantity > 0);
    if (!valid.length) {
      error('Add at least one raw material or packaging item');
      return;
    }

    try {
      await api.post('/purchases', {
        supplier: poSupplier,
        supplierInvoiceNo: poInvoiceNo,
        items: valid,
        notes: poNotes,
        status: 'ordered',
      });
      success('Purchase order created successfully');
      setShowCreatePOModal(false);
      setPoSupplier('');
      setPoInvoiceNo('');
      setPoItems([{ product: '', quantity: 1, unitCost: 0, total: 0 }]);
      fetchData();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to create PO');
    }
  };

  const handleReceiveStock = async (purchaseId) => {
    if (!window.confirm('Mark this purchase order as received? Warehouse raw materials inventory will increase immediately.')) {
      return;
    }
    try {
      await api.patch(`/purchases/${purchaseId}/status`, { status: 'received' });
      success('Stock received and inventory increased!');
      fetchData();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to receive stock');
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    try {
      await api.post('/suppliers', {
        ...supplierForm,
        paymentTermsDays: Number(supplierForm.paymentTermsDays),
      });
      success('Supplier added successfully');
      setShowAddSupplierModal(false);
      setSupplierForm({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstNumber: '',
        paymentTermsDays: '30',
      });
      fetchData();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to add supplier');
    }
  };

  const handleOpenSupplierLedger = async (supp) => {
    setSelectedSupplierLedger(supp);
    try {
      const res = await api.get(`/suppliers/${supp._id}/ledger`);
      if (res.data.success) {
        setSupplierLedgerData(res.data.data);
      }
    } catch (err) {
      error('Failed to load supplier ledger');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Purchases & Supplier Vendors
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Procure raw tea leaf, foil pouches, boxes & manage vendor payables.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-2xs flex items-center space-x-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
          <button
            onClick={() => setShowCreatePOModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'orders'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Purchase Orders & Intake</span>
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'suppliers'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Suppliers & Gardens Directory</span>
        </button>
      </div>

      {/* Purchases Tab View */}
      {activeTab === 'orders' ? (
        loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : purchases.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No purchase orders found"
            description="Create a purchase order for tea leaf, pouches or packaging."
            actionText="Create Purchase Order"
            onAction={() => setShowCreatePOModal(true)}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Items / Raw Materials</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4">Status & Stock Intake</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {purchases.map((po) => (
                    <tr key={po._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        {po.purchaseNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(po.purchaseDate)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {po.supplier?.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 font-medium">
                          {po.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(po.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${po.dueAmount > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                          {formatCurrency(po.dueAmount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {po.status === 'ordered' ? (
                          <button
                            onClick={() => handleReceiveStock(po._id)}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-lg transition shadow-xs flex items-center space-x-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Mark Received & Add Stock</span>
                          </button>
                        ) : (
                          <div className="flex items-center space-x-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Received in Warehouse</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Suppliers Tab View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone / City</th>
                  <th className="py-3 px-4 text-right">Total Purchases</th>
                  <th className="py-3 px-4 text-right">Outstanding Payable</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {s.name}
                      {s.gstNumber && <span className="block text-[10px] text-slate-400 font-mono">GST: {s.gstNumber}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{s.contactPerson || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{s.phone}</div>
                      <span className="text-[10px] text-slate-400">{s.address}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {formatCurrency(s.totalPurchased)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-black text-sm ${s.outstandingPayable > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                        {formatCurrency(s.outstandingPayable)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenSupplierLedger(s)}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Ledger</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier Ledger Modal */}
      <Modal
        isOpen={!!selectedSupplierLedger}
        onClose={() => {
          setSelectedSupplierLedger(null);
          setSupplierLedgerData(null);
        }}
        title={`Supplier Ledger: ${selectedSupplierLedger?.name}`}
        subtitle={`Chronological purchase bills and payments statement`}
        maxWidth="max-w-3xl"
      >
        {!supplierLedgerData ? (
          <p className="text-xs text-slate-400 py-6 text-center">Loading ledger...</p>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs">
              <span>Total Purchased: <strong>{formatCurrency(supplierLedgerData.summary.totalPurchases)}</strong></span>
              <span>Total Paid: <strong className="text-emerald-700">{formatCurrency(supplierLedgerData.summary.totalPaid)}</strong></span>
              <span>Payable Due: <strong className="text-amber-700">{formatCurrency(supplierLedgerData.summary.closingPayable)}</strong></span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reference #</th>
                    <th className="py-2.5 px-3 text-right">Payable Bill</th>
                    <th className="py-2.5 px-3 text-right">Paid Out</th>
                    <th className="py-2.5 px-3 text-right font-bold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {supplierLedgerData.ledger.map((entry, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(entry.date)}</td>
                      <td className="py-2.5 px-3 font-semibold text-[11px] capitalize">{entry.type.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 px-3 font-mono">{entry.reference}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">{entry.payableAmount > 0 ? formatCurrency(entry.payableAmount) : '-'}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{entry.paidAmount > 0 ? formatCurrency(entry.paidAmount) : '-'}</td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono">{formatCurrency(entry.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* New Purchase Order Modal */}
      <Modal
        isOpen={showCreatePOModal}
        onClose={() => setShowCreatePOModal(false)}
        title="Create Purchase Order"
        subtitle="Order tea leaf or packaging from suppliers"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreatePO} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Supplier / Tea Estate
              </label>
              <select
                required
                value={poSupplier}
                onChange={(e) => setPoSupplier(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">Select a supplier...</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} — Payable: ₹{s.outstandingPayable}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Supplier Invoice / DC No.
              </label>
              <input
                type="text"
                value={poInvoiceNo}
                onChange={(e) => setPoInvoiceNo(e.target.value)}
                placeholder="e.g. INV-2026-902"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Raw Material Items
              </label>
              <button
                type="button"
                onClick={addPORow}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {poItems.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <select
                      required
                      value={item.product}
                      onChange={(e) => handlePOItemChange(idx, 'product', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Select Raw Material / Leaf...</option>
                      {rawMaterials.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name} (Current: {r.currentStock} {r.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handlePOItemChange(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={item.unitCost}
                      onChange={(e) => handlePOItemChange(idx, 'unitCost', e.target.value)}
                      placeholder="Rate"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right"
                    />
                  </div>
                  <div className="w-24 text-right font-bold text-xs text-slate-800">
                    {formatCurrency(item.total)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePORow(idx)}
                    disabled={poItems.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-semibold text-slate-600">Total Purchase Value:</span>
            <span className="text-base font-black text-slate-900">{formatCurrency(poTotal)}</span>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreatePOModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Issue Purchase Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        title="Add New Supplier / Tea Garden"
        subtitle="Record garden/vendor contact and GST details"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Supplier Business Name
              </label>
              <input
                type="text"
                required
                value={supplierForm.name}
                onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                placeholder="e.g. Assam Valley Estates"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Contact Person
              </label>
              <input
                type="text"
                value={supplierForm.contactPerson}
                onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                placeholder="Manager name"
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
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                GSTIN
              </label>
              <input
                type="text"
                value={supplierForm.gstNumber}
                onChange={(e) => setSupplierForm({ ...supplierForm, gstNumber: e.target.value.toUpperCase() })}
                placeholder="18AAACA1234F1Z1"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Address / Garden Location
            </label>
            <input
              type="text"
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              placeholder="Dibrugarh, Assam"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddSupplierModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
