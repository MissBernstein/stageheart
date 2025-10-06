// Main App component for Voices & Profiles feature
import React from 'react';
import { AuthProvider } from './hooks/useAuth';
import { PlayerProvider } from './hooks/usePlayer';
import { ToastProvider } from './components/ui/Toast';
import { VoicesRouter } from './router';
import './styles/globals.css';

export const VoicesApp: React.FC = () => {
  return (
    <AuthProvider>
      <PlayerProvider>
        <ToastProvider>
          <VoicesRouter />
        </ToastProvider>
      </PlayerProvider>
    </AuthProvider>
  );
};