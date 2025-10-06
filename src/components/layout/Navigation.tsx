// Main navigation component
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Search, UserCircle, MessageCircle, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  {
    path: '/app/voices',
    label: 'Discover',
    icon: Search,
    requiresAuth: false
  },
  {
    path: '/app/p/me',
    label: 'My Profile',
    icon: UserCircle,
    requiresAuth: true
  },
  {
    path: '/app/inbox',
    label: 'Messages',
    icon: MessageCircle,
    requiresAuth: true
  },
  {
    path: '/app/settings',
    label: 'Settings',
    icon: Settings,
    requiresAuth: true
  }
];

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const visibleNavItems = navItems.filter(item => 
    !item.requiresAuth || isAuthenticated
  );

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
          <span>Stageheart Voices</span>
        </Link>

        {/* Navigation Links */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md
          }}
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/p/me' && location.pathname.startsWith('/p/'));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                  borderRadius: theme.radius.md,
                  textDecoration: 'none',
                  color: isActive ? theme.colors.primary : theme.colors.text.secondary,
                  backgroundColor: isActive ? `${theme.colors.primary}10` : 'transparent',
                  fontSize: theme.typography.sizes.sm,
                  fontWeight: theme.typography.weights.medium,
                  transition: 'all 0.2s ease'
                }}
                className={cn(
                  'hover:bg-gray-50 hover:text-gray-900',
                  isActive && 'text-blue-600 bg-blue-50'
                )}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};