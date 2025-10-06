import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/ui/motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { MotionIfOkay } from '@/ui/MotionIfOkay';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Play, X } from 'lucide-react';
import voicesIcon from '@/assets/feelingjourneyicon.png';
import { usePlayer } from '@/hooks/usePlayer';
import { Recording } from '@/types/voices';
import { theme } from '@/styles/theme';

interface VoicesLibraryModalProps {
  onClose: () => void;
}

export const VoicesLibraryModal: React.FC<VoicesLibraryModalProps> = ({ onClose }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { loadRecording, currentRecording, isPlaying, play, pause } = usePlayer();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock fetch
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRecordings([{
        id: 'demo1', user_id: 'u1', title: 'Morning Reflection', duration_sec: 182, mood_tags:['calm','contemplative'], voice_type:'soft', language:'en', is_signature:true, state:'public', comments_enabled:true, plays_count:42, reports_count:0, moderation_status:'clean', created_at:new Date().toISOString(), updated_at:new Date().toISOString(), user_profile:{ id:'u1', display_name:'Sarah M.', about:'Voice artist and storyteller', fav_genres:['indie'], favorite_artists:['Joni'], groups:[], links:[], contact_visibility:'after_meet', dm_enabled:true, comments_enabled:true, status:'active', created_at:new Date().toISOString(), updated_at:new Date().toISOString() }}]);
      setLoading(false);
    }, 400);
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery) return recordings;
    return recordings.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.user_profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [recordings, searchQuery]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  return createPortal(
    <MotionIfOkay>
      <motion.div
        initial={prefersReducedMotion ? false : fadeInUp.initial}
        animate={prefersReducedMotion ? undefined : fadeInUp.animate}
        exit={prefersReducedMotion ? undefined : fadeInUp.exit}
        className="fixed inset-0 z-[998] overflow-y-auto min-h-screen w-screen bg-background/95 backdrop-blur-sm"
        role="dialog" aria-modal="true" aria-labelledby="voices-library-title"
        ref={containerRef}
      >
        <div className="container mx-auto px-4 py-8">
          <div className="bg-card/95 rounded-3xl shadow-card border border-card-border/70 max-w-5xl mx-auto">
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
              <div className="text-sm text-card-foreground/60 flex items-center gap-3">
                {loading ? <span className="animate-pulse">Loading…</span> : <span>{filtered.length} voice{filtered.length===1?'':'s'}</span>}
                {currentRecording && (
                  <span className="truncate max-w-[200px] text-xs">Now: {currentRecording.title}</span>
                )}
              </div>
            </div>
            <div className="p-6 grid gap-4 md:grid-cols-2">
              {filtered.map(r => (
                <div key={r.id} className="rounded-xl border border-card-border/60 bg-card/70 p-4 backdrop-blur-sm hover:bg-card/80 transition group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-card-foreground leading-tight truncate">{r.title}</h3>
                      <p className="text-xs text-card-foreground/60 truncate">{r.user_profile?.display_name || 'Anonymous'}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => currentRecording?.id === r.id && isPlaying ? pause() : (loadRecording(r), play())} className="h-9 w-9">
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
          </div>
        </div>
      </motion.div>
    </MotionIfOkay>,
    document.body
  );
};

const PauseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
);
