/**
 * Improved song utilities using the new schema patterns
 */

// Generate artist+title based slug (matches migration pattern)
export const generateSongSlug = (artist: string, title: string): string => {
  return (artist + '-' + title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Check for case-insensitive duplicates
export const checkForDuplicates = (
  newArtist: string, 
  newTitle: string, 
  existingSongs: Array<{ artist: string; title: string; id?: string }>
): { isDuplicate: boolean; existingSong?: any } => {
  const newKey = `${newArtist.toLowerCase().trim()}-${newTitle.toLowerCase().trim()}`;
  
  for (const song of existingSongs) {
    const existingKey = `${song.artist.toLowerCase().trim()}-${song.title.toLowerCase().trim()}`;
    if (newKey === existingKey) {
      return { isDuplicate: true, existingSong: song };
    }
  }
  
  return { isDuplicate: false };
};

// Normalize song data for consistent handling
export const normalizeSongData = (song: any) => ({
  id: song.id,
  title: song.title, // Keep using 'title' as 'song_title'
  artist: song.artist,
  slug: song.slug || generateSongSlug(song.artist || 'unknown', song.title || 'untitled'),
  summary: song.summary || '',
  theme: song.theme || 'Unknown',
  core_feelings: Array.isArray(song.core_feelings) ? song.core_feelings : [],
  access_ideas: Array.isArray(song.access_ideas) ? song.access_ideas : [],
  visual: song.visual || '🎵',
  created_at: song.created_at,
});

// Validate song data before submission
export const validateSongSubmission = (
  artist: string, 
  title: string,
  existingSongs: Array<{ artist: string; title: string }>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!title.trim()) {
    errors.push('Song title is required');
  }
  
  if (!artist.trim()) {
    errors.push('Artist name is required');
  }
  
  if (title.trim().length < 2) {
    errors.push('Song title must be at least 2 characters');
  }
  
  if (artist.trim().length < 2) {
    errors.push('Artist name must be at least 2 characters');
  }
  
  // Check for duplicates
  const duplicateCheck = checkForDuplicates(artist, title, existingSongs);
  if (duplicateCheck.isDuplicate) {
    errors.push(`This song already exists: "${duplicateCheck.existingSong.artist} - ${duplicateCheck.existingSong.title}"`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper to search songs with improved matching
export const searchSongs = (
  songs: Array<{ title: string; artist: string; [key: string]: any }>,
  searchTerm: string
): Array<any> => {
  if (!searchTerm.trim()) return songs;
  
  const term = searchTerm.toLowerCase();
  
  return songs.filter(song => {
    const titleMatch = song.title.toLowerCase().includes(term);
    const artistMatch = song.artist.toLowerCase().includes(term);
    const combinedMatch = `${song.artist} ${song.title}`.toLowerCase().includes(term);
    
    return titleMatch || artistMatch || combinedMatch;
  });
};