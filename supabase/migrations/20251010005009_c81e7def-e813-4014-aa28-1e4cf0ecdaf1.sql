-- Enable RLS on the public_profiles_sanitized view
ALTER VIEW public.public_profiles_sanitized SET (security_invoker = on);

-- Create a policy to allow public read access to sanitized profile data
-- Note: Views in PostgreSQL inherit RLS from their base tables, but we ensure proper access
-- by using the security_invoker setting which makes the view execute with the caller's permissions

-- The view already filters to status='active' and limits data exposure
-- Access is controlled through:
-- 1. The base table (user_profiles) RLS policies
-- 2. The SECURITY DEFINER function (fetch_public_profiles) for programmatic access
-- 3. Direct view access respects user_profiles RLS policies due to security_invoker=on

-- Grant SELECT on the view to authenticated users
-- Anonymous users should use the fetch_public_profiles function instead
GRANT SELECT ON public.public_profiles_sanitized TO authenticated;

-- Verify RLS is enabled on the base table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Add a policy for the view access through the base table
-- This allows authenticated users to view active profiles via the sanitized view
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
    AND policyname = 'View sanitized active profiles'
  ) THEN
    CREATE POLICY "View sanitized active profiles"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (status = 'active');
  END IF;
END $$;

COMMENT ON VIEW public.public_profiles_sanitized IS 
'Sanitized view of active user profiles. Contains limited, safe-to-expose profile information. Access via fetch_public_profiles() function for anonymous users, or direct SELECT for authenticated users.';
