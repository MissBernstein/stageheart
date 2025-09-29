import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Song } from '@/types';
import songsData from '@/data/songs.json';

interface AutocompleteSearchProps {
  onSearch: (title: string, artist: string) => void;
  onSelectSong: (song: Song) => void;
  isLoading?: boolean;
}

export const AutocompleteSearch = ({ onSearch, onSelectSong, isLoading }: AutocompleteSearchProps) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const songs: Song[] = songsData;

  const searchSongs = (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const normalizeString = (str: string) => str.toLowerCase().trim();
    const queryNorm = normalizeString(query);

    const matches = songs.filter(song => {
      const titleMatch = normalizeString(song.title).includes(queryNorm);
      const artistMatch = normalizeString(song.artist).includes(queryNorm);
      const themeMatch = normalizeString(song.theme).includes(queryNorm);
      const feelingsMatch = song.core_feelings.some(feeling => 
        normalizeString(feeling).includes(queryNorm)
      );
      
      return titleMatch || artistMatch || themeMatch || feelingsMatch;
    }).slice(0, 5); // Limit to 5 suggestions

    setSuggestions(matches);
  };

  useEffect(() => {
    searchSongs(title);
  }, [title]);

  const handleInputChange = (value: string) => {
    setTitle(value);
    setShowSuggestions(true);
    setActiveSuggestion(-1);
  };

  const handleSuggestionClick = (song: Song) => {
    setTitle(song.title);
    setArtist(song.artist);
    setShowSuggestions(false);
    setSuggestions([]);
    onSelectSong(song);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      setShowSuggestions(false);
      onSearch(title.trim(), artist.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        if (activeSuggestion >= 0) {
          e.preventDefault();
          handleSuggestionClick(suggestions[activeSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        break;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card/80 backdrop-blur-sm rounded-3xl p-8 shadow-card border border-card-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-card-foreground">
                {t('search.searchSong')}
              </h2>
              <p className="text-sm text-card-foreground/70">
                {t('app.subtitle')}
              </p>
            </div>
          </div>
          
          <div className="space-y-4 relative">
            <div className="relative">
              <label htmlFor="title" className="block text-sm font-medium text-card-foreground/80 mb-2">
                {t('search.title')}
              </label>
              <Input
                ref={inputRef}
                id="title"
                type="text"
                placeholder={t('search.searchPlaceholder')}
                value={title}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => title && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={handleKeyDown}
                className="h-12 text-lg bg-input border-input-border focus:border-input-focus transition-colors"
                required
              />
              
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-card border border-card-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto"
                >
                  {suggestions.map((song, index) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => handleSuggestionClick(song)}
                      className={`w-full text-left p-4 border-b border-card-border last:border-b-0 hover:bg-accent/50 transition-colors ${
                        index === activeSuggestion ? 'bg-accent/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{song.visual.split(' ')[0]}</span>
                        <div>
                          <div className="font-medium text-card-foreground">
                            {song.title}
                          </div>
                          <div className="text-sm text-card-foreground/70">
                            {song.artist}
                          </div>
                          <div className="text-xs text-card-foreground/50 mt-1">
                            {song.theme}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="artist" className="block text-sm font-medium text-card-foreground/80 mb-2">
                {t('search.artist')} <span className="text-card-foreground/50">(optional)</span>
              </label>
              <Input
                id="artist"
                type="text"
                placeholder={t('search.artistPlaceholder')}
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="h-12 text-lg bg-input border-input-border focus:border-input-focus transition-colors"
              />
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={!title.trim() || isLoading}
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary-hover text-primary-foreground rounded-2xl transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {t('search.searching')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                {t('search.search')}
              </div>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};