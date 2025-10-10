-- Clarify security model for public_profiles_sanitized view
-- This view is secured through security_invoker=on, which makes it respect
-- the RLS policies of the underlying user_profiles table

-- Verify the view has security_invoker enabled (should already be set)
ALTER VIEW public.public_profiles_sanitized SET (security_invoker = on);

-- Grant explicit SELECT permissions to control access
-- Revoke all first to ensure clean state
REVOKE ALL ON public.public_profiles_sanitized FROM PUBLIC;
REVOKE ALL ON public.public_profiles_sanitized FROM anon;
REVOKE ALL ON public.public_profiles_sanitized FROM authenticated;

-- Grant to authenticated users only
-- Anonymous users should use the fetch_public_profiles() function instead
GRANT SELECT ON public.public_profiles_sanitized TO authenticated;

-- Update comment to clarify security model
COMMENT ON VIEW public.public_profiles_sanitized IS 
'Sanitized view of active user profiles. Contains limited, safe-to-expose profile information.
SECURITY MODEL: This view uses security_invoker=on, meaning it executes with the caller''s permissions
and respects the RLS policies of the underlying user_profiles table. Direct access is restricted to
authenticated users. Anonymous users should use the fetch_public_profiles() SECURITY DEFINER function.
DATA EXPOSED: display_name, limited about text (200 chars), genres, sample of favorite_artists (max 5).
FILTERED TO: status=active profiles only.';

-- Verify base table has proper RLS (should already be enabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Log security configuration for audit purposes
DO $$
BEGIN
  RAISE NOTICE 'Security configuration verified for public_profiles_sanitized view:';
  RAISE NOTICE '  - security_invoker: ON (respects caller permissions)';
  RAISE NOTICE '  - Base table RLS: ENABLED';
  RAISE NOTICE '  - Access: authenticated users only';
  RAISE NOTICE '  - Anonymous access: via fetch_public_profiles() function only';
END $$;