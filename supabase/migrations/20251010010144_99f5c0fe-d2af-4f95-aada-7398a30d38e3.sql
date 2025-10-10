-- Secure storage-level access controls for recordings bucket
-- Create helper function in public schema (cannot modify storage schema)

-- Helper function to get recording metadata from file path
-- This is CRITICAL for security - it maps storage paths to recording states
CREATE OR REPLACE FUNCTION public.get_recording_by_file_path(file_path text)
RETURNS TABLE (
  recording_id uuid,
  owner_id uuid,
  recording_state text,
  moderation_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Match against all three possible file URL columns
  SELECT 
    r.id as recording_id,
    r.user_id as owner_id,
    r.state::text as recording_state,
    r.moderation_status::text as moderation_status
  FROM public.recordings r
  WHERE r.file_original_url = file_path
     OR r.file_stream_url = file_path
     OR r.waveform_json_url = file_path
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_recording_by_file_path IS
'Maps storage file paths to recording metadata for access control. Returns recording state and ownership information.';

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view public recording files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own recordings" ON storage.objects;

-- Policy 1: Users can view their own recordings (any state)
CREATE POLICY "Owners can access own recording files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 
    FROM public.get_recording_by_file_path(name) rec
    WHERE rec.owner_id = auth.uid()
  )
);

-- Policy 2: Users can view public clean recordings
CREATE POLICY "Public clean recordings accessible"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 
    FROM public.get_recording_by_file_path(name) rec
    WHERE rec.recording_state = 'public'
      AND rec.moderation_status = 'clean'
  )
);

-- Policy 3: Users can upload to their own folder
CREATE POLICY "Users can upload own recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recordings'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can update their own files
CREATE POLICY "Users can update own recording files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 
    FROM public.get_recording_by_file_path(name) rec
    WHERE rec.owner_id = auth.uid()
  )
);

-- Policy 5: Users can delete their own files
CREATE POLICY "Users can delete own recording files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'recordings'
  AND EXISTS (
    SELECT 1 
    FROM public.get_recording_by_file_path(name) rec
    WHERE rec.owner_id = auth.uid()
  )
);

-- Ensure bucket is private (no anonymous access)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'recordings';

-- Log security configuration
DO $$
BEGIN
  RAISE NOTICE 'Storage security configuration updated for recordings bucket:';
  RAISE NOTICE '  - Bucket public: FALSE (requires authentication)';
  RAISE NOTICE '  - Private recordings: Only accessible by owner';
  RAISE NOTICE '  - Public recordings: Accessible by authenticated users';
  RAISE NOTICE '  - Anonymous access: BLOCKED';
END $$;