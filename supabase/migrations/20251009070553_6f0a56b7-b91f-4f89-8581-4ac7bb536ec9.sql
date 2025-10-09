-- Fix view to use SECURITY INVOKER mode
-- Need to drop dependent function first, then recreate

-- Drop function that depends on the view
DROP FUNCTION IF EXISTS public.fetch_public_profiles(uuid[]);

-- Drop and recreate view with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles_sanitized;

CREATE VIEW public.public_profiles_sanitized
WITH (security_invoker=on)
AS
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
'Limited, sanitized subset of active user profiles. Uses SECURITY INVOKER to respect RLS.';

-- Recreate function with SECURITY DEFINER (intentional for controlled anon access)
CREATE FUNCTION public.fetch_public_profiles(p_ids uuid[] DEFAULT NULL)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fetch_public_profiles(uuid[]) TO anon, authenticated;