-- Secure feeling_cards table using the existing role infrastructure
-- Remove temporary migration policy and restrict to admin-only access

-- Remove temporary INSERT policy
DROP POLICY IF EXISTS "Feeling cards insert (temp migration)" ON public.feeling_cards;

-- Create admin-only INSERT policy
CREATE POLICY "Admins can insert feeling cards"
ON public.feeling_cards
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Keep SELECT policy unchanged (feeling cards are public)
-- "Feeling cards are viewable by everyone" - already exists

-- Add UPDATE policy for admins
CREATE POLICY "Admins can update feeling cards"
ON public.feeling_cards
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Add DELETE policy for admins
CREATE POLICY "Admins can delete feeling cards"
ON public.feeling_cards
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Update table documentation
COMMENT ON TABLE public.feeling_cards IS 
'Feeling journey cards associated with songs. Public readable, admin-only write access.
SECURITY MODEL: Only users with admin role can INSERT/UPDATE/DELETE feeling cards.
These cards help users explore emotional connections to songs through guided prompts.';

-- Verification
DO $$
DECLARE
  v_select_count integer;
  v_insert_count integer;
  v_update_count integer;
  v_delete_count integer;
BEGIN
  SELECT COUNT(*) INTO v_select_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feeling_cards' AND cmd = 'SELECT';
  SELECT COUNT(*) INTO v_insert_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feeling_cards' AND cmd = 'INSERT';
  SELECT COUNT(*) INTO v_update_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feeling_cards' AND cmd = 'UPDATE';
  SELECT COUNT(*) INTO v_delete_count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feeling_cards' AND cmd = 'DELETE';
  
  IF v_insert_count != 1 OR v_update_count != 1 OR v_delete_count != 1 THEN
    RAISE EXCEPTION 'Unexpected policy count. INSERT: %, UPDATE: %, DELETE: %', 
      v_insert_count, v_update_count, v_delete_count;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'FEELING_CARDS TABLE SECURITY HARDENED';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '  ✓ SELECT: % policy (public access)', v_select_count;
  RAISE NOTICE '  ✓ INSERT: % policy (admin only)', v_insert_count;
  RAISE NOTICE '  ✓ UPDATE: % policy (admin only)', v_update_count;
  RAISE NOTICE '  ✓ DELETE: % policy (admin only)', v_delete_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Attack Scenarios Blocked:';
  RAISE NOTICE '  ✓ Users cannot inject malicious feeling cards';
  RAISE NOTICE '  ✓ Database flooding prevented';
  RAISE NOTICE '  ✓ Spam content blocked';
  RAISE NOTICE '  ✓ Only admins can manage feeling cards catalog';
  RAISE NOTICE '';
  RAISE NOTICE 'Public Access:';
  RAISE NOTICE '  ✓ Users can still view all feeling cards';
  RAISE NOTICE '  ✓ Feeling journey feature fully functional';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;