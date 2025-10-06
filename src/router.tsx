// React Router setup for Voices & Profiles (as sub-routes)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { VoicesPage } from './pages/VoicesPage';
import { VoiceProfilePage } from './pages/VoiceProfilePage';
import { UserProfilePage } from './pages/UserProfilePage';
import { UserProfileModal } from './components/voices/UserProfileModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { SettingsPage } from './pages/SettingsPage';
import { InboxPage } from './pages/InboxPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthGuard } from './components/auth/AuthGuard';

export const VoicesRouter: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Detect if profile modal should be shown
  const profileMatch = /\/app\/p\/(.+)$/.exec(location.pathname);
  const userId = profileMatch ? decodeURIComponent(profileMatch[1]) : null;
  return (
    <Layout>
      <Routes>
        <Route index element={<Navigate to="voices" replace />} />
        <Route path="voices" element={<VoicesPage />} />
        <Route path="voice/:recordingId" element={<VoiceProfilePage />} />
        <Route path="p/:userId" element={<UserProfilePage />} />
        <Route path="settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path="inbox" element={<AuthGuard><InboxPage /></AuthGuard>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {userId && (
        <UserProfileModal
          userId={userId}
          onClose={() => navigate('/app/voices', { replace: true })}
        />
      )}
    </Layout>
  );
};

// Route definitions for navigation
export const routes = {
  voices: '/app/voices',
  voice: (recordingId: string) => `/app/voice/${recordingId}`,
  userProfile: (userId: string) => `/app/p/${userId}`,
  myProfile: '/app/p/me',
  settings: '/app/settings',
  inbox: '/app/inbox'
} as const;