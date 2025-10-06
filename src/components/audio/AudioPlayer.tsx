// Global audio player that appears at bottom of screen when audio is playing
import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '../ui/button';
import { usePlayer } from '../../hooks/usePlayer.tsx';
import { theme } from '../../styles/theme';

export const AudioPlayer: React.FC = () => {
  const { 
    currentRecording, 
    isPlaying, 
    currentTime, 
    duration, 
    volume,
    play, 
    pause, 
    seekTo, 
    setVolume,
    skipToPrevious,
    skipToNext
  } = usePlayer();

  // Don't render if no audio is loaded
  if (!currentRecording) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTop: `1px solid ${theme.colors.border}`,
        padding: theme.spacing.md,
        zIndex: 100,
        boxShadow: theme.shadows.lg
      }}
      role="region"
      aria-label="Audio player"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >
        {/* Recording Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: theme.typography.sizes.sm,
              fontWeight: theme.typography.weights.medium,
              color: theme.colors.text.primary,
              marginBottom: theme.spacing.xs,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {currentRecording.title}
          </div>
          <div
            style={{
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            by {currentRecording.user_profile?.display_name || 'Anonymous'}
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={skipToPrevious}
            aria-label="Previous track"
          >
            <SkipBack size={16} />
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={isPlaying ? pause : play}
            style={{
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              padding: 0
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={skipToNext}
            aria-label="Next track"
          >
            <SkipForward size={16} />
          </Button>
        </div>

        {/* Progress */}
        <div
          style={{
            flex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}
        >
          <span
            style={{
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.muted,
              minWidth: '35px'
            }}
          >
            {formatTime(currentTime)}
          </span>

          <div
            style={{
              flex: 1,
              height: '4px',
              backgroundColor: theme.colors.border,
              borderRadius: '2px',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              seekTo(percent * duration);
            }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            aria-label="Seek audio position"
            tabIndex={0}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progress}%`,
                backgroundColor: theme.colors.primary,
                borderRadius: '2px',
                transition: 'width 0.1s ease'
              }}
            />
          </div>

          <span
            style={{
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.muted,
              minWidth: '35px'
            }}
          >
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
            minWidth: '100px'
          }}
        >
          <Volume2 size={16} color={theme.colors.text.muted} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{
              flex: 1,
              height: '4px',
              background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${volume * 100}%, ${theme.colors.border} ${volume * 100}%, ${theme.colors.border} 100%)`,
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer'
            }}
            aria-label="Volume control"
          />
        </div>
      </div>
    </div>
  );
};