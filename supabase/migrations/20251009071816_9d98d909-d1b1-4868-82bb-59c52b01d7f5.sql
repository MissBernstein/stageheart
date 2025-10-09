-- Create discovered_voices table for multi-device sync
CREATE TABLE IF NOT EXISTS public.discovered_voices (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_user_id uuid NOT NULL,
  first_discovered_at timestamptz NOT NULL DEFAULT now(),
  last_opened_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, voice_user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_discovered_voices_user_last_opened 
  ON public.discovered_voices (user_id, last_opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovered_voices_user_updated 
  ON public.discovered_voices (user_id, updated_at DESC);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_discovered_voices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER discovered_voices_set_updated_at
  BEFORE UPDATE ON public.discovered_voices
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_discovered_voices_updated_at();

-- Enable RLS
ALTER TABLE public.discovered_voices ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own discovered voices
CREATE POLICY "Users can view own discovered voices"
  ON public.discovered_voices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own discovered voices"
  ON public.discovered_voices
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own discovered voices"
  ON public.discovered_voices
  FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.discovered_voices IS 'Tracks which voice profiles users have discovered and when, enabling multi-device sync';
COMMENT ON COLUMN public.discovered_voices.first_discovered_at IS 'Timestamp when user first opened this voice profile';
COMMENT ON COLUMN public.discovered_voices.last_opened_at IS 'Most recent timestamp when user opened this voice profile';