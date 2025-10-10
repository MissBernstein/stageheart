-- =====================================================
-- SECURITY FIX: Restrict submissions table access to admins only
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view submissions" ON public.submissions;

-- Create admin-only SELECT policy
CREATE POLICY "Admins can view all submissions"
ON public.submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure the public INSERT policy remains (for song submission feature)
-- This already exists: "Anyone can submit songs"