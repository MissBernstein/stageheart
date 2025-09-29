import { useState } from 'react';
import { SongForm } from '@/components/SongForm';
import { FeelingsCard } from '@/components/FeelingsCard';
import { VibePicker } from '@/components/VibePicker';
import { FavoritesDrawer } from '@/components/FavoritesDrawer';
import { FeelingMap, Song, Vibe } from '@/types';
import songsData from '@/data/songs.json';

const Index = () => {
  const [currentMap, setCurrentMap] = useState<FeelingMap | null>(null);
  const [showVibePicker, setShowVibePicker] = useState(false);
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
      emotions: vibe.emotions,
      tips: vibe.tips,
      isVibeBasedMap: true,
      vibeLabel: vibe.label
    };
    
    setCurrentMap(vibeBasedMap);
    setShowVibePicker(false);
  };

  const handleSelectFavorite = (feelingMap: FeelingMap) => {
    setCurrentMap(feelingMap);
    setShowVibePicker(false);
  };

  const handleReset = () => {
    setCurrentMap(null);
    setShowVibePicker(false);
    setSearchQuery({ title: '', artist: '' });
  };

  return (
    <div className="min-h-screen relative">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-background/90 via-background/95 to-background/90" />
      
      {/* Favorites drawer */}
      <FavoritesDrawer onSelectFavorite={handleSelectFavorite} />
      
      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Stage Heart
            </h1>
            <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
              Feel the song before you sing it. Get emotional insights and performance tips for any song.
            </p>
          </div>

          {/* Search Form */}
          {!currentMap && !showVibePicker && (
            <SongForm onSearch={searchSong} isLoading={isLoading} />
          )}

          {/* Empty state */}
          {!currentMap && !showVibePicker && !isLoading && (
            <div className="text-center py-8">
              <p className="text-foreground/60 text-lg">
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

          {/* Feelings Card */}
          {currentMap && (
            <FeelingsCard feelingMap={currentMap} />
          )}

          {/* Reset button */}
          {(currentMap || showVibePicker) && (
            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-foreground/60 hover:text-foreground transition-colors text-sm underline underline-offset-4"
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
