-- Remove unused public_recordings view that creates unnecessary security exposure
-- 
-- SECURITY RATIONALE:
-- The public_recordings view was created but never used by the application.
-- While it filtered sensitive fields (user_id, file URLs), it still exposed:
-- - Recording metadata (titles, durations, file sizes)
-- - Play counts and report counts
-- - Moderation status
-- - Mood tags and voice types
--
-- This metadata could enable:
-- - Data scraping for competitive intelligence
-- - Pattern analysis to identify moderation gaps
-- - Reconnaissance before launching attacks
--
-- The application already has proper security through voicesApi.ts which:
-- - Uses the recordings table directly with RLS policies
-- - Manually sanitizes and filters data
-- - Applies proper visibility rules
--
-- Removing this unused view follows security best practices:
-- - Reduces attack surface area
-- - Eliminates dead code
-- - Follows principle of least privilege

-- Drop the view (this also revokes all grants automatically)
DROP VIEW IF EXISTS public.public_recordings;

-- Verify the view is gone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'public_recordings'
  ) THEN
    RAISE EXCEPTION 'Failed to drop public_recordings view';
  END IF;
  
  RAISE NOTICE 'Successfully removed public_recordings view';
END $$;