import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'stageheart_user_settings_v1';
const DEFAULT_SEED = 'seed-default';

interface UserSettings {
  voiceAvatarSeed?: string;
  displayName?: string;
  [key: string]: any;
}

export function useVoiceAvatar() {
  const [voiceAvatarSeed, setVoiceAvatarSeed] = useState<string>(DEFAULT_SEED);

  const loadFromStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed: UserSettings = JSON.parse(raw);
        setVoiceAvatarSeed(parsed.voiceAvatarSeed || DEFAULT_SEED);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    // Initial load
    loadFromStorage();

    // Listen for localStorage changes (from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        loadFromStorage();
      }
    };

    // Listen for custom events (from same tab)
    const handleSettingsUpdate = () => {
      loadFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('voiceAvatarUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('voiceAvatarUpdated', handleSettingsUpdate);
    };
  }, [loadFromStorage]);

  return voiceAvatarSeed;
}