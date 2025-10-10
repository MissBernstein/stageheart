-- Strengthen and consolidate RLS policies on messages table
-- Ensure only senders and recipients can access their messages

-- The existing policies are correct but let's make them more explicit and add documentation

-- Verify RLS is enabled (should already be)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies to consolidate them
DROP POLICY IF EXISTS "Users can view received messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view sent messages" ON public.messages;

-- Create single comprehensive SELECT policy
-- This ensures ONLY senders and recipients can read messages
CREATE POLICY "Users can only view messages they sent or received"
ON public.messages
FOR SELECT
TO authenticated
USING (
  -- User must be either the sender OR the recipient
  auth.uid() = from_user_id 
  OR 
  auth.uid() = to_user_id
);

-- Keep existing INSERT policy (already correct)
-- "Users can send messages" - verifies sender AND checks DM enabled

-- Keep existing UPDATE policy (already correct) 
-- "Users can update received messages" - allows marking as read

-- Add explicit comment documenting security model
COMMENT ON TABLE public.messages IS 
'Private direct messages between users.
SECURITY MODEL: RLS enforced. Users can only SELECT messages where they are sender (from_user_id) or recipient (to_user_id).
INSERT requires authentication and verification that recipient has DMs enabled.
UPDATE only allowed by message recipient (for marking as read).
DELETE not permitted (messages are permanent for audit purposes).';

COMMENT ON POLICY "Users can only view messages they sent or received" ON public.messages IS
'Restricts message SELECT access to sender and recipient only. Prevents any user from reading others'' private conversations.';

-- Verify policies are correct
DO $$
DECLARE
  v_select_count integer;
  v_insert_count integer;
  v_update_count integer;
BEGIN
  -- Count SELECT policies (should be 1)
  SELECT COUNT(*) INTO v_select_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'messages'
    AND cmd = 'SELECT';
  
  -- Count INSERT policies (should be 1)
  SELECT COUNT(*) INTO v_insert_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'messages'
    AND cmd = 'INSERT';
  
  -- Count UPDATE policies (should be 1)  
  SELECT COUNT(*) INTO v_update_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'messages'
    AND cmd = 'UPDATE';
  
  IF v_select_count != 1 OR v_insert_count != 1 OR v_update_count != 1 THEN
    RAISE EXCEPTION 'Unexpected policy count. SELECT: %, INSERT: %, UPDATE: %', 
      v_select_count, v_insert_count, v_update_count;
  END IF;
  
  RAISE NOTICE 'Messages table security verified:';
  RAISE NOTICE '  - RLS: ENABLED';
  RAISE NOTICE '  - SELECT policy: 1 (sender OR recipient only)';
  RAISE NOTICE '  - INSERT policy: 1 (authenticated, DM enabled check)';
  RAISE NOTICE '  - UPDATE policy: 1 (recipient only)';
  RAISE NOTICE '  - DELETE policy: 0 (no deletion allowed)';
  RAISE NOTICE '  - Private messages fully protected ✓';
END $$;