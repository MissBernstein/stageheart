import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AutocompleteSearch } from '@/components/AutocompleteSearch';
import { SongLibrary } from '@/components/SongLibrary';
import { FeelingJourney } from '@/components/FeelingJourney';
import { PerformancePrepTools } from '@/components/PerformancePrepTools';
import { FeelingsCard } from '@/components/FeelingsCard';
import { VibePicker } from '@/components/VibePicker';
import { FavoritesDrawer } from '@/components/FavoritesDrawer';
import { LanguageToggle } from '@/components/LanguageToggle';
import { FeelingMap, Song, Vibe } from '@/types';
import songsData from '@/data/songs.json';
import logo from '@/assets/logo.png';

const Index = () => {
  const { t } = useTranslation();
  const [currentMap, setCurrentMap] = useState<FeelingMap | null>(null);
  const [showVibePicker, setShowVibePicker] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [showPrepTools, setShowPrepTools] = useState(false);
  const [searchQuery, setSearchQuery] = useState({ title: '', artist: '' });
  const [isLoading, setIsLoading] = useState(false);

  const songs: Song[] = songsData;

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

  return (
    <div className="min-h-screen relative">
      {/* Solid background */}
      <div className="fixed inset-0 bg-background" />
      
      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1 flex justify-start">
                <FavoritesDrawer onSelectFavorite={handleSelectFavorite} />
              </div>
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <img src={logo} alt="Stage Heart Logo" className="w-48 h-48 md:w-60 md:h-60" />
                  <h1 className="text-6xl md:text-7xl text-foreground">
                    Stage Heart
                  </h1>
                </div>
                <p className="text-xl text-foreground max-w-2xl mx-auto">
                  {t('app.subtitle')}
                </p>
              </div>
              <div className="flex-1 flex justify-end">
                <LanguageToggle />
              </div>
            </div>
            
            {/* Navigation buttons */}
            {!currentMap && !showVibePicker && !showLibrary && !showJourney && !showPrepTools && (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setShowLibrary(true)}
                  className="px-6 py-2 bg-accent hover:bg-button-secondary-hover text-accent-foreground rounded-full transition-colors text-sm font-medium"
                >
                  📚 {t('navigation.browseLibrary')} ({songs.length} songs)
                </button>
                <button
                  onClick={() => setShowJourney(true)}
                  className="px-6 py-2 bg-primary-soft hover:bg-button-primary-hover text-primary rounded-full transition-colors text-sm font-medium"
                >
                  🧭 {t('navigation.feelingJourney')}
                </button>
                <button
                  onClick={handleRandomSong}
                  className="px-6 py-2 bg-secondary hover:bg-button-secondary-hover text-secondary-foreground rounded-full transition-colors text-sm font-medium"
                >
                  🎲 {t('navigation.surpriseMe')}
                </button>
              </div>
            )}
          </div>

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
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg">
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
              <FeelingsCard feelingMap={currentMap} />
              
              {/* Performance tools button */}
              <div className="text-center">
                <button
                  onClick={() => setShowPrepTools(true)}
                  className="px-6 py-2 bg-accent hover:bg-button-secondary-hover text-accent-foreground rounded-full transition-colors text-sm font-medium"
                >
                  🏋️ Performance Prep Tools
                </button>
              </div>
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
    </div>
  );
};

export default Index;
