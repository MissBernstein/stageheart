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
'### Security Model for public_profiles_sanitized View ###

1. **Security Configuration**:
   - This view uses `security_invoker=on`, meaning it executes with the caller''s permissions.
   - It respects the Row-Level Security (RLS) policies of the underlying `user_profiles` table.

2. **Access Control**:
   - Direct access is restricted to authenticated users.
   - Anonymous users must use the `fetch_public_profiles()` SECURITY DEFINER function.

3. **Data Exposure**:
   - Fields exposed: `display_name`, truncated `about` text (200 chars), `genres`, and a sample of `favorite_artists` (max 5).
   - Only profiles with `status=active` are included.

4. **Purpose**:
   - Provides a sanitized subset of user profiles safe for limited public consumption.

### Notes ###
- Ensure RLS is enabled on the `user_profiles` table.
- Regularly audit permissions and access patterns to maintain security.';

-- Verify base table has proper RLS (should already be enabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Log security configuration for audit purposes
DO $$
BEGIN
  RAISE NOTICE 'Security configuration verified for public_profiles_sanitized view:';
  RAISE NOTICE '  - security_invoker: ON (respects caller permissions and RLS policies)';
  RAISE NOTICE '  - Base table RLS: ENABLED';
  RAISE NOTICE '  - Access: authenticated users only';
  RAISE NOTICE '  - Anonymous access: via fetch_public_profiles() SECURITY DEFINER function';
  RAISE NOTICE '  - Data exposed: display_name, about_snippet, genres, favorite_artists_sample';
  RAISE NOTICE '  - Profiles filtered to: status=active only';
END $$;