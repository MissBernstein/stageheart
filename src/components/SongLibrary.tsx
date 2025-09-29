import { useState } from 'react';
import { Search, Filter, Shuffle, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Song } from '@/types';
import songsData from '@/data/songs.json';

interface SongLibraryProps {
  onSelectSong: (song: Song) => void;
  onClose: () => void;
}

export const SongLibrary = ({ onSelectSong, onClose }: SongLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const songs: Song[] = songsData;

  // Get unique themes for filtering
  const themes = Array.from(new Set(songs.map(song => {
    // Extract first part of theme before period or comma
    const theme = song.theme.split(/[.,]/)[0].trim();
    return theme;
  }))).sort();

  const filteredSongs = songs.filter(song => {
    const searchMatch = !searchQuery || 
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.core_feelings.some(feeling => 
        feeling.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    const themeMatch = !selectedTheme || 
      song.theme.toLowerCase().includes(selectedTheme.toLowerCase());
    
    return searchMatch && themeMatch;
  });

  const handleRandomSong = () => {
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    onSelectSong(randomSong);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-card rounded-3xl shadow-card border border-card-border max-w-6xl mx-auto">
          {/* Header */}
          <div className="p-6 border-b border-card-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-card-foreground">
                Song Library
              </h2>
              <button
                onClick={onClose}
                className="text-card-foreground/60 hover:text-card-foreground transition-colors text-2xl"
              >
                ×
              </button>
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
                className="px-3 py-2 bg-input border border-input-border rounded-md text-card-foreground"
              >
                <option value="">All Themes</option>
                {themes.map(theme => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
              
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRandomSong}
                  className="ml-2"
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  Surprise Me
                </Button>
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
                {filteredSongs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => onSelectSong(song)}
                    className="text-left p-4 bg-card-accent/30 hover:bg-card-accent/50 rounded-xl border border-card-border transition-all duration-200 hover:scale-[1.02]"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl">{song.visual.split(' ')[0]}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-card-foreground line-clamp-1">
                          {song.title}
                        </h3>
                        <p className="text-sm text-card-foreground/70 line-clamp-1">
                          {song.artist}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-card-foreground/60 mb-2 line-clamp-2">
                      {song.summary}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {song.core_feelings.slice(0, 2).map((feeling, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-emotion-bg text-emotion-foreground rounded-full text-xs"
                        >
                          {feeling}
                        </span>
                      ))}
                      {song.core_feelings.length > 2 && (
                        <span className="px-2 py-1 bg-emotion-bg/50 text-emotion-foreground rounded-full text-xs">
                          +{song.core_feelings.length - 2}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSongs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => onSelectSong(song)}
                    className="w-full text-left p-4 bg-card-accent/30 hover:bg-card-accent/50 rounded-xl border border-card-border transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-xl">{song.visual.split(' ')[0]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-card-foreground">
                            {song.title}
                          </h3>
                          <span className="text-sm text-card-foreground/70">
                            by {song.artist}
                          </span>
                        </div>
                        <p className="text-sm text-card-foreground/60 mb-2">
                          {song.summary}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {song.core_feelings.map((feeling, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-emotion-bg text-emotion-foreground rounded-full text-xs"
                            >
                              {feeling}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
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
    </div>
  );
};