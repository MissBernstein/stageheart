-- =====================================================
-- Songs Schema Migration: Option A with Enhanced Tweaks
-- This migration implements the recommendations from the planning document
-- with additional safety and performance improvements.
-- =====================================================

-- Step 1: Add new columns safely (non-destructive)
-- =====================================================

-- Add song_title column (will replace title eventually)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS song_title TEXT;

-- Add immutable public_id for stable references
ALTER TABLE songs ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();

-- Add parent_song_id for covers/versions (prefer over is_cover)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS parent_song_id UUID REFERENCES songs(id);

-- Add version_label for covers/arrangements
ALTER TABLE songs ADD COLUMN IF NOT EXISTS version_label TEXT;

-- Add is_cover for backward compatibility (can be removed later)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;

-- Step 2: Backfill song_title from legacy title patterns
-- =====================================================

-- Simple case: if title already equals desired song_title, just copy
UPDATE songs 
SET song_title = COALESCE(song_title, title)
WHERE song_title IS NULL;

-- Parse legacy compound patterns if needed
-- Example: if legacy combined id looked like 'Artist - Title', parse it
-- (Adjust regex pattern based on your actual legacy data patterns)
UPDATE songs 
SET artist = COALESCE(artist, split_part(title, ' - ', 1)),
    song_title = COALESCE(song_title, split_part(title, ' - ', 2))
WHERE artist IS NULL AND title LIKE '% - %';

-- Fallback: ensure no empty values
UPDATE songs 
SET song_title = COALESCE(song_title, title),
    artist = COALESCE(artist, 'Unknown Artist')
WHERE song_title IS NULL OR artist IS NULL;

-- Step 3: Enhanced slug generation (artist + title based)
-- =====================================================

-- Create improved slug generation function
CREATE OR REPLACE FUNCTION public.set_song_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Generate slug from artist + song_title for better uniqueness
    NEW.slug := regexp_replace(
      lower(NEW.artist || '-' || NEW.song_title), 
      '[^a-z0-9]+', '-', 'g'
    );
  END IF;
  RETURN NEW;
END; 
$$ LANGUAGE plpgsql;

-- Update existing slugs to use artist+title pattern
UPDATE songs 
SET slug = regexp_replace(lower(artist || '-' || song_title), '[^a-z0-9]+', '-', 'g')
WHERE slug IS NULL;

-- Handle potential duplicates with hash suffix
-- Create extension for digest function if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add uniqueness helper for slug collisions
WITH dups AS (
  SELECT slug, id,
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM songs
)
UPDATE songs s
SET slug = s.slug || '-' || substr(encode(digest(s.id::text, 'sha1'), 'hex'), 1, 6)
FROM dups d
WHERE s.id = d.id AND d.rn > 1;

-- Step 4: Add constraints and indexes
-- =====================================================

-- Make critical fields NOT NULL
ALTER TABLE songs 
  ALTER COLUMN artist SET NOT NULL,
  ALTER COLUMN song_title SET NOT NULL;

-- Add data validation constraints
ALTER TABLE songs
  ADD CONSTRAINT IF NOT EXISTS songs_artist_nonempty CHECK (btrim(artist) <> ''),
  ADD CONSTRAINT IF NOT EXISTS songs_title_nonempty CHECK (btrim(song_title) <> '');

-- Case-insensitive composite uniqueness (prevents "Adele - Hello" vs "adele - hello")
CREATE UNIQUE INDEX IF NOT EXISTS songs_artist_title_ver_idx
ON songs (lower(artist), lower(song_title), COALESCE(version_label, ''));

-- Unique slug constraint (keep as fallback identifier)
CREATE UNIQUE INDEX IF NOT EXISTS songs_slug_key ON songs(slug);

-- Unique public_id for stable references
CREATE UNIQUE INDEX IF NOT EXISTS songs_public_id_key ON songs(public_id);

-- Performance index for search (artist + title combined)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS songs_search_trgm
  ON songs USING GIN ((artist || ' ' || song_title) gin_trgm_ops);

-- Performance index for basic lookups
CREATE INDEX IF NOT EXISTS songs_artist_title_idx
  ON songs (lower(artist), lower(song_title));

-- Step 5: Update feeling_cards relationship with CASCADE
-- =====================================================

-- Drop existing foreign key and add with CASCADE
ALTER TABLE feeling_cards
  DROP CONSTRAINT IF EXISTS feeling_cards_song_id_fkey,
  ADD CONSTRAINT feeling_cards_song_id_fkey
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE;

-- Ensure 1:1 mapping constraint for feeling_cards
ALTER TABLE feeling_cards
  ADD CONSTRAINT IF NOT EXISTS feeling_cards_song_id_key UNIQUE (song_id);

-- Step 6: Create triggers for automatic slug generation
-- =====================================================

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS songs_slug_trg ON songs;

-- Create trigger for new inserts
CREATE TRIGGER songs_slug_trg 
  BEFORE INSERT ON songs
  FOR EACH ROW 
  EXECUTE FUNCTION set_song_slug();

-- Step 7: Optional CITEXT for case-insensitive operations
-- =====================================================
-- Uncomment if you prefer CITEXT over functional indexes
-- CREATE EXTENSION IF NOT EXISTS citext;
-- ALTER TABLE songs
--   ALTER COLUMN artist TYPE citext USING artist::citext,
--   ALTER COLUMN song_title TYPE citext USING song_title::citext;

-- Step 8: RLS policies for public access
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeling_cards ENABLE ROW LEVEL SECURITY;

-- Simple read policy for public song browsing
CREATE POLICY IF NOT EXISTS "Songs are publicly readable" 
  ON songs FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY IF NOT EXISTS "Feeling cards are publicly readable" 
  ON feeling_cards FOR SELECT 
  TO public 
  USING (true);

-- Step 9: Data validation queries
-- =====================================================

-- Check for any remaining NULL values (should be 0)
-- SELECT COUNT(*) FROM songs WHERE song_title IS NULL OR artist IS NULL;

-- Check for duplicate slugs (should be 0)
-- SELECT slug, COUNT(*) FROM songs GROUP BY slug HAVING COUNT(*) > 1;

-- Check feeling_cards 1:1 mapping (should be 0)
-- SELECT song_id, COUNT(*) FROM feeling_cards GROUP BY 1 HAVING COUNT(*) > 1;

-- =====================================================
-- Migration Complete!
-- 
-- What this gives you:
-- 1. ✅ Case-insensitive uniqueness on (artist, song_title, version_label)
-- 2. ✅ Artist+title-based slugs (no more collisions across artists)
-- 3. ✅ Immutable public_id for stable cross-references
-- 4. ✅ Parent-child relationships for covers/versions
-- 5. ✅ CASCADE deletes between songs and feeling_cards
-- 6. ✅ Performance indexes for search and lookups
-- 7. ✅ Data validation constraints
-- 8. ✅ Public read access via RLS
-- 9. ✅ Automatic slug generation for new songs
-- 
-- Next steps for your app:
-- - Update queries to use song_title instead of title
-- - Use public_id for favorites/i18n keys (more stable than slug)
-- - Send {artist, song_title} for new song creation
-- - Use composite uniqueness for bulk imports
-- =====================================================