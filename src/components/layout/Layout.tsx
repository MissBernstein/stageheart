// Main layout component for the Voices & Profiles feature
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { SkipToContent } from './SkipToContent';
import { AudioPlayer } from '../audio/AudioPlayer.tsx';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: theme.typography.sizes.lg,
          color: theme.colors.text.secondary,
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <SkipToContent />
      <Navigation />
      
      <main
        id="main-content"
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
        tabIndex={-1}
      >
        {children || <Outlet />}
      </main>

      {/* Global audio player - always visible when audio is loaded */}
      <AudioPlayer />
    </div>
  );
};