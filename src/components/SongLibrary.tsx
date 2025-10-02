import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Shuffle, Grid, List } from 'lucide-react';
import jukeboxIcon from '@/assets/jukeboxicon.png';
import { Input } from '@/components/ui/input';
import { Song } from '@/types';
import songsData from '@/data/songs.json';
import { getCanonicalThemes } from '@/lib/themes';
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
  
  const songs: Song[] = songsData;

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

  return (
    <MotionIfOkay>
      <motion.div
        initial={prefersReducedMotion ? false : fadeInUp.initial}
        animate={prefersReducedMotion ? undefined : fadeInUp.animate}
        exit={prefersReducedMotion ? undefined : fadeInUp.exit}
        className="fixed inset-0 bg-background z-50 overflow-y-auto min-h-screen w-full"
      >
        <div className="container mx-auto px-4 py-8">
          <div className="bg-card/95 rounded-3xl shadow-card border border-card-border/70 max-w-6xl mx-auto">
          {/* Header */}
          <div className="p-6 border-b border-card-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-card-foreground flex items-center gap-3">
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
                <span className="sr-only">Close library</span>
              </AnimatedButton>
            </div>
            
            {/* Search and filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-card-foreground/40 w-4 h-4" />
                <Input
                  placeholder="Search songs, artists, themes, or feelings..."
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
                <option value="">All Themes</option>
                {themes.map(theme => (
                  <option key={theme} value={theme}>{theme}</option>
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
                  <span className="sr-only">Grid view</span>
                </AnimatedButton>
                <AnimatedButton
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className="px-3"
                >
                  <List className="w-4 h-4" />
                  <span className="sr-only">List view</span>
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={handleRandomSong}
                  className="ml-2"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Surprise Me
                </AnimatedButton>
              </div>
            </div>
            
            <p className="text-sm text-card-foreground/60">
              {filteredSongs.length} of {songs.length} songs
            </p>
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
                          <h3 className="line-clamp-1 font-medium text-card-foreground">{song.title}</h3>
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
                            {feeling}
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
                              <h3 className="font-medium text-card-foreground">{song.title}</h3>
                              <span className="text-sm text-card-foreground/70">by {song.artist}</span>
                            </div>
                            <p className="mb-2 text-sm text-card-foreground/60">{song.summary}</p>
                            <div className="flex flex-wrap gap-1">
                              {song.core_feelings.map((feeling, index) => (
                                <span
                                  key={index}
                                  className="rounded-full bg-emotion-bg px-2 py-1 text-xs text-emotion-foreground"
                                >
                                  {feeling}
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
              <div className="text-center py-12">
                <p className="text-card-foreground/60">
                  No songs found matching your search.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </motion.div>
    </MotionIfOkay>
  );
};
