import { useState } from 'react';
import { Search, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SongFormProps {
  onSearch: (title: string, artist: string) => void;
  isLoading?: boolean;
}

export const SongForm = ({ onSearch, isLoading }: SongFormProps) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSearch(title.trim(), artist.trim());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card rounded-3xl p-8 shadow-card border border-card-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary-soft rounded-2xl">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-card-foreground">
                Song Feelings Map
              </h2>
              <p className="text-sm text-muted-foreground">
                feel the song before you sing it
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-card-foreground mb-2">
                Song Title
              </label>
              <Input
                id="title"
                type="text"
                placeholder="Enter a song title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 text-lg bg-input border-input-border focus:border-input-focus transition-colors"
                required
              />
            </div>
            
            <div>
              <label htmlFor="artist" className="block text-sm font-medium text-card-foreground mb-2">
                Artist <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="artist"
                type="text"
                placeholder="Enter artist name..."
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
                Mapping feelings...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Generate Feeling Map
              </div>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};