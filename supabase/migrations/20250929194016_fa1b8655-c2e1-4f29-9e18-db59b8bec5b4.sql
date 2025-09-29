-- Create table for saved warm-up routines
CREATE TABLE public.saved_warmups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_title TEXT NOT NULL,
  song_artist TEXT,
  physical_warmups TEXT[] NOT NULL,
  vocal_warmups TEXT[] NOT NULL,
  emotional_prep TEXT[] NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_warmups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own warmups"
ON public.saved_warmups
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own warmups"
ON public.saved_warmups
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own warmups"
ON public.saved_warmups
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);