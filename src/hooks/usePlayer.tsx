// Global audio player state management
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Recording } from '../types/voices';

interface PlayerContextType {
  // Current state
  currentRecording: Recording | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  audioLevel: number; // 0-1 approximate loudness
  
  // Actions
  loadRecording: (recording: Recording) => void;
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  skipToPrevious: () => void;
  skipToNext: () => void;
  clearQueue: () => void;
  
  // Queue management
  queue: Recording[];
  currentIndex: number;
  addToQueue: (recording: Recording) => void;
  removeFromQueue: (recordingId: string) => void;
  setQueue: (recordings: Recording[]) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState<Recording[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopAnalyser = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const startAnalyser = () => {
    if (!audioRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      if (!analyserRef.current) {
        const source = audioCtxRef.current.createMediaElementSource(audioRef.current);
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioCtxRef.current.destination);
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(()=>{});
      }
      const tick = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        let sum = 0;
        for (let i=0;i<buf.length;i++) sum += buf[i];
        const avg = sum / buf.length / 255; // 0-1
        setAudioLevel(avg);
        rafRef.current = requestAnimationFrame(tick);
      };
      stopAnalyser();
      tick();
    } catch (e) {
      // Fail silently (some browsers block without gesture)
    }
  };

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    
    const audio = audioRef.current;
    
    // Audio event handlers
    const handleLoadStart = () => setIsLoading(true);
    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(audio.duration || 0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => { setIsPlaying(false); stopAnalyser(); };
    const handleEnded = () => {
      setIsPlaying(false);
      stopAnalyser();
      skipToNext();
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.pause();
    };
  }, []);

  const loadRecording = useCallback(async (recording: Recording) => {
    if (!audioRef.current) return;
    
    // Fetch signed URL if not already present
    let audioUrl = recording.file_stream_url || recording.file_original_url || '';
    
    if (!audioUrl && recording.id) {
      try {
        const { getRecordingSignedUrls } = await import('@/lib/voicesApi');
        const urls = await getRecordingSignedUrls(recording.id);
        if (urls) {
          audioUrl = urls.file_stream_url || urls.file_original_url || '';
        }
      } catch (e) {
        console.error('Failed to fetch signed URL:', e);
      }
    }
    
    audioRef.current.src = audioUrl;
    setCurrentRecording(recording);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const play = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.play().then(() => {
      startAnalyser();
    }).catch(console.error);
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  const skipToPrevious = useCallback(() => {
    if (queue.length === 0) return;
    
    const newIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    setCurrentIndex(newIndex);
    loadRecording(queue[newIndex]);
  }, [queue, currentIndex, loadRecording]);

  const skipToNext = useCallback(() => {
    if (queue.length === 0) return;
    
    const newIndex = currentIndex < queue.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    loadRecording(queue[newIndex]);
  }, [queue, currentIndex, loadRecording]);

  const addToQueue = useCallback((recording: Recording) => {
    setQueue(prev => {
      // Don't add if already in queue
      if (prev.some(r => r.id === recording.id)) {
        return prev;
      }
      return [...prev, recording];
    });
  }, []);

  const removeFromQueue = useCallback((recordingId: string) => {
    setQueue(prev => {
      const newQueue = prev.filter(r => r.id !== recordingId);
      const removedIndex = prev.findIndex(r => r.id === recordingId);
      
      if (removedIndex !== -1 && removedIndex <= currentIndex) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
      
      return newQueue;
    });
  }, [currentIndex]);

  const setQueueWithRecordings = useCallback((recordings: Recording[]) => {
    setQueue(recordings);
    setCurrentIndex(0);
    if (recordings.length > 0) {
      loadRecording(recordings[0]);
    }
  }, [loadRecording]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
    setCurrentRecording(null);
    stopAnalyser();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  const value = {
    currentRecording,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoading,
  audioLevel,
    queue,
    currentIndex,
    loadRecording,
    play,
    pause,
    seekTo,
    setVolume,
    skipToPrevious,
    skipToNext,
    addToQueue,
    removeFromQueue,
    setQueue: setQueueWithRecordings,
    clearQueue,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};