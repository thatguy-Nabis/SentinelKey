import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { MobileDrawer } from './components/layout/MobileDrawer';
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
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

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
          minHeight: '100dvh',
          background: 'var(--bg-app)',
          color: 'var(--text-secondary)',
          gap: 16,
          padding: 20,
          textAlign: 'center',
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
      {/* Desktop Sidebar (hidden on mobile via CSS) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAlertCount={openAlertCount}
      />

      <div className="main-content">
        <Navbar
          currentTab={currentTab}
          onOpenDrawer={() => setIsMobileDrawerOpen(true)}
          openAlertCount={openAlertCount}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
        <main className="main-viewport">
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

      {/* Mobile-Native Navigation Components */}
      <BottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAlertCount={openAlertCount}
        onOpenMore={() => setIsMobileDrawerOpen(true)}
        isMoreOpen={isMobileDrawerOpen}
      />

      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAlertCount={openAlertCount}
      />
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
