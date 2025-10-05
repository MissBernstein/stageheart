// Updated TypeScript types for the new schema
// Replace relevant parts in src/integrations/supabase/types.ts

export interface SongRow {
  artist: string;
  created_at: string;
  id: string;
  slug: string;
  title: string; // Legacy - will be deprecated
  song_title: string; // New canonical field
  public_id: string; // Immutable UUID for stable references
  parent_song_id: string | null; // For covers/versions
  version_label: string | null; // e.g., "Live 2009", "Acoustic"
  is_cover: boolean; // Temporary - prefer parent_song_id IS NOT NULL
}

export interface SongInsert {
  artist: string;
  song_title: string; // Required - use this instead of title
  created_at?: string;
  id?: string;
  slug?: string; // Auto-generated from artist + song_title
  title?: string; // Legacy compatibility
  public_id?: string; // Auto-generated UUID
  parent_song_id?: string | null;
  version_label?: string | null;
  is_cover?: boolean;
}

export interface SongUpdate {
  artist?: string;
  song_title?: string;
  created_at?: string;
  id?: string;
  slug?: string;
  title?: string; // Legacy
  public_id?: string;
  parent_song_id?: string | null;
  version_label?: string | null;
  is_cover?: boolean;
}

// Updated application types
export interface Song {
  id: string;
  title: string; // Display name - mapped from song_title
  artist: string;
  slug: string; // URL-safe identifier
  public_id: string; // Stable identifier for favorites/i18n
  summary: string;
  theme: string;
  core_feelings: string[];
  access_ideas: string[];
  visual: string;
  created_at?: string;
  
  // New fields for covers/versions
  parent_song_id?: string | null;
  version_label?: string | null;
  is_cover?: boolean;
}

// Helper functions for the transition period
export const mapDatabaseSongToApp = (dbSong: any): Song => ({
  id: dbSong.id,
  title: dbSong.song_title || dbSong.title, // Prefer song_title
  artist: dbSong.artist,
  slug: dbSong.slug,
  public_id: dbSong.public_id,
  summary: dbSong.feeling_cards?.summary || '',
  theme: dbSong.feeling_cards?.theme || '',
  core_feelings: dbSong.feeling_cards?.core_feelings || [],
  access_ideas: dbSong.feeling_cards?.access_ideas || [],
  visual: dbSong.feeling_cards?.visual || '🎵',
  created_at: dbSong.created_at,
  parent_song_id: dbSong.parent_song_id,
  version_label: dbSong.version_label,
  is_cover: dbSong.is_cover,
});

// Migration helper: convert legacy app song to new insert format
export const prepareNewSongInsert = (songData: { 
  title: string; 
  artist: string; 
  version_label?: string;
  parent_song_id?: string;
}): SongInsert => ({
  song_title: songData.title,
  artist: songData.artist,
  version_label: songData.version_label || null,
  parent_song_id: songData.parent_song_id || null,
  // slug will be auto-generated from artist + song_title
  // public_id will be auto-generated
});

// Updated query patterns for your hooks
export const UPDATED_SONGS_QUERY = `
  id,
  slug,
  song_title,
  artist,
  public_id,
  parent_song_id,
  version_label,
  is_cover,
  created_at,
  feeling_cards (
    summary,
    theme,
    core_feelings,
    access_ideas,
    visual,
    created_at
  )
`;

// Search query with trigram support
export const searchSongsWithTrigram = (supabase: any, searchTerm: string) =>
  supabase
    .from('songs')
    .select(UPDATED_SONGS_QUERY)
    .textSearch('artist_song_title_search', searchTerm, { type: 'websearch' })
    .limit(50);

// Upsert pattern for bulk imports (uses composite uniqueness)
export const upsertSongsPattern = (songs: Array<{
  artist: string;
  song_title: string;
  version_label?: string | null;
}>) => {
  // For each song, the database will enforce uniqueness on:
  // (lower(artist), lower(song_title), COALESCE(version_label, ''))
  return songs.map(song => prepareNewSongInsert({
    title: song.song_title,
    artist: song.artist,
    version_label: song.version_label || undefined,
  }));
};