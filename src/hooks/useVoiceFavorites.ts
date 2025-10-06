import { useCallback, useEffect, useState } from 'react';

const LS_KEY = 'voice_favorites_v1';

export function useVoiceFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        setFavorites(new Set(parsed));
      }
    } catch {/* ignore */}
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Set<string>) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(Array.from(next))); } catch {/* ignore */}
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      persist(next);
      return next;
    });
  }, [persist]);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  return { favorites, isFavorite, toggleFavorite, hydrated };
}
