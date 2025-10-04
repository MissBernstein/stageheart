import { Song } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export type SetlistSource = 'library' | 'favorites' | 'open';

export interface SetlistRequest {
  count: number;
  source: SetlistSource;
  seedSongId?: string | null;
}

export interface SetlistItem {
  id?: string;
  title: string;
  artist?: string;
  moodTag?: string;
  external?: boolean;
  reason?: string;
}

export interface SetlistResponse {
  overallArc: string;
  transitionTips: string[];
  setlist: Array<{ position: number; song: string; purpose: string }>;
  items: SetlistItem[];
  note?: string;
}

const SETLIST_PREF_KEY = 'setlist-source-preference';

export const getStoredSetlistSource = (): SetlistSource => {
  if (typeof window === 'undefined') return 'library';
  const stored = localStorage.getItem(SETLIST_PREF_KEY);
  if (stored === 'favorites' || stored === 'open' || stored === 'library') {
    return stored;
  }
  return 'library';
};

export const storeSetlistSource = (source: SetlistSource) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETLIST_PREF_KEY, source);
};

const normalizeSong = (song: Song): SetlistItem => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  moodTag: song.theme,
});

const fetchLibrarySongs = async (): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('songs')
    .select('id,title,artist,feeling_cards ( summary, theme, core_feelings, access_ideas, visual )')
    .limit(1000);
  if (error) throw error;
  return (data as any[]).map(r => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    summary: r.feeling_cards?.summary || '',
    theme: r.feeling_cards?.theme || 'Unknown',
    core_feelings: r.feeling_cards?.core_feelings || [],
    access_ideas: r.feeling_cards?.access_ideas || [],
    visual: r.feeling_cards?.visual || '🎵',
  } as Song));
};

const pickLibrarySongs = async (count: number): Promise<SetlistItem[]> => {
  const library = await fetchLibrarySongs();
  return library.slice(0, count).map(normalizeSong);
};

const fetchFavoriteSongs = async (): Promise<Song[]> => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('song-feelings-favorites');
    if (!stored) return [];
    return JSON.parse(stored) as Song[];
  } catch (error) {
    console.error('Error loading favorites:', error);
    return [];
  }
};

const createExternalSuggestion = (title: string, artist: string, reason: string): SetlistItem => ({
  title,
  artist,
  external: true,
  reason,
});

const buildFavoritesSetlist = async (count: number): Promise<{ items: SetlistItem[]; note?: string }> => {
  const favorites = await fetchFavoriteSongs();
  const trimmed = favorites.slice(0, count).map(normalizeSong);

  if (trimmed.length < count) {
    return {
      items: trimmed,
      note: `Only ${trimmed.length} favorites available; generated a shorter setlist.`,
    };
  }

  return { items: trimmed };
};

const buildOpenSetlist = async (count: number): Promise<SetlistItem[]> => {
  const library = await fetchLibrarySongs();
  const librarySlice = library.slice(0, Math.min(count, library.length)).map(normalizeSong);
  if (librarySlice.length >= count) return librarySlice;

  const extrasNeeded = count - librarySlice.length;
  const externalSuggestions = Array.from({ length: extrasNeeded }, (_, index) =>
    createExternalSuggestion(
      `Inspirational Piece ${index + 1}`,
      'Suggested Artist',
      'Curated to diversify the emotional arc with an outside perspective.'
    )
  );

  return librarySlice.concat(externalSuggestions);
};

export const buildSetlist = async (request: SetlistRequest): Promise<SetlistResponse> => {
  const { count, source } = request;
  const clampedCount = Math.max(3, Math.min(10, count));
  let items: SetlistItem[] = [];
  let note: string | undefined;

  if (source === 'favorites') {
    const favoritesResult = await buildFavoritesSetlist(clampedCount);
    items = favoritesResult.items;
    note = favoritesResult.note;
  } else if (source === 'open') {
    items = await buildOpenSetlist(clampedCount);
  } else {
    items = await pickLibrarySongs(clampedCount);
  }

  const arcSummary = 'A dynamic emotional arc moving from connection to uplift.';
  const tips = [
    'Plan breath moments between songs to maintain vocal stamina.',
    'Use short transitions to highlight emotional contrasts where needed.',
  ];

  return {
    overallArc: arcSummary,
    transitionTips: tips,
    setlist: items.map((item, index) => ({
      position: index + 1,
      song: item.title,
      purpose: item.reason || 'Maintains narrative flow',
    })),
    items,
    note,
  };
};
