-- Create enum for submission status
DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM ('QUEUED','PROCESSING','REVIEW','PUBLISHED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Songs table
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feeling cards table
CREATE TABLE IF NOT EXISTS public.feeling_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  theme TEXT NOT NULL,
  core_feelings TEXT[] NOT NULL,
  access_ideas TEXT[] NOT NULL,
  visual TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  slug TEXT NOT NULL,
  status submission_status NOT NULL DEFAULT 'QUEUED',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_slug ON public.submissions(slug);

-- RLS Policies
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeling_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Songs are publicly readable
CREATE POLICY "Songs are viewable by everyone" ON public.songs FOR SELECT USING (true);

-- Feeling cards are publicly readable
CREATE POLICY "Feeling cards are viewable by everyone" ON public.feeling_cards FOR SELECT USING (true);

-- Anyone can submit songs
CREATE POLICY "Anyone can submit songs" ON public.submissions FOR INSERT WITH CHECK (true);

-- Anyone can view their own submissions
CREATE POLICY "Users can view submissions" ON public.submissions FOR SELECT USING (true);