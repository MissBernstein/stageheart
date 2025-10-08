-- Harden user_profiles exposure: remove public select, require auth for active profiles
-- Generated 2025-10-08

-- Drop permissive public policy
DROP POLICY IF EXISTS "Public can view active profiles" ON public.user_profiles;

-- Authenticated users only may view active profiles
CREATE POLICY "Authenticated can view active profiles" ON public.user_profiles
FOR SELECT USING (auth.role() = 'authenticated' AND status = 'active');

-- (Optional) Future: create a sanitized view if anonymous browsing is reintroduced.
-- Example scaffold (kept commented out until decided):
-- CREATE OR REPLACE VIEW public.public_profiles_sanitized AS
--   SELECT id, display_name FROM public.user_profiles WHERE status = 'active';
-- RLS still applies; would need a dedicated SECURITY DEFINER function to expose anonymized data without auth.
