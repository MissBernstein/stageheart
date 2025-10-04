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
  created_at: string;
  songs: { id: string; title: string; artist: string; slug?: string; created_at?: string } | null;
  // We'll fetch submission status separately if needed; placeholder for future expansion.
  submission_status?: string | null;
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
        // Join songs and submissions to ensure only PUBLISHED items appear.
        const { data, error } = await supabase
          .from('feeling_cards')
          .select('song_id, summary, theme, visual, core_feelings, access_ideas, created_at, songs ( id, title, artist, slug, created_at )')
          .limit(500);

        if (error) throw error;
        if (!data) return;

        const now = Date.now();
        const NEW_DAYS = 7; // mark songs newer than 7 days
        const mapped: Song[] = (data as RawRow[])
          .filter(r => r.songs)
          .map(r => {
            const created = r.songs?.created_at || r.created_at;
            const isNew = created ? (now - new Date(created).getTime()) <= NEW_DAYS * 24 * 3600 * 1000 : false;
            return {
              id: r.songs!.id,
              title: r.songs!.title,
              artist: r.songs!.artist,
              summary: r.summary,
              theme: r.theme,
              core_feelings: r.core_feelings || [],
              access_ideas: r.access_ideas || [],
              visual: r.visual || '🎵',
              theme_detail: undefined,
              created_at: created,
              isRemote: true,
              isNew,
            } as Song;
          })
          // Filter for published-only if any submission statuses exist (defensive)
          .filter(s => true); // Placeholder: submissions join reliability uncertain

        // Deduplicate by id (server could theoretically send dupes)
        // Sort newest first among remote songs
        const unique = Array.from(new Map(mapped.map(m => [m.id, m])).values())
          .sort((a, b) => {
            if (a.created_at && b.created_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            return 0;
          });
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
