import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface User {
  id: number;
  customer_id?: string;
  name: string;
  nickname?: string;
  email: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  loyalty_points: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('wag_authed_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const loginInProgress = useRef(false);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setUser(null);
          localStorage.removeItem('wag_authed_user');
          return false;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('wag_authed_user', JSON.stringify(data.user));
        return true;
      } else {
        setUser(null);
        localStorage.removeItem('wag_authed_user');
        return false;
      }
    } catch (err) {
      console.error('checkAuth error:', err);
      setUser(null);
      localStorage.removeItem('wag_authed_user');
      return false;
    }
  }, []);

  useEffect(() => {
    checkAuth().finally(() => setLoading(false));
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<User> => {
    if (loginInProgress.current) throw new Error('Login already in progress');
    loginInProgress.current = true;
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }
      setUser(data.user);
      localStorage.setItem('wag_authed_user', JSON.stringify(data.user));
      return data.user;
    } finally {
      loginInProgress.current = false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('wag_authed_user');
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};