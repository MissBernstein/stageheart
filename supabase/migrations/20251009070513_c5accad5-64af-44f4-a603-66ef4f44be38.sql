-- 1. Harden RLS on user_profiles
-- Ensure RLS enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop the old permissive policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='user_profiles'
      AND policyname='Public can view active profiles'
  ) THEN
    EXECUTE 'DROP POLICY "Public can view active profiles" ON public.user_profiles';
  END IF;
END $$;

-- Create (or replace) stricter authenticated-only view policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='user_profiles'
      AND policyname='Authenticated can view active profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated can view active profiles" ON public.user_profiles FOR SELECT USING (auth.role() = ''authenticated'' AND status = ''active'')';
  END IF;
END $$;

-- Keep (do not duplicate) existing owner policies (view/update/insert) if already defined
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can view own profile' AND tablename='user_profiles') THEN
    EXECUTE 'CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can update own profile' AND tablename='user_profiles') THEN
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can insert own profile' AND tablename='user_profiles') THEN
    EXECUTE 'CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- 2. Sanitized view (recreate to ensure latest shape)
CREATE OR REPLACE VIEW public.public_profiles_sanitized AS
SELECT
  id,
  display_name,
  LEFT(COALESCE(about,''), 200) AS about_snippet,
  COALESCE(fav_genres, ARRAY[]::text[]) AS genres,
  CASE
    WHEN favorite_artists IS NULL THEN ARRAY[]::text[]
    ELSE favorite_artists[1:5]
  END AS favorite_artists_sample
FROM public.user_profiles
WHERE status = 'active';

COMMENT ON VIEW public.public_profiles_sanitized IS
'Limited, sanitized subset of active user profiles safe for anonymous consumption.';

-- 3. SECURITY DEFINER function for sanitized access
CREATE OR REPLACE FUNCTION public.fetch_public_profiles(p_ids uuid[] DEFAULT NULL)
RETURNS SETOF public.public_profiles_sanitized
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.public_profiles_sanitized
  WHERE (p_ids IS NULL OR id = ANY(p_ids));
$$;

COMMENT ON FUNCTION public.fetch_public_profiles(uuid[]) IS
'Returns sanitized profile rows (optionally filtered by UUID array). Anonymous safe.';

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.fetch_public_profiles(uuid[]) TO anon, authenticated;