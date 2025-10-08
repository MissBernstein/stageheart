// Main discovery page for voice recordings
import React, { useState, useEffect } from 'react';
import { Search, Filter, Play, Heart, Share2 } from 'lucide-react';
import messagesIcon from '../assets/messagesicon.png';
import voicesIcon from '../assets/feelingjourneyicon.png';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/Toast';
import { usePlayer } from '../hooks/usePlayer';
import { Recording } from '../types/voices';

export const VoicesPage: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const { addToast } = useToast();
  const { loadRecording, currentRecording, isPlaying } = usePlayer();

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2,'0')}`;
  };

  useEffect(()=> {
    // TODO replace with real API call
    const load = async () => {
      setIsLoading(true);
      try {
        const mock: Recording[] = [];
        setRecordings(mock);
        setFilteredRecordings(mock);
      } catch (e:any) {
        addToast({ type:'error', title:'Error loading recordings', description:'Please try again later.' });
      } finally { setIsLoading(false); }
    };
    load();
  }, [addToast]);

  useEffect(()=> {
    let filtered = recordings;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(q) || r.user_profile?.display_name?.toLowerCase().includes(q) || r.mood_tags?.some(tag => tag.toLowerCase().includes(q)));
    }
    if (selectedMoods.length) {
      filtered = filtered.filter(r => r.mood_tags?.some(tag => selectedMoods.includes(tag)));
    }
    setFilteredRecordings(filtered);
  }, [recordings, searchQuery, selectedMoods]);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-base text-muted-foreground">Loading voices...</div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-[env(safe-area-inset-top)] pb-10 pb-[env(safe-area-inset-bottom)] overscroll-contain">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-3 mb-4 flex-col sm:flex-row sm:items-center">
          <img src={voicesIcon} alt="Voices" className="w-10 h-10 object-contain drop-shadow-sm" />
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground break-words hyphens-auto">Discover Voices</h1>
            <p className="text-sm text-muted-foreground leading-snug">Listen to authentic voice recordings and connect with their creators</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              placeholder="Search voices, moods, or creators..."
              value={searchQuery}
              onChange={(e)=> setSearchQuery(e.target.value)}
              className="pl-9 h-11 text-sm"
              aria-label="Search voices"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-11 gap-2" aria-pressed={showFilters} aria-label="Toggle filters">
            <Filter size={16} />
            <span className="text-sm">Filters</span>
          </Button>
        </div>
        {showFilters && (
          <div className="mt-4 p-4 rounded-lg border bg-card/50 backdrop-blur-sm text-sm">{/* placeholder for filters */}Filters panel coming soon…</div>
        )}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredRecordings.map((recording) => (
          <div
            key={recording.id}
            className="group flex flex-col rounded-xl border bg-card shadow-sm hover:shadow-md transition focus-within:ring-2 focus-within:ring-primary/50 min-w-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 pt-4">
              <h3 className="text-base font-semibold text-foreground leading-tight break-words hyphens-auto flex-1 min-w-0 truncate" title={recording.title}>{recording.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadRecording(recording)}
                aria-label={currentRecording?.id === recording.id && isPlaying ? 'Pause recording' : 'Play recording'}
                aria-pressed={currentRecording?.id === recording.id && isPlaying}
                className={`h-11 w-11 rounded-full p-0 flex items-center justify-center ${currentRecording?.id === recording.id && isPlaying ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Play size={18} />
              </Button>
            </div>

            {/* Creator */}
            <div className="flex items-center gap-3 px-4 mt-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground flex-shrink-0">
                {recording.user_profile?.display_name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{recording.user_profile?.display_name || 'Anonymous'}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{formatDuration(recording.duration_sec)}</div>
              </div>
            </div>

            {/* Tags */}
            {recording.mood_tags && recording.mood_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 mt-4">
                {recording.mood_tags.slice(0,3).map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-[11px] text-muted-foreground font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer / Actions */}
            <div className="mt-4 px-4 py-3 border-t flex items-center justify-between text-xs text-muted-foreground gap-3">
              <span className="whitespace-nowrap">{recording.plays_count} plays</span>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" aria-label="Like" className="h-10 w-10 p-0"><Heart size={16} /></Button>
                <Button variant="ghost" size="sm" aria-label="Messages" className="h-10 w-10 p-0"><img src={messagesIcon} alt="Messages" className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" aria-label="Share" className="h-10 w-10 p-0"><Share2 size={16} /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRecordings.length === 0 && !isLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-base font-medium">
            {searchQuery || selectedMoods.length > 0 ? 'No voices found matching your search.' : 'No voice recordings available yet.'}
          </p>
        </div>
      )}
    </div>
  );
};