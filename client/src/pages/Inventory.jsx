import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency, formatDate, formatDateTime, exportToCSV } from '../utils/formatters';
import {
  Boxes,
  Plus,
  Search,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Download,
  ArrowUpDown,
  Edit2,
} from 'lucide-react';

export const Inventory = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('finished_good'); // 'finished_good' or 'raw_material'
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [valuation, setValuation] = useState(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productHistory, setProductHistory] = useState([]);

  // Adjust Form
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('adjustment');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Add/Edit Product Form
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'finished_good',
    subcategory: 'black_tea',
    unit: 'packet',
    costPrice: '',
    sellingPrice: '',
    minStockLevel: '50',
    currentStock: '0',
    description: '',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products?category=${activeTab}&search=${search}`);
      if (res.data.success) {
        setProducts(res.data.data);
      }

      const valRes = await api.get('/products/valuation');
      if (valRes.data.success) {
        setValuation(valRes.data.data);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [activeTab, search]);

  const handleOpenAdjust = (prod) => {
    setSelectedProduct(prod);
    setAdjustQty('');
    setAdjustReason('adjustment');
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  const submitAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustQty || isNaN(adjustQty)) {
      error('Please enter a valid quantity change number (+ or -)');
      return;
    }
    try {
      await api.post(`/products/${selectedProduct._id}/adjust`, {
        quantityChange: Number(adjustQty),
        type: adjustReason,
        notes: adjustNotes,
      });
      success(`Stock for ${selectedProduct.name} adjusted successfully`);
      setShowAdjustModal(false);
      fetchProducts();
    } catch (err) {
      error(err.response?.data?.message || 'Stock adjustment failed');
    }
  };

  const handleOpenHistory = async (prod) => {
    setSelectedProduct(prod);
    try {
      const res = await api.get(`/products/${prod._id}`);
      if (res.data.success) {
        setProductHistory(res.data.data.transactions);
        setShowHistoryModal(true);
      }
    } catch (err) {
      error('Failed to load transaction history');
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (selectedProduct) {
        // Edit
        await api.put(`/products/${selectedProduct._id}`, {
          ...formData,
          costPrice: Number(formData.costPrice),
          sellingPrice: Number(formData.sellingPrice) || 0,
          minStockLevel: Number(formData.minStockLevel),
        });
        success('Product updated successfully');
      } else {
        // Create
        await api.post('/products', {
          ...formData,
          category: activeTab,
          costPrice: Number(formData.costPrice),
          sellingPrice: Number(formData.sellingPrice) || 0,
          minStockLevel: Number(formData.minStockLevel),
          currentStock: Number(formData.currentStock) || 0,
        });
        success('Product created successfully');
      }
      setShowAddModal(false);
      fetchProducts();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleOpenEdit = (prod) => {
    setSelectedProduct(prod);
    setFormData({
      name: prod.name || '',
      sku: prod.sku || '',
      category: prod.category || activeTab,
      subcategory: prod.subcategory || '',
      unit: prod.unit || 'packet',
      costPrice: prod.costPrice !== undefined ? prod.costPrice.toString() : '',
      sellingPrice: prod.sellingPrice !== undefined ? prod.sellingPrice.toString() : '',
      minStockLevel: prod.minStockLevel !== undefined ? prod.minStockLevel.toString() : '50',
      currentStock: prod.currentStock !== undefined ? prod.currentStock.toString() : '0',
      description: prod.description || '',
    });
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setSelectedProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: activeTab,
      subcategory: activeTab === 'finished_good' ? 'black_tea' : 'bulk_tea_leaf',
      unit: activeTab === 'finished_good' ? 'packet' : 'kg',
      costPrice: '',
      sellingPrice: '',
      minStockLevel: '50',
      currentStock: '0',
      description: '',
    });
    setShowAddModal(true);
  };

  const handleExportCSV = () => {
    const rows = products.map((p) => ({
      name: p.name,
      sku: p.sku,
      category: p.category,
      unit: p.unit,
      currentStock: p.currentStock,
      minStockLevel: p.minStockLevel,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      totalValuation: p.currentStock * p.costPrice,
    }));
    exportToCSV(`Inventory_${activeTab}_${Date.now()}`, rows, [
      { key: 'name', label: 'Product Name' },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'Category' },
      { key: 'unit', label: 'Unit' },
      { key: 'currentStock', label: 'Current Stock' },
      { key: 'minStockLevel', label: 'Min Stock Level' },
      { key: 'costPrice', label: 'Cost Price (₹)' },
      { key: 'sellingPrice', label: 'Selling Price (₹)' },
      { key: 'totalValuation', label: 'Valuation (₹)' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Inventory & Stock
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage finished tea cartons and raw materials with audit ledger.
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
          {hasRole('owner', 'manager') && (
            <button
              onClick={openAddModal}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add {activeTab === 'finished_good' ? 'Tea Packet' : 'Raw Material'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Valuation Banner */}
      {valuation && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Stock Valuation
            </span>
            <p className="text-lg font-black text-emerald-800 mt-0.5">
              {formatCurrency(valuation.totalValuation)}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Finished Goods Stock
            </span>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              {formatCurrency(valuation.finishedGoodsValue)}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Raw Materials Stock
            </span>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              {formatCurrency(valuation.rawMaterialsValue)}
            </p>
          </div>
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200 pb-3">
        <div className="flex space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('finished_good')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'finished_good'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Finished Tea Packets</span>
          </button>
          <button
            onClick={() => setActiveTab('raw_material')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'raw_material'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Raw Materials & Bulk Leaf</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or name..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : products.length === 0 ? (
        <EmptyState
          title={`No ${activeTab === 'finished_good' ? 'finished products' : 'raw materials'} found`}
          description="Click the button above to add a new inventory item."
          actionText={hasRole('owner', 'manager') ? 'Add Item' : undefined}
          onAction={openAddModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Min. Threshold</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  {activeTab === 'finished_good' && (
                    <th className="py-3 px-4 text-right">Selling Price</th>
                  )}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {products.map((p) => {
                  const isLow = p.currentStock <= p.minStockLevel;
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <span className="text-[10px] text-slate-400 capitalize">{p.subcategory || p.category}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                            {p.currentStock} {p.unit}
                          </span>
                          {isLow && <Badge status="low_stock" text="Low Stock" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {p.minStockLevel} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(p.costPrice)}
                      </td>
                      {activeTab === 'finished_good' && (
                        <td className="py-3 px-4 text-right font-bold text-emerald-800">
                          {formatCurrency(p.sellingPrice)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenHistory(p)}
                          title="Stock Ledger History"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {hasRole('owner', 'manager') && (
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product Details"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasRole('owner', 'manager') && (
                          <button
                            onClick={() => handleOpenAdjust(p)}
                            title="Adjust Stock Count / Damage"
                            className="px-2.5 py-1 rounded-lg border border-emerald-600 bg-emerald-50 text-emerald-800 font-bold text-[11px] hover:bg-emerald-100 transition"
                          >
                            Adjust Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title={`Adjust Stock: ${selectedProduct?.name}`}
        subtitle={`Current stock in warehouse: ${selectedProduct?.currentStock} ${selectedProduct?.unit}`}
      >
        <form onSubmit={submitAdjustStock} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Quantity Change (+ to add, - to deduct)
            </label>
            <input
              type="number"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. +50 or -10"
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              New stock will be: {(selectedProduct?.currentStock || 0) + (Number(adjustQty) || 0)} {selectedProduct?.unit}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Adjustment Type / Reason
            </label>
            <select
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="adjustment">Physical Count Reconciliation</option>
              <option value="damage">Damaged / Moisture Spoiled Stock</option>
              <option value="purchase">Manual Purchase Intake</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Notes & Justification
            </label>
            <textarea
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              placeholder="Reason for discrepancy..."
              rows={2}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdjustModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Save Stock Adjustment
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock Transaction Ledger History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Stock Ledger History: ${selectedProduct?.name}`}
        subtitle={`SKU: ${selectedProduct?.sku} | Current Stock: ${selectedProduct?.currentStock} ${selectedProduct?.unit}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {productHistory.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No transaction logs recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {productHistory.map((tx) => (
                <div key={tx._id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold ${tx.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {selectedProduct?.unit}
                      </span>
                      <Badge status={tx.type} text={tx.type.replace('_', ' ')} />
                    </div>
                    <p className="text-slate-500 mt-0.5">{tx.notes || 'Routine stock operation'}</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      By {tx.createdBy?.name || 'Staff'} • {formatDateTime(tx.createdAt)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[11px]">Balance:</span>
                    <p className="font-bold text-slate-800 font-mono">{tx.newStock} {selectedProduct?.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={selectedProduct ? `Edit Product: ${selectedProduct.name}` : `Add New ${activeTab === 'finished_good' ? 'Tea Packet' : 'Raw Material'}`}
        subtitle="Ensure unique SKU and accurate cost pricing for valuation"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Product Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. ChaiCraft Gold 250g"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                SKU Code {selectedProduct && '(Immutable)'}
              </label>
              <input
                type="text"
                required
                disabled={!!selectedProduct}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. CC-GOLD-250G"
                className={`mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                  selectedProduct ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Unit of Measure
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="packet">Packet</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="box">Box</option>
                <option value="carton">Carton</option>
                <option value="piece">Piece</option>
                <option value="bag">Bag</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Cost Price (₹)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.1"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="e.g. 65"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {activeTab === 'finished_good' ? (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  value={formData.sellingPrice}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                  placeholder="e.g. 110"
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Min Reorder Level
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Initial Stock
              </label>
              <input
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                placeholder="0"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            {activeTab === 'finished_good' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Min Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minStockLevel}
                  onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Description / Specifications
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tea grade, packaging specs..."
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
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Save Product
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
