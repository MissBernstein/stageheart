import { useEffect, useState } from 'react';
import type { Song } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface RawRow {
  song_id: string;
  summary: string;
  theme: string;
  visual: string | null;
  core_feelings: string[];
  access_ideas: string[];
  songs: { id: string; title: string; artist: string; slug?: string } | null;
}

export function useRemoteSongs() {
  const [remoteSongs, setRemoteSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cached = sessionStorage.getItem('remote-songs-v1');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Song[];
        setRemoteSongs(parsed);
      } catch {}
    }

    const fetchSongs = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('feeling_cards')
          .select('song_id, summary, theme, visual, core_feelings, access_ideas, songs ( id, title, artist, slug )')
          .limit(500);

        if (error) throw error;
        if (!data) return;

        const mapped: Song[] = (data as RawRow[])
          .filter(r => r.songs)
          .map(r => ({
            id: r.songs!.id,
            title: r.songs!.title,
            artist: r.songs!.artist,
            summary: r.summary,
            theme: r.theme,
            core_feelings: r.core_feelings || [],
            access_ideas: r.access_ideas || [],
            visual: r.visual || '🎵',
            theme_detail: undefined,
          }));

        // Deduplicate by id (server could theoretically send dupes)
        const unique = Array.from(new Map(mapped.map(m => [m.id, m])).values());
        if (!cancelled) {
          setRemoteSongs(unique);
          try { sessionStorage.setItem('remote-songs-v1', JSON.stringify(unique)); } catch {}
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load remote songs');
        console.error('Remote songs fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSongs();
    const interval = setInterval(fetchSongs, 1000 * 60 * 5); // refresh every 5 min
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return { remoteSongs, loading, error };
}
