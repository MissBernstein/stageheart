// Skip to content link for accessibility
import React from 'react';
import { theme } from '../../styles/theme';

export const SkipToContent: React.FC = () => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <a
      href="#main-content"
      style={{
        position: 'absolute',
        top: isFocused ? theme.spacing.sm : '-40px',
        left: theme.spacing.sm,
        backgroundColor: theme.colors.primary,
        color: 'white',
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        borderRadius: theme.radius.md,
        textDecoration: 'none',
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.medium,
        zIndex: 1000,
        transition: 'top 0.3s ease'
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      Skip to main content
    </a>
  );
};