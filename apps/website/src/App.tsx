import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage.js';
import { ProductsPage } from './pages/ProductsPage.js';
import { SupportPage } from './pages/SupportPage.js';
import { PricingPage } from './pages/PricingPage.js';
import { BlogPage } from './pages/BlogPage.js';
import { DocsPage } from './pages/DocsPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { Loader2 } from 'lucide-react';

// Lazy load secondary/heavy application pages for optimized bundle splitting
const MockKhaltiWallet = lazy(() => import('./pages/MockKhaltiWallet.js').then((m) => ({ default: m.MockKhaltiWallet })));
const HubPage = lazy(() => import('./pages/HubPage.js').then((m) => ({ default: m.HubPage })));
const BillingPage = lazy(() => import('./pages/BillingPage.js').then((m) => ({ default: m.BillingPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage.js').then((m) => ({ default: m.SettingsPage })));

const RouteLoadingFallback: React.FC = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0F172A',
      color: '#A78BFA',
      gap: '1rem',
    }}
  >
    <Loader2 size={32} className="pulse-emerald" />
    <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Loading SentinelKey Workspace...</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/mock-khalti" element={<MockKhaltiWallet />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <HubPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/billing"
          element={
            <ProtectedRoute>
              <BillingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/settings/:tab"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
