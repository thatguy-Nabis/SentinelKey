import React, { createContext, useContext, useState, useEffect } from 'react';
import type { IUserProfile, RoleName } from '@sentinelkey/shared-types';
import * as api from '../services/api';

interface AuthContextType {
  user: IUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingMfaToken: string | null;
  login: (email: string, password: string, location?: { latitude: number; longitude: number; city?: string }) => Promise<{ mfaRequired: boolean }>;
  verifyMfa: (code: string, location?: { latitude: number; longitude: number; city?: string }) => Promise<void>;
  cancelMfa: () => void;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: RoleName) => boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
  isViewer: boolean;
  canAccess: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingMfaToken, setPendingMfaToken] = useState<string | null>(null);

  useEffect(() => {
    // Initial bootstrap: try to load profile if refresh token exists
    const initAuth = async () => {
      const refreshToken = api.getStoredRefreshToken();
      if (refreshToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch {
          // Silent failure on init
          api.setAccessToken(null);
          api.setStoredRefreshToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
    location?: { latitude: number; longitude: number; city?: string },
  ) => {
    const res = await api.login(email, password, location);

    if (res.mfaRequired && res.mfaToken) {
      setPendingMfaToken(res.mfaToken);
      return { mfaRequired: true };
    }

    if (res.user) {
      setUser(res.user);
      setPendingMfaToken(null);
    }

    return { mfaRequired: false };
  };

  const verifyMfa = async (
    code: string,
    location?: { latitude: number; longitude: number; city?: string },
  ) => {
    if (!pendingMfaToken) {
      throw new Error('No pending MFA challenge found');
    }

    const res = await api.verifyMfaLogin(pendingMfaToken, code, location);
    if (res.user) {
      setUser(res.user);
      setPendingMfaToken(null);
    }
  };

  const cancelMfa = () => {
    setPendingMfaToken(null);
  };

  const register = async (email: string, password: string) => {
    const res = await api.register(email, password);
    if (res.user) {
      setUser(res.user);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setPendingMfaToken(null);
  };

  const refreshProfile = async () => {
    if (!api.getAccessToken()) return;
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch {
      // ignore
    }
  };

  const hasRole = (role: RoleName) => {
    return user?.roles.includes(role) ?? false;
  };

  const isAdmin = hasRole('admin');
  const isAnalyst = hasRole('analyst') || isAdmin;
  const isViewer = Boolean(user);

  const canAccess = (permission: string) => {
    if (!user) return false;
    if (isAdmin) return true;

    if (permission.startsWith('logs:')) return true; // viewer and analyst can read logs
    if (permission.startsWith('alerts:read')) return isAnalyst;
    if (permission.startsWith('alerts:write')) return isAnalyst;
    if (permission.startsWith('users:') || permission.startsWith('settings:manage')) return isAdmin;

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        pendingMfaToken,
        login,
        verifyMfa,
        cancelMfa,
        register,
        logout,
        refreshProfile,
        hasRole,
        isAdmin,
        isAnalyst,
        isViewer,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
