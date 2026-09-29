import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage.js';
import { ProductsPage } from './pages/ProductsPage.js';
import { SupportPage } from './pages/SupportPage.js';
import { PricingPage } from './pages/PricingPage.js';
import { BlogPage } from './pages/BlogPage.js';
import { DocsPage } from './pages/DocsPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';
import { MockKhaltiWallet } from './pages/MockKhaltiWallet.js';
import { HubPage } from './pages/HubPage.js';
import { BillingPage } from './pages/BillingPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';

export const App: React.FC = () => {
  return (
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
  );
};
