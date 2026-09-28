import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { IUserProfile } from '@sentinelkey/shared-types';
import { api, refreshAccessToken, setAccessToken, setStoredRefreshToken } from '../services/api.js';

interface AuthContextType {
  user: IUserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch {
      setUser(null);
      setAccessToken(null);
      setStoredRefreshToken(null);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        await refreshUser();
      } else {
        setAccessToken(null);
        setStoredRefreshToken(null);
      }
      setLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    await api.login(email, password);
    await refreshUser();
  };

  const register = async (email: string, password: string) => {
    await api.register(email, password);
    await refreshUser();
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
