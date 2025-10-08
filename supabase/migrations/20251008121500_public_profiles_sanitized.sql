-- Sanitized public profile exposure
-- Purpose: Allow anonymous users to retrieve minimal, non-sensitive profile data without exposing privacy settings.
-- Date: 2025-10-08

-- 1. Create sanitized view (no privacy flags, contact settings, or DM indicators)
CREATE OR REPLACE VIEW public.public_profiles_sanitized AS
SELECT
  id,
  display_name,
  -- Truncate about field to a short snippet to reduce accidental oversharing exposure
  LEFT(COALESCE(about,''), 200) AS about_snippet,
  -- Provide a generic combined genres list (legacy fav_genres) only
  COALESCE(fav_genres, ARRAY[]::text[]) AS genres,
  -- Optional lightweight artist inspiration list (cap to 5 entries)
  CASE WHEN favorite_artists IS NULL THEN ARRAY[]::text[] ELSE favorite_artists[1:5] END AS favorite_artists_sample
FROM public.user_profiles
WHERE status = 'active';

COMMENT ON VIEW public.public_profiles_sanitized IS 'Limited, sanitized subset of active user profiles safe for anonymous consumption.';

-- 2. Security-definer function to fetch sanitized profiles (optionally by ID list)
CREATE OR REPLACE FUNCTION public.fetch_public_profiles(p_ids uuid[] DEFAULT NULL)
RETURNS SETOF public.public_profiles_sanitized
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.public_profiles_sanitized
  WHERE (p_ids IS NULL OR id = ANY(p_ids));
$$;

COMMENT ON FUNCTION public.fetch_public_profiles(uuid[]) IS 'Returns sanitized profile rows (optionally filtered by provided UUID array). Anonymous safe.';

-- 3. Grant execute rights to anon + authenticated roles
GRANT EXECUTE ON FUNCTION public.fetch_public_profiles(uuid[]) TO anon, authenticated;

-- 4. (Defensive) Revoke direct select on base table for anon if not already revoked (policy removed earlier)
-- Policies govern access; this is just a reminder that no SELECT policy exists for anon.
-- DO NOT add one here.

-- 5. Future Hardening Ideas (not executed):
-- * Rate limit via edge function proxy.
-- * Add caching layer (KV / edge cache) around this function.
-- * Add optional search parameter handling inside a plpgsql function with ILIKE safety.
