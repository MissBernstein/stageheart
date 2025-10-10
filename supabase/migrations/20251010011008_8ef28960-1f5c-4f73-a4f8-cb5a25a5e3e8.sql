-- Implement role-based access control for songs table
-- This prevents unauthorized users from inserting songs directly

-- Step 1: Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Only admins can assign roles (handled via admin interface)
-- For now, no INSERT/UPDATE policies - roles must be assigned via service role

-- Step 3: Create helper function to check user roles
-- Uses SECURITY DEFINER to avoid recursive RLS issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

COMMENT ON FUNCTION public.has_role IS 
'Checks if a user has a specific role. Used for role-based access control in RLS policies.';

-- Step 4: Remove temporary INSERT policy on songs table
DROP POLICY IF EXISTS "Songs insert (temp migration)" ON public.songs;

-- Step 5: Create admin-only INSERT policy
CREATE POLICY "Admins can insert songs"
ON public.songs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Keep SELECT policy unchanged (songs are public)
-- "Songs are viewable by everyone" - already exists

-- Step 6: Add UPDATE and DELETE policies for admins
CREATE POLICY "Admins can update songs"
ON public.songs
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete songs"
ON public.songs
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Step 7: Document the security model
COMMENT ON TABLE public.songs IS 
'Song catalog. Public readable, admin-only write access.
SECURITY MODEL: Users submit songs via submissions table. Admins review and approve by inserting into songs table.
RLS enforced: Only users with admin role can INSERT/UPDATE/DELETE.';

COMMENT ON TABLE public.user_roles IS 
'User role assignments for role-based access control.
SECURITY MODEL: Users can view their own roles. Role assignments must be done via service role (admin interface).';

-- Verification
DO $$
DECLARE
  v_select_count integer;
  v_insert_count integer;
  v_update_count integer;
  v_delete_count integer;
BEGIN
  SELECT COUNT(*) INTO v_select_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'songs' AND cmd = 'SELECT';
  SELECT COUNT(*) INTO v_insert_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'songs' AND cmd = 'INSERT';
  SELECT COUNT(*) INTO v_update_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'songs' AND cmd = 'UPDATE';
  SELECT COUNT(*) INTO v_delete_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'songs' AND cmd = 'DELETE';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'SONGS TABLE SECURITY HARDENED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '  ✓ SELECT: % policy (public access)', v_select_count;
  RAISE NOTICE '  ✓ INSERT: % policy (admin only)', v_insert_count;
  RAISE NOTICE '  ✓ UPDATE: % policy (admin only)', v_update_count;
  RAISE NOTICE '  ✓ DELETE: % policy (admin only)', v_delete_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Role Infrastructure Created:';
  RAISE NOTICE '  ✓ app_role enum (admin, moderator, user)';
  RAISE NOTICE '  ✓ user_roles table with RLS';
  RAISE NOTICE '  ✓ has_role() helper function';
  RAISE NOTICE '';
  RAISE NOTICE 'User Workflow:';
  RAISE NOTICE '  1. Users submit songs → submissions table';
  RAISE NOTICE '  2. Admins review submissions';
  RAISE NOTICE '  3. Admins approve → INSERT into songs table';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Assign admin roles via SQL:';
  RAISE NOTICE '  INSERT INTO user_roles (user_id, role)';
  RAISE NOTICE '  VALUES (''<user-uuid>'', ''admin'');';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;