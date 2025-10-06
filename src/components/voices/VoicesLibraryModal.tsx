import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Play, X, User2, Heart, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { incrementPlay } from '@/lib/voicesApi';
import { useVoiceFavorites } from '@/hooks/useVoiceFavorites';
import { useToast } from '@/hooks/use-toast';
import voicesIcon from '@/assets/feelingjourneyicon.png';
import { usePlayer } from '@/hooks/usePlayer';
import { Recording } from '@/types/voices';
import { listVoices } from '@/lib/voicesApi';
import { theme } from '@/styles/theme';
import { ModalShell } from './ModalShell';

interface VoicesLibraryModalProps {
  onClose: () => void;
}

export const VoicesLibraryModal: React.FC<VoicesLibraryModalProps> = ({ onClose }) => {
  const { loadRecording, currentRecording, isPlaying, play, pause } = usePlayer();
  const navigate = useNavigate();
  const { favorites, isFavorite, toggleFavorite } = useVoiceFavorites();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMood, setActiveMood] = useState<string | null>(null);

  // Fetch via mock API layer
  useEffect(() => {
    let active = true;
    setLoading(true);
    listVoices({ mood: activeMood || undefined }).then(res => { if (active) setRecordings(res); }).finally(()=> active && setLoading(false));
    return () => { active = false; };
  }, [activeMood]);

  const filtered = useMemo(() => {
    let recs = recordings;
    if (searchQuery) {
      recs = recs.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.user_profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return recs;
  }, [recordings, searchQuery]);

  // Focus trap handled by ModalShell now

  return (
    <ModalShell titleId="voices-library-title" onClose={onClose} className="max-w-5xl" contentClassName="">
      <div className="p-6 border-b border-card-border">
              <div className="flex items-center justify-between mb-4">
                <h2 id="voices-library-title" className="text-2xl font-semibold text-card-foreground flex items-center gap-3">
                  <img src={voicesIcon} alt="Voices Icon" className="w-14 h-14 object-contain" />
                  Discover Voices
                </h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
                  <X />
                  <span className="sr-only">Close voices</span>
                </Button>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-card-foreground/40 w-4 h-4" />
                  <Input
                    placeholder="Search voices, moods, creators..."
                    value={searchQuery}
                    onChange={(e)=> setSearchQuery(e.target.value)}
                    className="pl-10 bg-input border-input-border"
                  />
                </div>
                <Button variant={showFilters ? 'secondary':'outline'} onClick={() => setShowFilters(v=>!v)}>
                  <Filter className="w-4 h-4 mr-2" /> Filters
                </Button>
              </div>
              <div className="text-sm text-card-foreground/60 flex items-center gap-3 flex-wrap">
                {loading ? <span className="animate-pulse">Loading…</span> : <span>{filtered.length} voice{filtered.length===1?'':'s'}</span>}
                {currentRecording && (
                  <span className="truncate max-w-[200px] text-xs">Now: {currentRecording.title}</span>
                )}
                {!loading && (
                  <div className="flex gap-2 items-center text-xs">
                    {Array.from(new Set(recordings.flatMap(r => r.mood_tags || []))).slice(0,6).map(tag => (
                      <button
                        key={tag}
                        onClick={() => setActiveMood(m => m === tag ? null : tag)}
                        className={`px-2 py-0.5 rounded-full border text-[10px] tracking-wide ${activeMood === tag ? 'bg-primary/60 border-primary text-primary-foreground' : 'bg-input/40 border-input-border text-card-foreground/60 hover:text-card-foreground'}`}
                      >{tag}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
      <div className="p-6 grid gap-4 md:grid-cols-2">
              {filtered.map(r => (
                <div key={r.id} className="rounded-xl border border-card-border/60 bg-card/70 p-4 backdrop-blur-sm hover:bg-card/80 transition group relative">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { toggleFavorite(r.id); }}>
                      <Heart className={`w-3.5 h-3.5 ${isFavorite(r.id) ? 'fill-accent text-accent' : ''}`} />
                      <span className="sr-only">{isFavorite(r.id)?'Unfavorite':'Favorite'}</span>
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard?.writeText(window.location.origin + '/app/voice/' + r.id); toast({ title: 'Link copied', description: 'Voice link copied to clipboard.' }); }}>
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="sr-only">Share</span>
                    </Button>
                  </div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-card-foreground leading-tight truncate">{r.title}</h3>
                      <button
                        onClick={() => navigate(`/app/p/${r.user_id}`)}
                        className="text-xs text-card-foreground/60 truncate inline-flex items-center gap-1 hover:text-card-foreground/90 focus:outline-none focus:ring-1 focus:ring-primary rounded"
                      >
                        <User2 className="w-3 h-3" /> {r.user_profile?.display_name || 'Anonymous'}
                      </button>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => currentRecording?.id === r.id && isPlaying ? pause() : (loadRecording(r), play(), incrementPlay(r.id), r.plays_count += 1)} className="h-9 w-9">
                      {currentRecording?.id === r.id && isPlaying ? <PauseIcon /> : <Play className="w-4 h-4" />}
                      <span className="sr-only">{currentRecording?.id === r.id && isPlaying ? 'Pause' : 'Play'}</span>
                    </Button>
                  </div>
                  {r.mood_tags && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {r.mood_tags.slice(0,4).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-input/40 text-[10px] text-card-foreground/70">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-card-foreground/50">
                    <span>{Math.round((r.duration_sec||0)/60)} min</span>
                    <span>{r.plays_count} plays</span>
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 && (
                <div className="col-span-full text-center text-sm text-card-foreground/60 py-12">No voices match your search.</div>
              )}
      </div>
    </ModalShell>
  );
};

const PauseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
);
