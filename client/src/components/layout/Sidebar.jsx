import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Factory,
  Users2,
  Truck,
  CreditCard,
  UserCheck,
  Receipt,
  BellRing,
  BarChart3,
  ShieldCheck,
  UserCog,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, hasRole, isWorker } = useAuth();

  const allNavItems = [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['owner', 'manager'],
    },
    {
      title: 'My Workspace',
      path: '/worker-portal',
      icon: LayoutDashboard,
      roles: ['worker'],
    },
    {
      title: 'Sales & Invoices',
      path: '/sales',
      icon: ShoppingCart,
      roles: ['owner', 'manager', 'sales'],
    },
    {
      title: 'Inventory & Stock',
      path: '/inventory',
      icon: Boxes,
      roles: ['owner', 'manager', 'sales'],
    },
    {
      title: 'Tea Production',
      path: '/production',
      icon: Factory,
      roles: ['owner', 'manager'],
    },
    {
      title: 'Dealers & Clients',
      path: '/dealers',
      icon: Users2,
      roles: ['owner', 'manager', 'sales'],
    },
    {
      title: 'Purchases & Vendors',
      path: '/purchases',
      icon: Truck,
      roles: ['owner', 'manager'],
    },
    {
      title: 'Credit & Dues',
      path: '/credit-dues',
      icon: CreditCard,
      roles: ['owner', 'manager', 'sales'],
    },
    {
      title: 'Staff & Attendance',
      path: '/workers',
      icon: UserCheck,
      roles: ['owner', 'manager'],
    },
    {
      title: 'Expenses',
      path: '/expenses',
      icon: Receipt,
      roles: ['owner', 'manager'],
    },
    {
      title: 'Expiry & Reminders',
      path: '/reminders',
      icon: BellRing,
      roles: ['owner', 'manager'],
    },
    {
      title: 'Business Reports',
      path: '/reports',
      icon: BarChart3,
      roles: ['owner', 'manager'],
    },
    {
      title: 'Audit Logs',
      path: '/audit-logs',
      icon: ShieldCheck,
      roles: ['owner'],
    },
    {
      title: 'User Management',
      path: '/users',
      icon: UserCog,
      roles: ['owner'],
    },
  ];

  const visibleItems = allNavItems.filter((item) =>
    item.roles.some((role) => user?.role === role)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/80 flex items-center justify-center text-emerald-200 font-bold shadow-inner">
              🍵
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight font-serif">
                ChaiCraft
              </span>
              <span className="block text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                Tea Operations
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-800 flex items-center justify-center font-bold text-emerald-200 text-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={logout}
            className="flex items-center space-x-3 w-full px-3.5 py-2.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
