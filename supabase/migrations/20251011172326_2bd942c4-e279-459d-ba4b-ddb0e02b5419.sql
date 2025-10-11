-- Add input validation constraints for messages table
ALTER TABLE public.messages 
ADD CONSTRAINT message_body_length CHECK (
  char_length(body) > 0 AND 
  char_length(body) <= 5000 AND
  char_length(trim(body)) > 0
);

-- Add input validation constraints for recordings table
ALTER TABLE public.recordings 
ADD CONSTRAINT recording_title_valid CHECK (
  char_length(title) > 0 AND 
  char_length(title) <= 200 AND
  char_length(trim(title)) > 0
);

-- Create a server-side function to validate if a user is an admin
-- This provides defense in depth beyond just RLS
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;