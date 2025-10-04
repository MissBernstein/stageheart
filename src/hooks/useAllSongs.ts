import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Song } from '@/types';

interface Row {
  id: string;
  title: string;
  artist: string;
  created_at: string;
  feeling_cards: {
    summary: string;
    theme: string;
    core_feelings: string[];
    access_ideas: string[];
    visual: string | null;
    created_at: string;
  } | null;
}

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
          .select('id,title,artist,created_at,feeling_cards ( summary, theme, core_feelings, access_ideas, visual, created_at )')
          .limit(2000);
        if (error) throw error;
        const mapped: Song[] = (data as Row[]).map(r => ({
          id: r.id,
            title: r.title,
            artist: r.artist,
            summary: r.feeling_cards?.summary || '',
            theme: r.feeling_cards?.theme || 'Unknown',
            core_feelings: r.feeling_cards?.core_feelings || [],
            access_ideas: r.feeling_cards?.access_ideas || [],
            visual: r.feeling_cards?.visual || '🎵',
            theme_detail: undefined,
            created_at: r.feeling_cards?.created_at || r.created_at,
            isRemote: true,
        }));
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
