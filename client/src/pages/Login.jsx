import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { LogIn, Shield, Users, Briefcase, HardHat } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      success(`Welcome back, ${user.name}!`);
      if (user.role === 'worker') {
        navigate('/worker-portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      error(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background tea leaf ambiance */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-800 border border-emerald-600/50 text-3xl shadow-xl shadow-emerald-950/50 mb-3">
          🍵
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight font-serif">
          ChaiCraft
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
          Tea Manufacturing & Packaging Business Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-700/80">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@chaibusiness.com"
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Factory Dashboard
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Fill Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-700/80">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
              Quick Demo Logins (Password: password123)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@chaibusiness.com')}
                className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-left transition"
              >
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">Owner</p>
                  <p className="text-[10px] text-slate-400 truncate">Full business</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@chaibusiness.com')}
                className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-left transition"
              >
                <Briefcase className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">Manager</p>
                  <p className="text-[10px] text-slate-400 truncate">Operations & Prod</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sales1@chaibusiness.com')}
                className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-left transition"
              >
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">Sales Rep</p>
                  <p className="text-[10px] text-slate-400 truncate">Orders & Dues</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('worker@chaibusiness.com')}
                className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-left transition"
              >
                <HardHat className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">Worker</p>
                  <p className="text-[10px] text-slate-400 truncate">Self Attendance</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
