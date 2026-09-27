import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { OverviewView } from './components/overview/OverviewView';
import { LogsView } from './components/logs/LogsView';
import { AlertsView } from './components/alerts/AlertsView';
import { MfaSettingsView } from './components/settings/MfaSettingsView';
import { AdminView } from './components/admin/AdminView';
import { AuthModal } from './components/auth/AuthModal';
import * as api from './services/api';
import { Shield, Loader2 } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [openAlertCount, setOpenAlertCount] = useState<number>(0);

  const refreshAlertCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.fetchAlerts({ status: 'open', limit: 1 });
      if (res && res.pagination) {
        setOpenAlertCount(res.pagination.total);
      }
    } catch {
      // In standalone or unauthenticated state, fail silently
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshAlertCount();
      const interval = setInterval(refreshAlertCount, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshAlertCount]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-app)',
          color: 'var(--text-secondary)',
          gap: 16,
        }}
      >
        <div className="brand-icon" style={{ width: 48, height: 48, borderRadius: 12 }}>
          <Shield size={26} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
          <Loader2 size={16} className="animate-spin" />
          <span>Initializing SentinelKey Security Operations Console...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthModal />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAlertCount={openAlertCount}
      />
      <div className="main-content">
        <Navbar currentTab={currentTab} />
        <main style={{ flex: 1 }}>
          {currentTab === 'overview' && (
            <OverviewView onNavigateTab={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'logs' && <LogsView />}
          {currentTab === 'alerts' && (
            <AlertsView onRefreshAlertCount={refreshAlertCount} />
          )}
          {currentTab === 'mfa' && <MfaSettingsView />}
          {currentTab === 'admin' && <AdminView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
