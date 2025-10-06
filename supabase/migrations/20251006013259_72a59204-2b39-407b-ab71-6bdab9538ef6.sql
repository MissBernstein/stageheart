-- Add new columns to songs table for enhanced schema
ALTER TABLE songs ADD COLUMN IF NOT EXISTS song_title TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();
ALTER TABLE songs ADD COLUMN IF NOT EXISTS parent_song_id UUID;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS version_label TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;

-- Backfill song_title from title column
UPDATE songs 
SET song_title = COALESCE(song_title, title)
WHERE song_title IS NULL;

-- Ensure all songs have the required fields
UPDATE songs 
SET artist = COALESCE(artist, 'Unknown Artist')
WHERE artist IS NULL OR artist = '';

-- Create unique indexes for data integrity
CREATE UNIQUE INDEX IF NOT EXISTS songs_artist_title_ver_idx
ON songs (lower(artist), lower(song_title), COALESCE(version_label, ''));

CREATE UNIQUE INDEX IF NOT EXISTS songs_slug_key ON songs(slug);
CREATE UNIQUE INDEX IF NOT EXISTS songs_public_id_key ON songs(public_id);

-- Ensure feeling_cards foreign key has CASCADE delete
ALTER TABLE feeling_cards
  DROP CONSTRAINT IF EXISTS feeling_cards_song_id_fkey,
  ADD CONSTRAINT feeling_cards_song_id_fkey
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE;