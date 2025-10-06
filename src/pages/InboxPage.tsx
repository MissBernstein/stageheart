// Inbox page for messages and notifications
import React from 'react';
import { theme } from '../styles/theme';

export const InboxPage: React.FC = () => {
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
        Messages
      </h1>
      <p style={{ color: theme.colors.text.secondary }}>
        This page will show:
      </p>
      <ul style={{ color: theme.colors.text.secondary, marginTop: theme.spacing.sm }}>
        <li>Direct messages from other users</li>
        <li>Meet requests and responses</li>
        <li>Comment notifications</li>
        <li>System notifications</li>
      </ul>
    </div>
  );
};