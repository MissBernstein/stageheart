import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Song } from '@/types';

// Relaxed row typing to tolerate variation in Supabase nested select return shape (object or array)
type RowAny = Record<string, any> & { id: string; title: string; artist: string; created_at: string };

export function useAllSongs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = sessionStorage.getItem('all-songs-v1');
    if (cached) {
      try { setSongs(JSON.parse(cached) as Song[]); } catch {}
    }
    const fetchAll = async () => {
      setLoading(true); setError(null);
      try {
        const { data, error } = await supabase
          .from('songs')
          .select('id,slug,title,artist,created_at,feeling_cards ( summary, theme, core_feelings, access_ideas, visual, created_at )')
          .limit(2000);
        if (error) throw error;
        const mapped: Song[] = (data as RowAny[]).map(r => {
          const fcRaw = (r as any).feeling_cards;
          const fc = Array.isArray(fcRaw) ? fcRaw[0] : fcRaw;
          return {
            id: r.id,
            slug: (r as any).slug || undefined,
            title: r.title,
            artist: r.artist,
            summary: fc?.summary || '',
            theme: fc?.theme || 'Unknown',
            core_feelings: Array.isArray(fc?.core_feelings) ? fc.core_feelings : [],
            access_ideas: Array.isArray(fc?.access_ideas) ? fc.access_ideas : [],
            visual: (typeof fc?.visual === 'string' && fc.visual) ? fc.visual : '🎵',
            theme_detail: undefined,
            created_at: fc?.created_at || r.created_at,
            isRemote: true,
          } as Song;
        });
        if (!cancelled) {
          setSongs(mapped);
          try { sessionStorage.setItem('all-songs-v1', JSON.stringify(mapped)); } catch {}
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load songs');
      } finally { if (!cancelled) setLoading(false); }
    };
    fetchAll();
    const interval = setInterval(fetchAll, 1000 * 60 * 10);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { songs, loading, error };
}
