// Audio waveform player component for Stageheart
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { theme } from '../../styles/theme';
import type { Recording } from '../../types/voices';

interface WavePlayerProps {
  recording: Recording;
  onPlaybackStart?: () => void;
  onProgress?: (progress: number) => void;
  autoplay?: boolean;
  className?: string;
}

export const WavePlayer: React.FC<WavePlayerProps> = ({
  recording,
  onPlaybackStart,
  onProgress,
  autoplay = false,
  className = ''
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration_sec || 0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      setCurrentTime(audio.currentTime);
      
      if (!hasStarted && audio.currentTime > 0) {
        setHasStarted(true);
        onPlaybackStart?.();
      }
      
      onProgress?.(progress);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [hasStarted, onPlaybackStart, onProgress]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Playback failed:', error);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`wave-player ${className}`} style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      border: `1px solid ${theme.colors.border}`
    }}>
      <audio
        ref={audioRef}
        src={recording.file_stream_url || recording.file_original_url}
        preload="metadata"
        autoPlay={autoplay}
      />
      
      {/* Simplified waveform visualization */}
      <div style={{ 
        position: 'relative',
        height: '60px',
        backgroundColor: '#f1f5f9',
        borderRadius: theme.radius.md,
        overflow: 'hidden'
      }}>
        {/* Mock waveform bars */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          padding: '0 8px',
          gap: '2px'
        }}>
          {Array.from({ length: 50 }, (_, i) => (
            <div
              key={i}
              style={{
                width: '3px',
                height: `${Math.random() * 80 + 20}%`,
                backgroundColor: i < (progressPercent / 2) ? theme.colors.primary : '#cbd5e1',
                borderRadius: '1px',
                transition: 'background-color 0.3s ease'
              }}
            />
          ))}
        </div>
        
        {/* Progress overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            transition: 'width 0.1s ease'
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
        <Button
          variant="default"
          size="default"
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{ minWidth: '80px' }}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
          {isPlaying ? 'Pause' : 'Play'}
        </Button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <span style={{ 
            fontSize: theme.typography.sizes.sm, 
            color: theme.colors.text.secondary,
            minWidth: '40px'
          }}>
            {formatTime(currentTime)}
          </span>
          
          <input
            type="range"
            min="0"
            max="100"
            value={progressPercent}
            onChange={handleSeek}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${progressPercent}%, ${theme.colors.border} ${progressPercent}%, ${theme.colors.border} 100%)`,
              outline: 'none',
              cursor: 'pointer'
            }}
            aria-label="Seek audio position"
          />
          
          <span style={{ 
            fontSize: theme.typography.sizes.sm, 
            color: theme.colors.text.secondary,
            minWidth: '40px'
          }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};