import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, type User } from '../lib/api.js';

interface AuthContextValue {
  user: User | null;
  unreadNotificationsCount: number;
  loading: boolean;
  refreshMe: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    password: string;
    displayName?: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const data = await apiFetch<{
        user: User;
        unreadNotificationsCount: number;
      }>('/auth/me');
      setUser(data.user);
      setUnreadNotificationsCount(data.unreadNotificationsCount ?? 0);
    } catch {
      setUser(null);
      setUnreadNotificationsCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (username: string, password: string) => {
    const data = await apiFetch<{
      user: User;
      unreadNotificationsCount: number;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setUser(data.user);
    setUnreadNotificationsCount(data.unreadNotificationsCount ?? 0);
  };

  const register = async (payload: {
    username: string;
    password: string;
    displayName?: string;
    bio?: string;
  }) => {
    const data = await apiFetch<{
      user: User;
      unreadNotificationsCount: number;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setUser(data.user);
    setUnreadNotificationsCount(data.unreadNotificationsCount ?? 0);
  };

  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setUser(null);
    setUnreadNotificationsCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        unreadNotificationsCount,
        loading,
        refreshMe,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
