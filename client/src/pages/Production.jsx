import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate, exportToCSV } from '../utils/formatters';
import {
  Factory,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Users,
  Download,
  AlertCircle,
} from 'lucide-react';

export const Production = () => {
  const { hasRole } = useAuth();
  const { success, error } = useToast();

  const [batches, setBatches] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [actualProducedQty, setActualProducedQty] = useState('');

  // Form State
  const [batchForm, setBatchForm] = useState({
    product: '',
    plannedQuantity: 1000,
    productionDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    workers: [],
    rawMaterials: [{ product: '', quantity: 0, unit: 'kg' }],
    notes: '',
  });

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/production?status=${statusFilter}` : '/production';
      const res = await api.get(url);
      if (res.data.success) {
        setBatches(res.data.data);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [fgRes, rmRes, workRes] = await Promise.all([
        api.get('/products?category=finished_good'),
        api.get('/products?category=raw_material'),
        api.get('/workers?status=active'),
      ]);
      if (fgRes.data.success) setFinishedProducts(fgRes.data.data);
      if (rmRes.data.success) setRawMaterials(rmRes.data.data);
      if (workRes.data.success) setWorkers(workRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const handleAddRM = () => {
    setBatchForm({
      ...batchForm,
      rawMaterials: [...batchForm.rawMaterials, { product: '', quantity: 0, unit: 'kg' }],
    });
  };

  const handleRMChange = (index, field, value) => {
    const updated = [...batchForm.rawMaterials];
    if (field === 'product') {
      const selectedRM = rawMaterials.find((r) => r._id === value);
      updated[index].product = value;
      updated[index].unit = selectedRM ? selectedRM.unit : 'kg';
    } else {
      updated[index][field] = value;
    }
    setBatchForm({ ...batchForm, rawMaterials: updated });
  };

  const handleRemoveRM = (index) => {
    if (batchForm.rawMaterials.length > 1) {
      setBatchForm({
        ...batchForm,
        rawMaterials: batchForm.rawMaterials.filter((_, i) => i !== index),
      });
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.product) {
      error('Please select a finished tea product');
      return;
    }

    const validConsumed = batchForm.rawMaterials
      .filter((rm) => rm.product && Number(rm.quantity) > 0)
      .map((rm) => ({
        product: rm.product,
        quantity: Number(rm.quantity),
        unit: rm.unit,
      }));

    try {
      await api.post('/production', {
        product: batchForm.product,
        plannedQuantity: Number(batchForm.plannedQuantity),
        productionDate: batchForm.productionDate,
        expiryDate: batchForm.expiryDate || null,
        workers: batchForm.workers,
        rawMaterialsConsumed: validConsumed,
        notes: batchForm.notes,
        status: 'in_progress',
      });
      success('Production batch created and started!');
      setShowCreateModal(false);
      fetchBatches();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to create batch');
    }
  };

  const handleOpenComplete = (batch) => {
    setSelectedBatch(batch);
    setActualProducedQty(batch.plannedQuantity.toString());
    setShowCompleteModal(true);
  };

  const submitCompleteBatch = async (e) => {
    e.preventDefault();
    if (!actualProducedQty || Number(actualProducedQty) <= 0) {
      error('Please enter a valid produced quantity');
      return;
    }

    try {
      await api.patch(`/production/${selectedBatch._id}/status`, {
        status: 'completed',
        producedQuantity: Number(actualProducedQty),
      });
      success(`Batch ${selectedBatch.batchNumber} completed! Inventory has been updated.`);
      setShowCompleteModal(false);
      fetchBatches();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to complete batch');
    }
  };

  const handleExportCSV = () => {
    const rows = batches.map((b) => ({
      batchNumber: b.batchNumber,
      product: b.product?.name,
      plannedQty: b.plannedQuantity,
      producedQty: b.producedQuantity,
      status: b.status,
      date: formatDate(b.productionDate),
      workersCount: b.workers?.length || 0,
    }));
    exportToCSV(`Production_Batches_${Date.now()}`, rows, [
      { key: 'batchNumber', label: 'Batch Number' },
      { key: 'product', label: 'Finished Tea Product' },
      { key: 'plannedQty', label: 'Planned Qty' },
      { key: 'producedQty', label: 'Produced Qty' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Production Date' },
      { key: 'workersCount', label: 'Workers Count' },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Tea Production & Batching
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Plan manufacturing batches, record raw tea leaf consumption & track yields.
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
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Production Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-3">
        {['', 'in_progress', 'completed', 'planned'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
              statusFilter === status
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {status ? status.replace('_', ' ') : 'All Batches'}
          </button>
        ))}
      </div>

      {/* Batch Cards Grid */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : batches.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No production batches found"
          description="Create a production run to manufacture finished tea packets."
          actionText={hasRole('owner', 'manager') ? 'Start Batch' : undefined}
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((batch) => {
            const isCompleted = batch.status === 'completed';
            const yieldPct =
              batch.plannedQuantity > 0 && batch.producedQuantity > 0
                ? ((batch.producedQuantity / batch.plannedQuantity) * 100).toFixed(1)
                : null;

            return (
              <div
                key={batch._id}
                className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        {batch.batchNumber}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                        {batch.product?.name}
                      </h3>
                    </div>
                    <Badge status={batch.status} />
                  </div>

                  {/* Yield & Numbers */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Planned Quantity:</span>
                      <strong className="text-slate-900">{batch.plannedQuantity} pkts</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Actual Produced:</span>
                      <strong className={isCompleted ? 'text-emerald-700 font-black' : 'text-slate-400'}>
                        {isCompleted ? `${batch.producedQuantity} pkts` : 'In Progress...'}
                      </strong>
                    </div>
                    {yieldPct && (
                      <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px]">
                        <span className="text-slate-500">Batch Yield Rate:</span>
                        <span className="font-bold text-emerald-700">{yieldPct}%</span>
                      </div>
                    )}
                  </div>

                  {/* Consumed Raw Materials summary */}
                  {batch.rawMaterialsConsumed?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Ingredients / Packaging:
                      </p>
                      <div className="space-y-1">
                        {batch.rawMaterialsConsumed.map((rm, i) => (
                          <div key={i} className="flex justify-between text-xs text-slate-600">
                            <span className="truncate max-w-[160px]">{rm.product?.name || 'Raw leaf'}</span>
                            <span className="font-medium text-slate-800">
                              {rm.quantity} {rm.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date & Worker badges */}
                  <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Date: {formatDate(batch.productionDate)}</span>
                    <span>{batch.workers?.length || 0} Workers on team</span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {hasRole('owner', 'manager') && batch.status !== 'completed' ? (
                    <button
                      onClick={() => handleOpenComplete(batch)}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Batch & Update Stock</span>
                    </button>
                  ) : (
                    <div className="text-center text-[11px] font-semibold text-emerald-700 flex items-center justify-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Inventory Processed & Added</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Batch Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title={`Complete Batch: ${selectedBatch?.batchNumber}`}
        subtitle={`Product: ${selectedBatch?.product?.name}`}
      >
        <form onSubmit={submitCompleteBatch} className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
            Completing this batch will automatically deduct consumed raw materials and add finished packets to available inventory.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Actual Finished Packets Produced
            </label>
            <input
              type="number"
              required
              min="1"
              value={actualProducedQty}
              onChange={(e) => setActualProducedQty(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Planned quantity was {selectedBatch?.plannedQuantity} pkts
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCompleteModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Confirm & Finalize Inventory
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Batch Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Schedule New Production Batch"
        subtitle="Specify finished tea blend, target quantity, recipe consumption & staff"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateBatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Finished Tea Product
              </label>
              <select
                required
                value={batchForm.product}
                onChange={(e) => setBatchForm({ ...batchForm, product: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">Select tea product to produce...</option>
                {finishedProducts.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (Current Stock: {p.currentStock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Target Planned Quantity (Packets)
              </label>
              <input
                type="number"
                required
                min="1"
                value={batchForm.plannedQuantity}
                onChange={(e) => setBatchForm({ ...batchForm, plannedQuantity: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Production Date
              </label>
              <input
                type="date"
                required
                value={batchForm.productionDate}
                onChange={(e) => setBatchForm({ ...batchForm, productionDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Batch Best Before Expiry Date
              </label>
              <input
                type="date"
                value={batchForm.expiryDate}
                onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Raw Material Recipe Consumption */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Raw Material Consumption Recipe
              </label>
              <button
                type="button"
                onClick={handleAddRM}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient / Pouch</span>
              </button>
            </div>

            <div className="space-y-2">
              {batchForm.rawMaterials.map((rm, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <select
                      value={rm.product}
                      onChange={(e) => handleRMChange(idx, 'product', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">Select Raw Material / Pouch...</option>
                      {rawMaterials.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name} (Stock: {r.currentStock} {r.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={rm.quantity}
                      onChange={(e) => handleRMChange(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right font-medium"
                    />
                  </div>
                  <span className="w-12 text-xs text-slate-500 font-mono">{rm.unit}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRM(idx)}
                    disabled={batchForm.rawMaterials.length <= 1}
                    className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Production Notes
            </label>
            <textarea
              value={batchForm.notes}
              onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
              placeholder="Flavour notes, humidity, machine calibration..."
              rows={2}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
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
              Schedule Batch
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
