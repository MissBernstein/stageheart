// 404 Not Found page
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { theme } from '../styles/theme';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: theme.spacing.lg,
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '4rem',
          fontWeight: theme.typography.weights.bold,
          color: theme.colors.primary,
          marginBottom: theme.spacing.sm,
        }}
      >
        404
      </h1>
      
      <h2
        style={{
          fontSize: theme.typography.sizes.xl,
          fontWeight: theme.typography.weights.semibold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
        }}
      >
        Page Not Found
      </h2>
      
      <p
        style={{
          fontSize: theme.typography.sizes.base,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.xl,
          maxWidth: '400px',
        }}
      >
        The page you're looking for doesn't exist or has been moved.
      </p>
      
      <div
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Button asChild>
          <Link to="/voices">
            <Home size={16} />
            Go Home
          </Link>
        </Button>
        
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft size={16} />
          Go Back
        </Button>
      </div>
    </div>
  );
};