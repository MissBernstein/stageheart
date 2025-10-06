// React Router setup for Voices & Profiles (as sub-routes)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { VoicesPage } from './pages/VoicesPage';
import { VoiceProfilePage } from './pages/VoiceProfilePage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { InboxPage } from './pages/InboxPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthGuard } from './components/auth/AuthGuard';

export const VoicesRouter: React.FC = () => {
  return (
    <Layout>
      <Routes>
        {/* Default redirect to voices */}
        <Route index element={<Navigate to="voices" replace />} />
        
        {/* Public routes */}
        <Route path="voices" element={<VoicesPage />} />
        <Route path="voice/:recordingId" element={<VoiceProfilePage />} />
        
        {/* User profile routes (public) */}
        <Route path="p/:userId" element={<UserProfilePage />} />
        
        {/* Protected routes */}
        <Route 
          path="settings" 
          element={
            <AuthGuard>
              <SettingsPage />
            </AuthGuard>
          } 
        />
        <Route 
          path="inbox" 
          element={
            <AuthGuard>
              <InboxPage />
            </AuthGuard>
          } 
        />
        
        {/* Catch all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
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