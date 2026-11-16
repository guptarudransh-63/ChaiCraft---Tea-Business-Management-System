import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('chaicraft_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('chaicraft_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data.user);
            localStorage.setItem('chaicraft_user', JSON.stringify(res.data.data.user));
          }
        } catch (err) {
          console.error('Session expired or invalid', err);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { user: userData, token } = res.data.data;
      localStorage.setItem('chaicraft_token', token);
      localStorage.setItem('chaicraft_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
  };

  const logout = () => {
    localStorage.removeItem('chaicraft_token');
    localStorage.removeItem('chaicraft_user');
    setUser(null);
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        hasRole,
        isOwner: user?.role === 'owner',
        isManager: user?.role === 'manager',
        isSales: user?.role === 'sales',
        isWorker: user?.role === 'worker',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
