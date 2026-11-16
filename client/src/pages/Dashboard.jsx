import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  IndianRupee,
  ShoppingCart,
  Factory,
  Receipt,
  Users,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/overview');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <CardSkeleton count={4} />
        <CardSkeleton count={4} />
      </div>
    );
  }

  const { today, financials, alerts, analytics } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            Factory Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time tea manufacturing, inventory levels, sales orders & receivables.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/sales')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale Order</span>
          </button>
          <button
            onClick={() => navigate('/production')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5"
          >
            <Factory className="w-4 h-4" />
            <span>Start Production</span>
          </button>
        </div>
      </div>

      {/* Critical Operational Alerts */}
      {(alerts?.lowStockCount > 0 || alerts?.expiringBatchesCount > 0 || alerts?.overdueDealers?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {alerts?.lowStockCount > 0 && (
            <div
              onClick={() => navigate('/inventory')}
              className="p-4 rounded-xl bg-rose-50 border border-rose-200 cursor-pointer hover:bg-rose-100/60 transition flex items-start space-x-3"
            >
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                  ⚠ Low Stock Alert
                </h4>
                <p className="text-sm font-semibold text-rose-800 mt-0.5">
                  {alerts.lowStockCount} items below threshold
                </p>
                <p className="text-xs text-rose-600 mt-1 truncate">
                  {alerts.lowStockProducts.map((p) => p.name).join(', ')}
                </p>
              </div>
            </div>
          )}

          {alerts?.expiringBatchesCount > 0 && (
            <div
              onClick={() => navigate('/reminders')}
              className="p-4 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100/60 transition flex items-start space-x-3"
            >
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  ⚠ Expiring Soon
                </h4>
                <p className="text-sm font-semibold text-amber-800 mt-0.5">
                  {alerts.expiringBatchesCount} batches expire within 30 days
                </p>
                <p className="text-xs text-amber-600 mt-1 truncate">
                  Inspect finished stock in warehouse
                </p>
              </div>
            </div>
          )}

          {alerts?.overdueDealers?.length > 0 && (
            <div
              onClick={() => navigate('/credit-dues')}
              className="p-4 rounded-xl bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100/60 transition flex items-start space-x-3"
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  ⚠ Overdue Receivables
                </h4>
                <p className="text-sm font-semibold text-blue-800 mt-0.5">
                  {alerts.overdueDealers.length} dealers have pending dues
                </p>
                <p className="text-xs text-blue-600 mt-1 truncate">
                  Total Outstanding: {formatCurrency(financials?.totalCustomerDues)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Overview Grid */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Today's Factory Performance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Sales"
            value={formatCurrency(today?.sales)}
            subtitle={`${today?.ordersCount || 0} orders created today`}
            icon={IndianRupee}
            color="tea"
            onClick={() => navigate('/sales')}
          />
          <StatCard
            title="Production Completed"
            value={`${today?.productionQty || 0} pkts`}
            subtitle="Packets finished today"
            icon={Factory}
            color="blue"
            onClick={() => navigate('/production')}
          />
          <StatCard
            title="Payments Received"
            value={formatCurrency(today?.paymentsReceived)}
            subtitle="Collected from dealers today"
            icon={TrendingUp}
            color="amber"
            onClick={() => navigate('/credit-dues')}
          />
          <StatCard
            title="Attendance"
            value={`${today?.workersPresent || 0} Present`}
            subtitle="Staff on duty in packaging & blending"
            icon={Users}
            color="purple"
            onClick={() => navigate('/workers')}
          />
        </div>
      </div>

      {/* Financial Health Summary */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Business Financial Health
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Inventory Valuation"
            value={formatCurrency(financials?.inventoryValuation)}
            subtitle="Warehouse tea & raw stock value"
            icon={Boxes}
            color="tea"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            title="Dealer Outstanding Dues"
            value={formatCurrency(financials?.totalCustomerDues)}
            subtitle="Money owed by clients"
            icon={AlertTriangle}
            color="rose"
            onClick={() => navigate('/credit-dues')}
          />
          <StatCard
            title="Supplier Payables"
            value={formatCurrency(financials?.totalSupplierPayables)}
            subtitle="Owed to tea gardens & packagers"
            icon={Receipt}
            color="amber"
            onClick={() => navigate('/purchases')}
          />
          <StatCard
            title="Est. Monthly Profit"
            value={formatCurrency(financials?.estimatedProfit)}
            subtitle="Net of tea COGS & operational costs"
            icon={ArrowUpRight}
            color="blue"
            onClick={() => navigate('/reports')}
          />
        </div>
      </div>

      {/* Analytics Charts & Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">7-Day Sales Trend</h3>
              <p className="text-xs text-slate-500">Daily invoiced sales order totals</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Live Pipeline
            </span>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.salesTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="teaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4e934e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4e934e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Sales']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#315e31" strokeWidth={2.5} fillOpacity={1} fill="url(#teaGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Tea Blends */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Top Selling Teas</h3>
              <span className="text-[11px] text-slate-400 font-semibold">Last 30 Days</span>
            </div>

            <div className="mt-4 space-y-3">
              {analytics?.topSellingProducts?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No sales recorded yet</p>
              ) : (
                analytics?.topSellingProducts?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {item.quantity} pkts
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => navigate('/inventory')}
              className="w-full flex items-center justify-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <span>View Finished Goods Inventory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
