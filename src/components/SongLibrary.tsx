import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Shuffle, Grid, List, Plus } from 'lucide-react';
import jukeboxIcon from '@/assets/jukeboxicon.png';
import { Input } from '@/components/ui/input';
import { Song } from '@/types';
// Lazy-load static songs when the modal mounts to shave initial bundle weight
let staticSongsCache: Song[] | null = null;
async function loadStaticSongs(): Promise<Song[]> {
  if (staticSongsCache) return staticSongsCache;
  const mod = await import('@/data/songs.json');
  staticSongsCache = (mod.default || []) as Song[];
  return staticSongsCache;
}
import { useRemoteSongs } from '@/hooks/useRemoteSongs';
import { getCanonicalThemes } from '@/lib/themes';

// Helper function to translate themes
const getThemeTranslationKey = (theme: string): string => {
  const themeMap: Record<string, string> = {
    'Awe & contentment': 'themes.aweContentment',
    'Bittersweet perspective': 'themes.bittersweetPerspective', 
    'Freedom / breaking free': 'themes.freedomBreakingFree',
    'Hopeful unity': 'themes.hopefulUnity',
    'Identity & authenticity': 'themes.identityAuthenticity',
    'Joyful praise & celebration': 'themes.joyfulPraiseCelebration',
    'Nostalgia & homesickness': 'themes.nostalgiaHomesickness',
    'Playful groove & connection': 'themes.playfulGrooveConnection',
    'Resilience & strength': 'themes.resilienceStrength',
    'Tender love & devoted care': 'themes.tenderLoveDevotedCare',
    'Unconditional support & comfort': 'themes.unconditionalSupportComfort',
    'Yearning & reflection': 'themes.yearningReflection'
  };
  return themeMap[theme] || theme;
};

// Helper function to translate feelings
const getFeelingTranslationKey = (feeling: string): string => {
  const feelingMap: Record<string, string> = {
    'deep empathy': 'songContent.feelingCards.deepEmpathy',
    'warm reassurance': 'songContent.feelingCards.warmReassurance',
    'quiet strength': 'songContent.feelingCards.quietStrength',
    'playful groove': 'songContent.feelingCards.playfulGroove',
    'cheeky frustration': 'songContent.feelingCards.cheekyFrustration',
    'joy': 'songContent.feelingCards.joy',
    'celebration': 'songContent.feelingCards.celebration',
    "i've learned": 'songContent.feelingCards.ivelearned',
    'gentle awe': 'songContent.feelingCards.gentleAwe',
    'quiet surrender': 'songContent.feelingCards.quietSurrender',
    'playful sass': 'songContent.feelingCards.playfulSass',
    'undercurrent': 'songContent.feelingCards.undercurrent',
    'warm trust': 'songContent.feelingCards.warmTrust',
    'rising hope': 'songContent.feelingCards.risingHope',
    'tender longing': 'songContent.feelingCards.tenderLonging',
    'vulnerable hope': 'songContent.feelingCards.vulnerableHope'
  };
  const key = feelingMap[feeling.toLowerCase()];
  return key ? key : feeling;
};
import { AnimatedButton } from '@/ui/AnimatedButton';
import { AnimatedListItem } from '@/ui/AnimatedListItem';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeInUp, motionDur, motionEase } from '@/ui/motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { MotionIfOkay } from '@/ui/MotionIfOkay';

interface SongLibraryProps {
  onSelectSong: (song: Song) => void;
  onClose: () => void;
}

export const SongLibrary = ({ onSelectSong, onClose }: SongLibraryProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const { remoteSongs, loading: remoteLoading, error: remoteError } = useRemoteSongs();
  const [staticSongs, setStaticSongs] = useState<Song[]>([]);
  const [includeRemote, setIncludeRemote] = useState(true);
  useEffect(() => { loadStaticSongs().then(setStaticSongs); }, []);
  const songs: Song[] = useMemo(() => {
    const base = staticSongs;
    if (!includeRemote) return base;
    const existingIds = new Set(base.map(s => s.id));
    const additions = remoteSongs.filter(r => !existingIds.has(r.id));
    return [...base, ...additions];
  }, [staticSongs, remoteSongs, includeRemote]);

  const themes = useMemo(() => getCanonicalThemes(), []);

  const filteredSongs = songs.filter(song => {
    const query = searchQuery.toLowerCase();
    const themeText = (song.theme_detail ?? song.theme).toLowerCase();
    const searchMatch = !searchQuery ||
      song.title.toLowerCase().includes(query) ||
      song.artist.toLowerCase().includes(query) ||
      themeText.includes(query) ||
      song.core_feelings.some(feeling => 
        feeling.toLowerCase().includes(query)
      );
    
    const themeMatch = !selectedTheme || song.theme === selectedTheme;
    
    return searchMatch && themeMatch;
  });

  const handleRandomSong = () => {
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    onSelectSong(randomSong);
  };

  const itemVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: motionDur.base / 1000, ease: motionEase.entrance } },
    exit: { opacity: 0, y: -8, transition: { duration: motionDur.fast / 1000, ease: motionEase.exit } },
  };

  // Accessibility: lock scroll, focus trap & ESC close
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstFocusable = () => containerRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); }
      if (e.key === 'Tab' && containerRef.current) {
        const focusables = Array.from(containerRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    setTimeout(() => firstFocusable()?.focus(), 0);
    return () => { window.removeEventListener('keydown', handleKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // Live region for status updates
  const [statusMsg, setStatusMsg] = useState('');
  useEffect(() => {
    setStatusMsg(t('library.count', { count: filteredSongs.length, total: songs.length }));
  }, [filteredSongs.length, songs.length, t]);

  return createPortal(
    <MotionIfOkay>
      <motion.div
        initial={prefersReducedMotion ? false : fadeInUp.initial}
        animate={prefersReducedMotion ? undefined : fadeInUp.animate}
        exit={prefersReducedMotion ? undefined : fadeInUp.exit}
        className="fixed inset-0 z-[999] overflow-y-auto min-h-screen w-screen bg-background/95 backdrop-blur-sm"
        role="dialog" aria-modal="true" aria-labelledby="song-library-title"
        ref={containerRef}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="bg-card/95 rounded-3xl shadow-card border border-card-border/70 max-w-6xl mx-auto">
          {/* Header */}
          <div className="p-6 border-b border-card-border">
            <div className="flex items-center justify-between mb-4">
              <h2 id="song-library-title" className="text-2xl font-semibold text-card-foreground flex items-center gap-3">
                <img src={jukeboxIcon} alt="Jukebox Icon" className="w-16 h-16 object-contain" />
                {t('library.title')}
              </h2>
              <AnimatedButton
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 text-lg text-card-foreground/60 hover:text-card-foreground"
              >
                <span aria-hidden>×</span>
                <span className="sr-only">{t('library.close', 'Close library')}</span>
              </AnimatedButton>
            </div>
            
            {/* Search and filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-card-foreground/40 w-4 h-4" />
                <Input
                  placeholder={t('library.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-input border-input-border"
                />
              </div>
              
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="pl-3 pr-8 py-2 bg-input border border-input-border rounded-md text-card-foreground appearance-none"
              >
                <option value="">{t('library.allThemes')}</option>
                {themes.map(theme => (
                  <option key={theme} value={theme}>{t(getThemeTranslationKey(theme))}</option>
                ))}
              </select>
              
              <div className="flex gap-2">
                <AnimatedButton
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className="px-3"
                >
                  <Grid className="w-4 h-4" />
                  <span className="sr-only">{t('library.gridView', 'Grid view')}</span>
                </AnimatedButton>
                <AnimatedButton
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className="px-3"
                >
                  <List className="w-4 h-4" />
                  <span className="sr-only">{t('library.listView', 'List view')}</span>
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={handleRandomSong}
                  className="ml-2"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  {t('library.surpriseMe')}
                </AnimatedButton>
                <Link to="/add">
                  <AnimatedButton
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('library.addNewSong', 'Add new song')}
                  </AnimatedButton>
                </Link>
                <AnimatedButton
                  variant={includeRemote ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setIncludeRemote(r => !r)}
                  aria-pressed={includeRemote}
                >
                  {includeRemote ? t('library.hideRemote', 'Hide remote') : t('library.showRemote', 'Show remote')}
                </AnimatedButton>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-card-foreground/60 flex-wrap">
              <span>{t('library.count', { count: filteredSongs.length, total: songs.length })}</span>
              {remoteLoading && <span className="animate-pulse">{t('common.loading')}</span>}
              {remoteError && <span className="text-destructive/80">API: {remoteError}</span>}
              {!remoteLoading && remoteSongs.length > 0 && (
                <span className="text-card-foreground/50">+{remoteSongs.length} {t('library.remote', 'remote')}</span>
              )}
              {!remoteLoading && includeRemote && remoteSongs.some(s => s.isNew) && (
                <span className="text-emerald-500/80">{t('library.newBadgeLegend', '🆕 = added recently')}</span>
              )}
              <span className="sr-only" aria-live="polite">{statusMsg}</span>
            </div>
          </div>
          
          {/* Songs grid/list */}
          <div className="p-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredSongs.map((song) => (
                    <motion.button
                      key={song.id}
                      type="button"
                      layout={!prefersReducedMotion}
                      variants={itemVariants}
                      initial={prefersReducedMotion ? false : 'initial'}
                      animate={prefersReducedMotion ? undefined : 'animate'}
                      exit={prefersReducedMotion ? undefined : 'exit'}
                      whileHover={prefersReducedMotion ? undefined : { scale: 1.02, y: -2 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: motionDur.fast / 1000, ease: motionEase.standard }}
                      onClick={() => onSelectSong(song)}
                      className="motion-safe-only text-left rounded-xl border border-card-border/70 bg-card/70 p-4 backdrop-blur-sm hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <span className="text-2xl">{song.visual.split(' ')[0]}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="line-clamp-1 font-medium text-card-foreground flex items-center gap-2">
                            {song.title}
                            {song.isRemote && song.isNew && <span className="text-[11px] rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 leading-none">🆕</span>}
                          </h3>
                          <p className="line-clamp-1 text-sm text-card-foreground/70">{song.artist}</p>
                        </div>
                      </div>
                      <p className="mb-2 line-clamp-2 text-xs text-card-foreground/60">{song.summary}</p>
                      <div className="flex flex-wrap gap-1">
                        {song.core_feelings.slice(0, 2).map((feeling, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-emotion-bg px-2 py-1 text-xs text-emotion-foreground"
                          >
                            {t(getFeelingTranslationKey(feeling))}
                          </span>
                        ))}
                        {song.core_feelings.length > 2 && (
                          <span className="rounded-full bg-emotion-bg/50 px-2 py-1 text-xs text-emotion-foreground">
                            +{song.core_feelings.length - 2}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                <AnimatePresence mode="popLayout">
                  {filteredSongs.map((song) => (
                    <AnimatedListItem key={song.id} className="motion-safe-only">
                      <motion.button
                        type="button"
                        layout={!prefersReducedMotion}
                        onClick={() => onSelectSong(song)}
                        whileHover={prefersReducedMotion ? undefined : { scale: 1.01, y: -1 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: motionDur.fast / 1000, ease: motionEase.standard }}
                        className="motion-safe-only w-full rounded-xl border border-card-border/70 bg-card/70 p-4 text-left backdrop-blur-sm hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xl">{song.visual.split(' ')[0]}</span>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <h3 className="font-medium text-card-foreground flex items-center gap-2">{song.title} {song.isRemote && song.isNew && <span className="text-[11px] rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 leading-none">🆕</span>}</h3>
                              <span className="text-sm text-card-foreground/70">{t('common.by', 'by')} {song.artist}</span>
                            </div>
                            <p className="mb-2 text-sm text-card-foreground/60">{song.summary}</p>
                            <div className="flex flex-wrap gap-1">
                              {song.core_feelings.map((feeling, index) => (
                                <span
                                  key={index}
                                  className="rounded-full bg-emotion-bg px-2 py-1 text-xs text-emotion-foreground"
                                >
                                  {t(getFeelingTranslationKey(feeling))}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    </AnimatedListItem>
                  ))}
                </AnimatePresence>
              </ul>
            )}
            
            {filteredSongs.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <p className="text-card-foreground/60">{t('library.noResults')}</p>
                <p className="text-card-foreground/60">{t('library.tryDifferent')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </motion.div>
    </MotionIfOkay>,
    document.body
  );
};
