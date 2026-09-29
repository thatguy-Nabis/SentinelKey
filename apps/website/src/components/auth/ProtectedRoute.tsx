import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading && !user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--hub-bg-app, #0c0817)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8B5CF6',
        }}
      >
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
