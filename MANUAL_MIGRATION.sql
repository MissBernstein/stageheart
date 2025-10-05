-- =====================================================
-- MANUAL MIGRATION: Run these commands one by one in Supabase SQL Editor
-- (Safe to run multiple times - uses IF NOT EXISTS and COALESCE)
-- =====================================================

-- Step 1: Add new columns safely
-- =====================================================
ALTER TABLE songs ADD COLUMN IF NOT EXISTS song_title TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();
ALTER TABLE songs ADD COLUMN IF NOT EXISTS parent_song_id UUID;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS version_label TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;

-- Step 2: Backfill data
-- =====================================================
UPDATE songs 
SET song_title = COALESCE(song_title, title)
WHERE song_title IS NULL;

UPDATE songs 
SET song_title = COALESCE(song_title, title),
    artist = COALESCE(artist, 'Unknown Artist')
WHERE song_title IS NULL OR artist IS NULL;

-- Step 3: Create slug generation function
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_song_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := regexp_replace(
      lower(NEW.artist || '-' || NEW.song_title), 
      '[^a-z0-9]+', '-', 'g'
    );
  END IF;
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql;

-- Step 4: Update existing slugs (run carefully!)
-- =====================================================
UPDATE songs 
SET slug = regexp_replace(lower(artist || '-' || song_title), '[^a-z0-9]+', '-', 'g')
WHERE slug NOT LIKE '%-%' OR slug IS NULL;

-- Step 5: Add constraints and indexes
-- =====================================================
ALTER TABLE songs 
  ALTER COLUMN artist SET NOT NULL,
  ALTER COLUMN song_title SET NOT NULL;

-- Case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS songs_artist_title_ver_idx
ON songs (lower(artist), lower(song_title), COALESCE(version_label, ''));

-- Other indexes
CREATE UNIQUE INDEX IF NOT EXISTS songs_slug_key ON songs(slug);
CREATE UNIQUE INDEX IF NOT EXISTS songs_public_id_key ON songs(public_id);

-- Step 6: Update foreign key with CASCADE
-- =====================================================
ALTER TABLE feeling_cards
  DROP CONSTRAINT IF EXISTS feeling_cards_song_id_fkey,
  ADD CONSTRAINT feeling_cards_song_id_fkey
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE;