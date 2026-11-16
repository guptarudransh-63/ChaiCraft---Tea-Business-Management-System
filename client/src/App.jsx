import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { SalesOrders } from './pages/SalesOrders';
import { Production } from './pages/Production';
import { Dealers } from './pages/Dealers';
import { Purchases } from './pages/Purchases';
import { CreditDues } from './pages/CreditDues';
import { Workers } from './pages/Workers';
import { Expenses } from './pages/Expenses';
import { Reminders } from './pages/Reminders';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { Users } from './pages/Users';
import { WorkerPortal } from './pages/WorkerPortal';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading factory portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect worker to worker portal, or others to appropriate page
    if (user.role === 'worker') {
      return <Navigate to="/worker-portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'worker') return <Navigate to="/worker-portal" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={<RootRedirect />} />

            {/* App Layout Route */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Worker Self Portal */}
              <Route
                path="/worker-portal"
                element={
                  <ProtectedRoute allowedRoles={['worker', 'owner', 'manager']}>
                    <WorkerPortal />
                  </ProtectedRoute>
                }
              />

              {/* Sales & Orders */}
              <Route
                path="/sales"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager', 'sales']}>
                    <SalesOrders />
                  </ProtectedRoute>
                }
              />

              {/* Inventory */}
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager', 'sales']}>
                    <Inventory />
                  </ProtectedRoute>
                }
              />

              {/* Tea Production */}
              <Route
                path="/production"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager']}>
                    <Production />
                  </ProtectedRoute>
                }
              />

              {/* Dealers & Customers */}
              <Route
                path="/dealers"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager', 'sales']}>
                    <Dealers />
                  </ProtectedRoute>
                }
              />

              {/* Purchases & Suppliers */}
              <Route
                path="/purchases"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager']}>
                    <Purchases />
                  </ProtectedRoute>
                }
              />

              {/* Credit & Dues */}
              <Route
                path="/credit-dues"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager', 'sales']}>
                    <CreditDues />
                  </ProtectedRoute>
                }
              />

              {/* Workers & Staff */}
              <Route
                path="/workers"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager']}>
                    <Workers />
                  </ProtectedRoute>
                }
              />

              {/* Expenses */}
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager']}>
                    <Expenses />
                  </ProtectedRoute>
                }
              />

              {/* Reminders & Expiry */}
              <Route
                path="/reminders"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager']}>
                    <Reminders />
                  </ProtectedRoute>
                }
              />

              {/* Reports */}
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['owner', 'manager']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />

              {/* Audit Logs */}
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />

              {/* Users */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <Users />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
