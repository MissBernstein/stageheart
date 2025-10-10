-- Fix search_path for touch_discovered_voices_updated_at function
-- This prevents potential search path injection attacks

-- Drop trigger first
DROP TRIGGER IF EXISTS discovered_voices_set_updated_at ON public.discovered_voices;

-- Drop and recreate function with proper search_path
DROP FUNCTION IF EXISTS public.touch_discovered_voices_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.touch_discovered_voices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.touch_discovered_voices_updated_at IS 
'Trigger function to automatically update the updated_at timestamp on discovered_voices table modifications.';

-- Recreate trigger
CREATE TRIGGER discovered_voices_set_updated_at
  BEFORE UPDATE ON public.discovered_voices
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_discovered_voices_updated_at();

-- Verify configuration
DO $$
DECLARE
  v_config text[];
  v_has_search_path boolean;
BEGIN
  SELECT proconfig INTO v_config
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname = 'touch_discovered_voices_updated_at';
  
  v_has_search_path := (v_config IS NOT NULL AND array_to_string(v_config, ',') LIKE '%search_path%');
  
  IF NOT v_has_search_path THEN
    RAISE EXCEPTION 'Function search_path not properly set';
  END IF;
  
  RAISE NOTICE 'Security fix completed:';
  RAISE NOTICE '  - Function: touch_discovered_voices_updated_at';
  RAISE NOTICE '  - search_path: public (fixed)';
  RAISE NOTICE '  - Trigger: discovered_voices_set_updated_at (recreated)';
END $$;