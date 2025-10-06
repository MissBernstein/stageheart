// Settings page for user preferences
import React from 'react';
import { theme } from '../styles/theme';

export const SettingsPage: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: '800px',
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
        Settings
      </h1>
      <p style={{ color: theme.colors.text.secondary }}>
        This page will contain user settings including:
      </p>
      <ul style={{ color: theme.colors.text.secondary, marginTop: theme.spacing.sm }}>
        <li>Profile settings (bio, photo, voice persona)</li>
        <li>Privacy controls (meet requirements, message settings)</li>
        <li>Notification preferences</li>
        <li>Recording management</li>
        <li>Account settings</li>
      </ul>
    </div>
  );
};