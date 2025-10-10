-- Create a public-safe view of recordings that excludes user_id and file URLs
-- This view is specifically for anonymous/public discovery of voice recordings
CREATE OR REPLACE VIEW public.public_recordings AS
SELECT 
  id,
  title,
  filesize_bytes,
  duration_sec,
  format_original,
  format_stream,
  loudness_lufs,
  mood_tags,
  voice_type,
  language,
  is_signature,
  state,
  comments_enabled,
  plays_count,
  reports_count,
  moderation_status,
  created_at,
  updated_at
  -- Explicitly excludes: user_id, file_original_url, file_stream_url, waveform_json_url
FROM public.recordings
WHERE state = 'public' 
  AND moderation_status = 'clean';

-- Set view to use security invoker (respects caller's permissions)
ALTER VIEW public.public_recordings SET (security_invoker = on);

COMMENT ON VIEW public.public_recordings IS 
'Public-safe view of voice recordings. Excludes user_id and file URLs for privacy/security. Only shows public, clean recordings suitable for discovery.';

-- Grant SELECT on view to authenticated and anonymous users
GRANT SELECT ON public.public_recordings TO authenticated, anon;

-- Update the public SELECT policy on recordings table to be more restrictive
-- Remove the overly permissive "Public can view public recordings" policy
DROP POLICY IF EXISTS "Public can view public recordings" ON public.recordings;

-- Create more restrictive policies:
-- 1. Anonymous/unauthenticated users should use the public_recordings view instead
-- 2. Authenticated users can see public recordings with user_id only if they need it for specific features

-- Policy for authenticated users to view public recordings (with user_id for profile linking)
CREATE POLICY "Authenticated can view public recordings"
ON public.recordings
FOR SELECT
TO authenticated
USING (
  state = 'public' 
  AND moderation_status = 'clean'
);

-- Keep owner policy (unchanged)
-- "Users can view own recordings" - already exists

-- Verify no anonymous access to recordings table directly
-- Anonymous users must use public_recordings view

COMMENT ON POLICY "Authenticated can view public recordings" ON public.recordings IS 
'Allows authenticated users to view public clean recordings. Anonymous users should use public_recordings view instead to avoid user_id exposure.';