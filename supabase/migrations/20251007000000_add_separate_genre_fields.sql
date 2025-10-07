-- Add separate genre fields for singing and listening preferences
-- while keeping fav_genres for backward compatibility

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS genres_singing TEXT[],
ADD COLUMN IF NOT EXISTS genres_listening TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN public.user_profiles.genres_singing IS 'Genres the user loves to sing';
COMMENT ON COLUMN public.user_profiles.genres_listening IS 'Genres the user loves to listen to';
COMMENT ON COLUMN public.user_profiles.fav_genres IS 'Legacy combined genres field - kept for backward compatibility';