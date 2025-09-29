-- Update saved_warmups table to support vibe-based warm-ups
ALTER TABLE public.saved_warmups 
ALTER COLUMN song_title DROP NOT NULL,
ADD COLUMN vibe TEXT;

-- Add a check to ensure either song_title or vibe is provided
ALTER TABLE public.saved_warmups 
ADD CONSTRAINT song_or_vibe_required 
CHECK (song_title IS NOT NULL OR vibe IS NOT NULL);