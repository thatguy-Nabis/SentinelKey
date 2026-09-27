import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SignupPage } from './pages/SignupPage.js';
import { HubPage } from './pages/HubPage.js';
import { BillingPage } from './pages/BillingPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/app" element={<HubPage />} />
      <Route path="/app/billing" element={<BillingPage />} />
      <Route path="/app/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
