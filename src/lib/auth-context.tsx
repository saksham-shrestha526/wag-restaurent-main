import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';

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

// Define the response type from API
interface ApiResponse<T = any> {
  success: boolean;
  user?: User;
  message?: string;
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
      const data = await api.getMe() as ApiResponse;
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('wag_authed_user', JSON.stringify(data.user));
        return true;
      } else {
        setUser(null);
        localStorage.removeItem('wag_authed_user');
        return false;
      }
    } catch (err: any) {
      // Handle 401 gracefully - don't log as error
      if (err.status === 401) {
        console.debug('Auth token expired or invalid (401)');
      } else {
        console.error('checkAuth error:', err);
      }
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
      const data = await api.login(email, password) as ApiResponse;
      if (!data.success) throw new Error(data.message || 'Login failed');
      if (!data.user) throw new Error('No user data returned');
      setUser(data.user);
      localStorage.setItem('wag_authed_user', JSON.stringify(data.user));
      return data.user;
    } finally {
      loginInProgress.current = false;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
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
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};