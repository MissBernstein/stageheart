// React Router setup for Voices & Profiles (as sub-routes)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useLocation, useNavigate } from 'react-router-dom';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthGuard } from './components/auth/AuthGuard';

export const VoicesRouter: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Layout>
  <Routes>
  {/* Legacy voice & profile pages removed; index now points to app inbox fallback */}
  <Route index element={<Navigate to="/" replace />} />
  {/* Redirect legacy settings to root (modal driven) */}
  <Route path="settings" element={<Navigate to="/" replace />} />
  {/* Redirect any legacy profile or voice deep links to root */}
  <Route path="p/:userId" element={<Navigate to="/" replace />} />
  <Route path="voice/:recordingId" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
};

// Route definitions for navigation
export const routes = {
  // Minimal remaining routes (some legacy deep links retained for redirect behavior)
  settings: '/app/settings',
  inbox: '/app/inbox'
} as const;