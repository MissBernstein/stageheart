-- Fix security warnings: Set search_path for all functions

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix check_max_public_recordings function
CREATE OR REPLACE FUNCTION public.check_max_public_recordings()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  public_count INTEGER;
BEGIN
  IF NEW.state = 'public' THEN
    SELECT COUNT(*) INTO public_count
    FROM public.recordings
    WHERE user_id = NEW.user_id 
    AND state = 'public' 
    AND id != NEW.id;
    
    IF public_count >= 3 THEN
      RAISE EXCEPTION 'Maximum 3 public recordings allowed per user';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix increment_recording_plays function
CREATE OR REPLACE FUNCTION public.increment_recording_plays(recording_uuid UUID)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.recordings
  SET plays_count = plays_count + 1
  WHERE id = recording_uuid;
END;
$$;