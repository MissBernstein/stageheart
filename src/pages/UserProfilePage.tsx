// User profile page showing their recordings and info
import React from 'react';
import { useParams } from 'react-router-dom';
import { theme } from '../styles/theme';

export const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();

  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: theme.spacing.lg,
      }}
    >
      <h1
        style={{
          fontSize: theme.typography.sizes['2xl'],
          fontWeight: theme.typography.weights.bold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
        }}
      >
        User Profile
      </h1>
      <p style={{ color: theme.colors.text.secondary }}>
        User ID: {userId}
      </p>
      <p style={{ color: theme.colors.text.secondary }}>
        This page will show the user's public profile including their bio, 
        voice recordings, and contact options based on privacy settings.
      </p>
    </div>
  );
};