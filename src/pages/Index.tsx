import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { Heart } from 'lucide-react';
import { AutocompleteSearch } from '@/components/AutocompleteSearch';
import { SongLibrary } from '@/components/SongLibrary';
import { FeelingJourney } from '@/components/FeelingJourney';
import { PerformancePrepTools } from '@/components/PerformancePrepTools';
import { FeelingsCard } from '@/components/FeelingsCard';
import { VibePicker } from '@/components/VibePicker';

import { LanguageToggle } from '@/components/LanguageToggle';
import { FeelingMap, Song, Vibe } from '@/types';
import songsData from '@/data/songs.json';
import logo from '@/assets/logo.png';
import { useFavorites } from '@/hooks/useFavorites';
import { motion } from 'framer-motion';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { fadeInUp } from '@/ui/motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { MotionIfOkay } from '@/ui/MotionIfOkay';
import { Link } from 'react-router-dom';

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMap, setCurrentMap] = useState<FeelingMap | null>(null);
  const [showVibePicker, setShowVibePicker] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [showPrepTools, setShowPrepTools] = useState(false);
  const [searchQuery, setSearchQuery] = useState({ title: '', artist: '' });
  const [isLoading, setIsLoading] = useState(false);
  const { favorites } = useFavorites();
  const prefersReducedMotion = usePrefersReducedMotion();

  const songs: Song[] = songsData;

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session) {
        navigate('/auth');
      }
      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate('/auth');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'error',
      });
    } else {
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      navigate('/auth');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  const searchSong = (title: string, artist: string) => {
    setIsLoading(true);
    setSearchQuery({ title, artist });
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      // Fuzzy search for song
      const normalizeString = (str: string) => str.toLowerCase().trim();
      
      const found = songs.find(song => {
        const titleMatch = normalizeString(song.title) === normalizeString(title);
        const artistMatch = !artist || normalizeString(song.artist) === normalizeString(artist);
        return titleMatch && artistMatch;
      });

      if (found) {
        setCurrentMap({
          ...found,
          isVibeBasedMap: false
        });
        setShowVibePicker(false);
      } else {
        // Try partial match
        const partialMatch = songs.find(song => 
          normalizeString(song.title).includes(normalizeString(title)) ||
          normalizeString(title).includes(normalizeString(song.title))
        );

        if (partialMatch) {
          setCurrentMap({
            ...partialMatch,
            isVibeBasedMap: false
          });
          setShowVibePicker(false);
        } else {
          setCurrentMap(null);
          setShowVibePicker(true);
        }
      }
      setIsLoading(false);
    }, 800);
  };

  const handleVibeSelect = (vibe: Vibe) => {
    const vibeBasedMap: FeelingMap = {
      id: `vibe-${vibe.id}-${Date.now()}`,
      title: searchQuery.title,
      artist: searchQuery.artist,
      summary: `Vibe-based feeling map for "${searchQuery.title}"`,
      theme: vibe.label,
      core_feelings: vibe.emotions,
      access_ideas: vibe.tips,
      visual: "🎭",
      isVibeBasedMap: true,
      vibeLabel: vibe.label
    };
    
    setCurrentMap(vibeBasedMap);
    setShowVibePicker(false);
  };

  const handleSelectSong = (song: Song) => {
    setCurrentMap({
      ...song,
      isVibeBasedMap: false
    });
    setShowVibePicker(false);
    setShowLibrary(false);
    setShowJourney(false);
    setShowPrepTools(false);
  };

  const handleSelectFavorite = (feelingMap: FeelingMap) => {
    setCurrentMap(feelingMap);
    setShowVibePicker(false);
    setShowLibrary(false);
    setShowJourney(false);
    setShowPrepTools(false);
  };

  const handleRandomSong = () => {
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    handleSelectSong(randomSong);
  };

  const handleReset = () => {
    setCurrentMap(null);
    setShowVibePicker(false);
    setShowLibrary(false);
    setShowJourney(false);
    setShowPrepTools(false);
    setSearchQuery({ title: '', artist: '' });
  };

  const handleBrandClick = () => {
    if (currentMap || showVibePicker || showLibrary || showJourney || showPrepTools) {
      handleReset();
    } else {
      navigate('/');
    }
  };

  return (
    <MotionIfOkay>
      <motion.div
        initial={prefersReducedMotion ? false : fadeInUp.initial}
        animate={prefersReducedMotion ? undefined : fadeInUp.animate}
        exit={prefersReducedMotion ? undefined : fadeInUp.exit}
        className="min-h-screen relative"
      >
        {/* Solid background */}
        <div className="fixed inset-0 bg-background" />
        
        {/* Main content */}
        <div className="relative z-10 container mx-auto px-4 py-4 md:py-8">
        <div className="space-y-8 md:space-y-12">
          {/* Header */}
          <div className="text-center mt-12 md:mt-16">
            <div className="flex flex-col items-center gap-4">
              <img
                src={logo}
                alt="Stage Heart Logo"
                className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 object-contain mx-auto transition-transform duration-200 group-hover:scale-105"
              />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center whitespace-nowrap">
                Stage Heart
              </h1>
              <p className="text-sm md:text-base text-foreground max-w-2xl mx-auto text-center">
                {t('app.subtitle') || 'Discover the emotional journey of music'}
              </p>
            </div>
          </div>
          
          {/* Navigation buttons */}
          {!currentMap && !showVibePicker && !showLibrary && !showJourney && !showPrepTools && (
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 px-4 mt-8">
              <AnimatedButton
                onClick={() => setShowLibrary(true)}
                className="px-4 py-2 md:px-6 md:py-2.5 bg-accent hover:bg-button-secondary-hover text-accent-foreground rounded-full transition-colors text-sm md:text-base font-medium"
              >
                {t('navigation.browseLibrary')} ({songs.length} songs)
              </AnimatedButton>
              <AnimatedButton
                onClick={() => setShowJourney(true)}
                className="px-4 py-2 md:px-6 md:py-2.5 bg-secondary hover:bg-button-secondary-hover text-secondary-foreground rounded-full transition-colors text-sm md:text-base font-medium"
              >
                {t('navigation.feelingJourney')}
              </AnimatedButton>
              <AnimatedButton
                onClick={() => setShowPrepTools(true)}
                className="px-4 py-2 md:px-6 md:py-2.5 bg-secondary hover:bg-button-secondary-hover text-secondary-foreground rounded-full transition-colors text-sm md:text-base font-medium"
              >
                Performance Prep
              </AnimatedButton>
              <AnimatedButton
                onClick={handleRandomSong}
                className="px-4 py-2 md:px-6 md:py-2.5 bg-secondary hover:bg-button-secondary-hover text-secondary-foreground rounded-full transition-colors text-sm md:text-base font-medium"
              >
                {t('navigation.surpriseMe')}
              </AnimatedButton>
            </div>
          )}

          {/* Search Form */}
          {!currentMap && !showVibePicker && !showLibrary && !showJourney && !showPrepTools && (
            <AutocompleteSearch 
              onSearch={searchSong} 
              onSelectSong={handleSelectSong}
              isLoading={isLoading} 
            />
          )}

          {/* Empty state */}
          {!currentMap && !showVibePicker && !showLibrary && !showJourney && !showPrepTools && !isLoading && (
            <div className="text-center pt-6 pb-12">
              <p className="text-muted-foreground text-sm md:text-base">
                Enter a song and I'll map its feelings.
              </p>
            </div>
          )}

          {/* Vibe Picker */}
          {showVibePicker && (
            <VibePicker
              onVibeSelect={handleVibeSelect}
              songTitle={searchQuery.title}
              artist={searchQuery.artist}
            />
          )}

          {/* Feeling Journey */}
          {showJourney && (
            <FeelingJourney 
              onSelectSong={handleSelectSong}
              onClose={() => setShowJourney(false)}
              songs={songs}
            />
          )}

          {/* Song Library */}
          {showLibrary && (
            <SongLibrary 
              onSelectSong={handleSelectSong}
              onClose={() => setShowLibrary(false)}
            />
          )}

          {/* Performance Prep Tools */}
          {showPrepTools && (
            <PerformancePrepTools 
              currentSong={currentMap ? songs.find(s => s.id === currentMap.id) : undefined}
              onClose={() => setShowPrepTools(false)}
              songs={songs}
            />
          )}

          {/* Feelings Card */}
          {currentMap && (
            <div className="space-y-4">
              <FeelingsCard
                feelingMap={currentMap}
                onOpenPrepTools={() => setShowPrepTools(true)}
              />
            </div>
          )}

          {/* Reset button */}
          {(currentMap || showVibePicker) && (
            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm underline underline-offset-4"
              >
                ← Search another song
              </button>
            </div>
          )}
        </div>
        </div>
      </motion.div>
    </MotionIfOkay>
  );
};

export default Index;
