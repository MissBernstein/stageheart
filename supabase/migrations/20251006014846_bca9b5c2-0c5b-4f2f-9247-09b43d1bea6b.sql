-- =====================================================
-- STAGEHEART: PROFILES & VOICES FEATURE
-- =====================================================

-- Create enums
CREATE TYPE public.profile_field_visibility AS ENUM ('public', 'after_meet', 'private');
CREATE TYPE public.recording_state AS ENUM ('private', 'unlisted', 'public');
CREATE TYPE public.recording_format AS ENUM ('wav', 'm4a', 'mp3', 'opus');
CREATE TYPE public.moderation_status AS ENUM ('clean', 'pending', 'flagged', 'blocked');
CREATE TYPE public.comment_state AS ENUM ('pending', 'published', 'rejected');
CREATE TYPE public.user_status AS ENUM ('active', 'suspended');
CREATE TYPE public.link_type AS ENUM ('website', 'instagram', 'tiktok', 'email', 'other');

-- =====================================================
-- PROFILES TABLE (Enhanced)
-- =====================================================
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  about TEXT,
  fav_genres TEXT[],
  favorite_artists TEXT[],
  groups TEXT[],
  links JSONB DEFAULT '[]'::jsonb, -- Array of {type, url, visibility}
  contact_visibility profile_field_visibility DEFAULT 'private',
  dm_enabled BOOLEAN DEFAULT false,
  comments_enabled BOOLEAN DEFAULT false,
  profile_note_to_listeners TEXT,
  status user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RECORDINGS TABLE
-- =====================================================
CREATE TABLE public.recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_original_url TEXT,
  file_stream_url TEXT,
  filesize_bytes INTEGER CHECK (filesize_bytes <= 52428800), -- 50 MB max
  duration_sec INTEGER,
  format_original recording_format,
  format_stream recording_format,
  loudness_lufs FLOAT,
  waveform_json_url TEXT,
  mood_tags TEXT[],
  voice_type TEXT,
  language TEXT,
  is_signature BOOLEAN DEFAULT false,
  state recording_state DEFAULT 'private',
  comments_enabled BOOLEAN DEFAULT false,
  plays_count INTEGER DEFAULT 0,
  reports_count INTEGER DEFAULT 0,
  moderation_status moderation_status DEFAULT 'clean',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one signature recording per user
CREATE UNIQUE INDEX recordings_signature_unique_idx ON public.recordings (user_id) 
WHERE is_signature = true;

-- Index for discovery queries
CREATE INDEX recordings_public_idx ON public.recordings (state, moderation_status, created_at) 
WHERE state = 'public' AND moderation_status = 'clean';

-- =====================================================
-- RECORDING MEETS (Track who has "met the voice")
-- =====================================================
CREATE TABLE public.recording_meets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  listener_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  met_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recording_id, listener_user_id)
);

CREATE INDEX recording_meets_listener_idx ON public.recording_meets (listener_user_id);

-- =====================================================
-- COMMENTS TABLE
-- =====================================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  state comment_state DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX comments_recording_idx ON public.comments (recording_id, state);

-- =====================================================
-- MESSAGES TABLE (DM system)
-- =====================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX messages_to_user_idx ON public.messages (to_user_id, created_at);
CREATE INDEX messages_from_user_idx ON public.messages (from_user_id, created_at);

-- =====================================================
-- RECORDING REPORTS TABLE
-- =====================================================
CREATE TABLE public.recording_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX recording_reports_recording_idx ON public.recording_reports (recording_id);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recording_meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recording_reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: USER_PROFILES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.user_profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Public can view active profiles (field visibility handled in app layer)
CREATE POLICY "Public can view active profiles"
ON public.user_profiles FOR SELECT
USING (status = 'active');

-- =====================================================
-- RLS POLICIES: RECORDINGS
-- =====================================================

-- Users can view their own recordings
CREATE POLICY "Users can view own recordings"
ON public.recordings FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own recordings
CREATE POLICY "Users can insert own recordings"
ON public.recordings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own recordings
CREATE POLICY "Users can update own recordings"
ON public.recordings FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own recordings
CREATE POLICY "Users can delete own recordings"
ON public.recordings FOR DELETE
USING (auth.uid() = user_id);

-- Public can view public, clean recordings
CREATE POLICY "Public can view public recordings"
ON public.recordings FOR SELECT
USING (state = 'public' AND moderation_status = 'clean');

-- =====================================================
-- RLS POLICIES: RECORDING_MEETS
-- =====================================================

-- Users can view their own meets
CREATE POLICY "Users can view own meets"
ON public.recording_meets FOR SELECT
USING (auth.uid() = listener_user_id);

-- Users can insert their own meets
CREATE POLICY "Users can insert own meets"
ON public.recording_meets FOR INSERT
WITH CHECK (auth.uid() = listener_user_id);

-- Recording owners can view who met their voice
CREATE POLICY "Owners can view meets"
ON public.recording_meets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recordings
    WHERE recordings.id = recording_meets.recording_id
    AND recordings.user_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: COMMENTS
-- =====================================================

-- Users can view their own comments
CREATE POLICY "Users can view own comments"
ON public.comments FOR SELECT
USING (auth.uid() = author_user_id);

-- Users can insert comments on recordings with comments enabled
CREATE POLICY "Users can create comments"
ON public.comments FOR INSERT
WITH CHECK (
  auth.uid() = author_user_id AND
  EXISTS (
    SELECT 1 FROM public.recordings
    WHERE recordings.id = comments.recording_id
    AND recordings.comments_enabled = true
    AND recordings.state = 'public'
  )
);

-- Recording owners can view all comments on their recordings
CREATE POLICY "Owners can view comments on own recordings"
ON public.comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recordings
    WHERE recordings.id = comments.recording_id
    AND recordings.user_id = auth.uid()
  )
);

-- Recording owners can update comment state
CREATE POLICY "Owners can moderate comments"
ON public.comments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.recordings
    WHERE recordings.id = comments.recording_id
    AND recordings.user_id = auth.uid()
  )
);

-- Public can view published comments
CREATE POLICY "Public can view published comments"
ON public.comments FOR SELECT
USING (state = 'published');

-- =====================================================
-- RLS POLICIES: MESSAGES
-- =====================================================

-- Users can view messages sent to them
CREATE POLICY "Users can view received messages"
ON public.messages FOR SELECT
USING (auth.uid() = to_user_id);

-- Users can view messages they sent
CREATE POLICY "Users can view sent messages"
ON public.messages FOR SELECT
USING (auth.uid() = from_user_id);

-- Users can send messages to users with DM enabled
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id AND
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = messages.to_user_id
    AND user_profiles.dm_enabled = true
  )
);

-- Users can mark their own messages as read
CREATE POLICY "Users can update received messages"
ON public.messages FOR UPDATE
USING (auth.uid() = to_user_id);

-- =====================================================
-- RLS POLICIES: RECORDING_REPORTS
-- =====================================================

-- Anyone can report recordings
CREATE POLICY "Anyone can report recordings"
ON public.recording_reports FOR INSERT
WITH CHECK (true);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.recording_reports FOR SELECT
USING (auth.uid() = reporter_user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER recordings_updated_at
  BEFORE UPDATE ON public.recordings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enforce max 3 public recordings per user
CREATE OR REPLACE FUNCTION public.check_max_public_recordings()
RETURNS TRIGGER AS $$
DECLARE
  public_count INTEGER;
BEGIN
  IF NEW.state = 'public' THEN
    SELECT COUNT(*) INTO public_count
    FROM public.recordings
    WHERE user_id = NEW.user_id 
    AND state = 'public' 
    AND id != NEW.id;
    
    IF public_count >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 public recordings allowed per user';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_public_recordings
  BEFORE INSERT OR UPDATE ON public.recordings
  FOR EACH ROW EXECUTE FUNCTION public.check_max_public_recordings();

-- Increment plays count
CREATE OR REPLACE FUNCTION public.increment_recording_plays(recording_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.recordings
  SET plays_count = plays_count + 1
  WHERE id = recording_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recordings bucket
CREATE POLICY "Users can upload own recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Anyone can view recordings for public recording entries
CREATE POLICY "Public can view public recording files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recordings' AND
  EXISTS (
    SELECT 1 FROM public.recordings
    WHERE recordings.file_original_url LIKE '%' || storage.objects.name
    AND recordings.state = 'public'
    AND recordings.moderation_status = 'clean'
  )
);