// Individual voice recording page
import React from 'react';
import { useParams } from 'react-router-dom';
import { theme } from '../styles/theme';

export const VoiceProfilePage: React.FC = () => {
  const { recordingId } = useParams<{ recordingId: string }>();

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
        Voice Recording
      </h1>
      <p style={{ color: theme.colors.text.secondary }}>
        Recording ID: {recordingId}
      </p>
      <p style={{ color: theme.colors.text.secondary }}>
        This page will show the detailed view of a voice recording with playback controls, 
        comments, and the option to "meet the voice" after listening.
      </p>
    </div>
  );
};