import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
// Dynamic import of supabase to keep heavy client out of initial bundle
import type { Database } from '@/integrations/supabase/types';
type Session = import('@supabase/supabase-js').Session;
type SupabaseClientType = import('@supabase/supabase-js').SupabaseClient<Database>;
let supabase: SupabaseClientType | null = null;
import { useToast } from '@/hooks/use-toast';
import { Heart } from 'lucide-react';
import { AutocompleteSearch } from '@/components/AutocompleteSearch';
import { SongLibrary } from '@/components/SongLibrary';
// Lazy-loaded feature modules to reduce initial bundle size
const FeelingJourney = lazy(() => import('@/components/FeelingJourney').then(m => ({ default: m.FeelingJourney })));
const PerformancePrepTools = lazy(() => import('@/components/PerformancePrepTools').then(m => ({ default: m.PerformancePrepTools })));
const FeelingsCard = lazy(() => import('@/components/FeelingsCard').then(m => ({ default: m.FeelingsCard })));
const VibePicker = lazy(() => import('@/components/VibePicker').then(m => ({ default: m.VibePicker })));
import { ProfileBadge } from '@/components/voices/ProfileBadge';
import { UserProfileModal } from '@/components/voices/UserProfileModal';
import { SettingsModal } from '@/components/voices/SettingsModal';
import { Mic2 } from 'lucide-react';
import { VoicesLibraryModal } from '@/components/voices/VoicesLibraryModal';
import { InboxModal } from '@/components/voices/InboxModal';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

import { LanguageToggle } from '@/components/LanguageToggle';
import { FeelingMap, Song, Vibe } from '@/types';
// Unified songs come from DB now
import { useAllSongs } from '@/hooks/useAllSongs';
import logo from '@/assets/logo.png';
import { useFavorites } from '@/hooks/useFavorites';
import { motion } from 'framer-motion';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { fadeInUp } from '@/ui/motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { MotionIfOkay } from '@/ui/MotionIfOkay';
import { Link } from 'react-router-dom';
import PageFooter from '@/ui/PageFooter';
import { useUnreadMessagesStore } from '@/hooks/useUnreadMessages';

const Index = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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
  const { unread: unreadMessages, setUnread: setUnreadMessages } = useUnreadMessagesStore();
  const [showMessagePulse, setShowMessagePulse] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  // Voices modal state MUST be declared before any early returns to preserve hook order
  const [showVoices, setShowVoices] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showInbox, setShowInbox] = useState(false);

  const { songs } = useAllSongs();

  const voicesButtonRef = useRef<HTMLButtonElement|null>(null);
  const settingsReturnRef = useRef<HTMLButtonElement|null>(null);
  const inboxReturnRef = useRef<HTMLButtonElement|null>(null);
  const profileReturnRef = useRef<HTMLButtonElement|null>(null);
  const pendingOpenSongIdRef = useRef<string | null>(null);

  // Capture requested song id via navigation state OR query parameter ?song=
  useEffect(() => {
    const search = location.search;
    const params = new URLSearchParams(search);
    const qSong = params.get('song');
    const stateSong = (location.state as any)?.openSongId;
    const songId = stateSong || qSong;
    if (songId) {
      pendingOpenSongIdRef.current = songId;
      // Clean URL if query param used
      if (qSong) {
        params.delete('song');
        const clean = `${location.pathname}${params.toString()?`?${params.toString()}`:''}`;
        navigate(clean, { replace: true });
      } else if (stateSong) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.pathname, location.search, location.state, navigate]);

  // When songs list arrives, fulfill pending selection
  useEffect(() => {
    if (pendingOpenSongIdRef.current && songs.length) {
      const targetId = pendingOpenSongIdRef.current;
      
      let target = songs.find(s => s.id === targetId);
      
      // Multiple fallback attempts for legacy favorites
      if (!target) {
        // Try by slug
        target = songs.find(s => s.slug === targetId);
      }
      
      if (!target) {
        // Try fuzzy title match (replace dashes/underscores with spaces)
        const fuzzyId = targetId.toLowerCase().replace(/[-_]/g, ' ');
        target = songs.find(s => s.title.toLowerCase() === fuzzyId);
      }
      
      if (!target) {
        // Try partial title match
        const searchTerm = targetId.toLowerCase().replace(/[-_]/g, ' ');
        target = songs.find(s => 
          s.title.toLowerCase().includes(searchTerm) || 
          searchTerm.includes(s.title.toLowerCase())
        );
      }
      
      if (!target) {
        // Try to parse as "title - artist" or "title by artist" format
        const titleArtistMatch = targetId.match(/^(.+?)(?:\s*[-–—]\s*|\s+by\s+)(.+)$/i);
        if (titleArtistMatch) {
          const [, title, artist] = titleArtistMatch;
          target = songs.find(s => 
            s.title.toLowerCase().trim() === title.toLowerCase().trim() &&
            s.artist.toLowerCase().trim() === artist.toLowerCase().trim()
          );
        }
      }
      
      if (target) {
        setCurrentMap({ ...target, isVibeBasedMap: false });
      }
      
      pendingOpenSongIdRef.current = null;
    }
  }, [songs]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    let mounted = true;
    (async () => {
      if (!supabase) {
        const mod = await import('@/integrations/supabase/client');
        supabase = mod.supabase;
      }
      if (!supabase) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (!newSession && location.pathname !== '/auth') {
          navigate('/auth', { replace: true });
        }
        setLoading(false);
      });
      unsub = () => subscription.unsubscribe();
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session);
      if (!session && location.pathname !== '/auth') {
        navigate('/auth', { replace: true });
      }
      setLoading(false);
    })();

    // Idle-time prefetch of commonly accessed feature bundles
    if (typeof window !== 'undefined') {
      const schedule = (cb: () => void) => (window as any).requestIdleCallback ? (window as any).requestIdleCallback(cb, { timeout: 3000 }) : setTimeout(cb, 1500);
      schedule(() => {
        // Fire and forget dynamic imports to warm the cache
        import('@/components/PerformancePrepTools');
        import('@/components/FeelingJourney');
        import('@/components/FeelingsCard');
        import('@/components/VibePicker');
        import('@/components/MusicPlayer');
        // Supabase already dynamically imported above; ensure cached
        import('@/integrations/supabase/client');
      });
    }
    return () => { mounted = false; if (unsub) unsub(); };
  }, []);

  // Fetch unread messages count (lightweight aggregate) & subscribe
  useEffect(() => {
    let mounted = true;
    let channel: any;
    (async () => {
      if (!supabase) {
        const mod = await import('@/integrations/supabase/client');
        supabase = mod.supabase;
      }
      if (!supabase || !session) return;
      // Initial count (assuming a view or table voice_messages with read_at null)
      try {
        const sb: any = supabase; // narrow to any to avoid deep type instantiation issues on wide union
        const { count, error } = await sb
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('to_user_id', session.user.id)
          .eq('is_read', false);
        if (!error && mounted && typeof count === 'number') setUnreadMessages(count);
      } catch { /* silent */ }
      // Realtime subscription
      try {
        channel = supabase.channel('unread-messages')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `to_user_id=eq.${session.user.id}` }, async () => {
            const sb2: any = supabase;
            const { count } = await sb2
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('to_user_id', session.user.id)
              .eq('is_read', false);
            if (mounted && typeof count === 'number') setUnreadMessages(count);
          })
          .subscribe();
      } catch { /* silent */ }
    })();
    return () => { mounted = false; if (channel) supabase?.removeChannel(channel); };
  }, [session]);

  // When profile menu opens (messages inside), fade out pulse after a short delay
  useEffect(() => {
    if (profileMenuOpen && showMessagePulse) {
      const t = setTimeout(() => setShowMessagePulse(false), 1200);
      return () => clearTimeout(t);
    }
  }, [profileMenuOpen, showMessagePulse]);

  const handleLogout = async () => {
    if (!supabase) {
      const mod = await import('@/integrations/supabase/client');
      supabase = mod.supabase;
    }
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: 'Failed to log out', description: 'Please try again.', variant: 'error' });
    } else {
      toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
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
          {/* Navigation */}
          <div className="flex justify-between items-start mb-4 md:mb-6">
            <div className="flex-1 flex justify-start items-start pt-2 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <AnimatedButton
                    ref={voicesButtonRef as any}
                    onClick={() => setShowVoices(true)}
                    className="h-10 w-10 md:h-12 md:w-auto md:px-4 flex items-center justify-center bg-primary/90 hover:bg-primary text-primary-foreground rounded-2xl shadow-card border border-primary/40 text-xs md:text-sm font-medium gap-2"
                  >
                    <Mic2 className="w-4 h-4" />
                    <span className="hidden md:inline">Discover Voices</span>
                  </AnimatedButton>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="md:hidden">Discover Voices</TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 flex justify-end items-start gap-2 md:gap-3 pt-2">
              <LanguageToggle />
              <ProfileBadge
                displayName={session?.user?.user_metadata?.display_name || session?.user?.email?.split('@')[0]}
                email={session?.user?.email}
                avatarUrl={session?.user?.user_metadata?.avatar_url}
                favoritesCount={favorites.length}
                unreadMessagesCount={showMessagePulse ? unreadMessages : 0}
                onNavigateFavorites={() => navigate('/favorites')}
                onNavigateInbox={() => setShowInbox(true)}
                onOpenSettings={() => setShowSettings(true)}
                onOpenMyProfile={() => setShowUserProfile(true)}
                onLogout={handleLogout}
                // capture trigger refs via onOpenChange if needed
              />
            </div>
          </div>

          {/* Header Section */}
          <div className="text-center mt-12 md:mt-16">
            <div className="flex flex-col items-center gap-4">
              <Link 
                to="/" 
                onClick={handleBrandClick}
                className="inline-block transition-transform duration-200 hover:-translate-y-1 hover:scale-105"
              >
                <img
                  src={logo}
                  alt="Stage Heart Logo"
                  className="w-[72px] h-[72px] object-contain cursor-pointer"
                />
              </Link>
              <h1 className="text-[36px] font-heading font-bold text-foreground text-center whitespace-nowrap">
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
                {t('common.enterSongTagline')}
              </p>
            </div>
          )}

          {/* Vibe Picker */}
          {showVibePicker && (
            <Suspense fallback={<div className="py-10 text-center text-muted-foreground">{t('common.loading')}</div>}>
              <VibePicker
                onVibeSelect={handleVibeSelect}
                songTitle={searchQuery.title}
                artist={searchQuery.artist}
              />
            </Suspense>
          )}

          {/* Feeling Journey */}
          {showJourney && (
            <Suspense fallback={<div className="py-10 text-center text-muted-foreground">{t('common.loading')}</div>}>
              <FeelingJourney 
                onSelectSong={handleSelectSong}
                onClose={() => setShowJourney(false)}
                songs={songs}
              />
            </Suspense>
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
            <Suspense fallback={<div className="py-10 text-center text-muted-foreground">{t('common.loading')}</div>}>
              <PerformancePrepTools 
                currentSong={currentMap ? songs.find(s => s.id === currentMap.id) : undefined}
                onClose={() => setShowPrepTools(false)}
                songs={songs}
              />
            </Suspense>
          )}

          {/* Feelings Card */}
          {currentMap && (
            <Suspense fallback={<div className="py-10 text-center text-muted-foreground">{t('common.loading')}</div>}>
              <div className="space-y-4">
                <FeelingsCard
                  feelingMap={currentMap}
                  onOpenPrepTools={() => setShowPrepTools(true)}
                />
              </div>
            </Suspense>
          )}

          {/* Reset button */}
          {(currentMap || showVibePicker) && (
            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm underline underline-offset-4"
              >
                {t('common.searchAnotherSong')}
              </button>
            </div>
          )}
    </div>
    </div>
    {/* Footer legal links */}
    <PageFooter compact />
  </motion.div>
  {showSettings && <SettingsModal onClose={() => setShowSettings(false)} returnFocusRef={settingsReturnRef} />}
  {showUserProfile && <UserProfileModal userId={session!.user.id} onClose={() => setShowUserProfile(false)} returnFocusRef={profileReturnRef} />}
  {showInbox && <InboxModal onClose={() => setShowInbox(false)} returnFocusRef={inboxReturnRef} />}
  {showVoices && (
    <VoicesLibraryModal onClose={() => setShowVoices(false)} returnFocusRef={voicesButtonRef} />
  )}
    </MotionIfOkay>
  );
};

export default Index;
