// Main navigation component
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';

// Navigation is simplified; all global actions live in the main app shell.

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav 
      style={{
        backgroundColor: 'white',
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: `0 ${theme.spacing.lg}`,
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto',
          height: '64px'
        }}
      >
        {/* Logo */}
        <Link 
          to="/app/voices"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            textDecoration: 'none',
            color: theme.colors.text.primary,
            fontSize: theme.typography.sizes.lg,
            fontWeight: theme.typography.weights.bold
          }}
        >
          <Heart size={28} color={theme.colors.primary} />
          <span>Discover Voices</span>
        </Link>
        {/* Intentionally empty right side to keep layout balanced */}
        <div style={{ width: '120px' }} />
      </div>
    </nav>
  );
};