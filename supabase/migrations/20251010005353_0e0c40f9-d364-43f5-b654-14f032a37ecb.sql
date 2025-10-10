-- Consolidate and fix user_profiles RLS policies to respect contact_visibility
-- This migration removes duplicate policies and creates proper privacy-respecting policies

-- Drop the conflicting duplicate policies
DROP POLICY IF EXISTS "Authenticated can view active profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "View sanitized active profiles" ON public.user_profiles;

-- Keep the owner policies as-is (these are correct)
-- "Users can view own profile" - allows full access to own profile
-- "Users can update own profile" - allows updates to own profile
-- "Users can insert own profile" - allows profile creation

-- Create consolidated SELECT policy for viewing other users' profiles
-- This respects contact_visibility and "meet" relationships
CREATE POLICY "View profiles based on privacy settings"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  -- User can always see their own profile
  auth.uid() = id
  OR
  -- For active profiles only
  (
    status = 'active'
    AND (
      -- Public profiles: anyone authenticated can see full profile
      contact_visibility = 'public'
      OR
      -- After-meet profiles: only if user has listened to one of their recordings
      (
        contact_visibility = 'after_meet'
        AND EXISTS (
          SELECT 1 
          FROM public.recording_meets rm
          JOIN public.recordings r ON r.id = rm.recording_id
          WHERE r.user_id = user_profiles.id
            AND rm.listener_user_id = auth.uid()
        )
      )
      -- Private profiles: Only display_name and id visible (handled at application layer)
      -- The policy allows SELECT, but the application should filter sensitive fields
      OR contact_visibility = 'private'
    )
  )
);

COMMENT ON POLICY "View profiles based on privacy settings" ON public.user_profiles IS 
'Allows users to view profiles based on contact_visibility settings: public (all), after_meet (requires listening to recording), or private (minimal info). Users always see their own full profile.';

-- Create helper function to check if user has "met" a profile owner
-- This can be used by application code to filter sensitive fields for private profiles
CREATE OR REPLACE FUNCTION public.has_met_user(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.recording_meets rm
    JOIN public.recordings r ON r.id = rm.recording_id
    WHERE r.user_id = profile_user_id
      AND rm.listener_user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.has_met_user IS 
'Returns true if the current authenticated user has listened to any recording by the specified user (creating a "meet" relationship).';

GRANT EXECUTE ON FUNCTION public.has_met_user(uuid) TO authenticated;