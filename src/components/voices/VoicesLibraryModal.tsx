import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { AnimatedCard } from '@/ui/AnimatedCard';
import { ChipToggle } from '@/ui/ChipToggle';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { Search, Filter, Play, X, User2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { incrementPlay } from '@/lib/voicesApi';
// import { useVoiceFavorites } from '@/hooks/useVoiceFavorites';
// import { useToast } from '@/hooks/use-toast';
import voicesIcon from '@/assets/feelingjourneyicon.png';
import { usePlayer } from '@/hooks/usePlayer';
import { Recording } from '@/types/voices';
import { listVoices } from '@/lib/voicesApi';
import { theme } from '@/styles/theme';
import { ModalShell } from './ModalShell';

interface VoicesLibraryModalProps {
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement>;
}

// Define PauseIcon component before it's used
const PauseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
);

export const VoicesLibraryModal: React.FC<VoicesLibraryModalProps> = ({ onClose, returnFocusRef }) => {
  const { loadRecording, currentRecording, isPlaying, play, pause, currentTime, duration, audioLevel } = usePlayer() as any;
  const navigate = useNavigate();
  // Discovery mode: hide favorite/share until reveal; keep hooks removed for now

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMood, setActiveMood] = useState<string | null>(null);
  const [mysteryQueue, setMysteryQueue] = useState<Recording[]>([]);
  const [currentMysteryIndex, setCurrentMysteryIndex] = useState(0);
  const [revealed, setRevealed] = useState(false); // whether current voice identity/options shown
  const [offerReveal, setOfferReveal] = useState(false); // mid/end overlay
  const prefersReducedMotion = usePrefersReducedMotion();
  const [autoSkipProgress, setAutoSkipProgress] = useState(0); // 0-1 countdown after end
  const autoSkipRaf = useRef<number | null>(null);
  const countdownStartRef = useRef<number | null>(null);
  const preloadSet = useRef<Set<string>>(new Set());

  const AUTO_SKIP_DELAY = 3000; // ms

  const stopAutoSkip = () => {
    if (autoSkipRaf.current) cancelAnimationFrame(autoSkipRaf.current);
    autoSkipRaf.current = null;
    countdownStartRef.current = null;
    setAutoSkipProgress(0);
  };

  const startAutoSkip = () => {
    if (autoSkipRaf.current) return;
    countdownStartRef.current = performance.now();
    const tick = (ts: number) => {
      if (!countdownStartRef.current) return;
      const elapsed = ts - countdownStartRef.current;
      const p = Math.min(1, elapsed / AUTO_SKIP_DELAY);
      setAutoSkipProgress(p);
      if (p >= 1) {
        stopAutoSkip();
        nextMystery();
        return;
      }
      autoSkipRaf.current = requestAnimationFrame(tick);
    };
    autoSkipRaf.current = requestAnimationFrame(tick);
  };

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

  // Build or refresh the mystery queue when recordings load or filter changes
  useEffect(() => {
    if (!loading) {
      const playable = filtered.filter(r => (r.file_stream_url || r.file_original_url));
      if (playable.length) {
        setMysteryQueue(playable.slice(0, 25));
        setCurrentMysteryIndex(prev => prev < playable.length ? prev : 0);
      } else {
        setMysteryQueue([]);
        setCurrentMysteryIndex(0);
      }
      setRevealed(false);
      setOfferReveal(false);
    }
  }, [filtered, loading]);

  // Auto-load the current mystery recording
  useEffect(() => {
    const target = mysteryQueue[currentMysteryIndex];
    if (target) {
      const hasSrc = !!(target.file_stream_url || target.file_original_url);
      if (hasSrc) {
        loadRecording(target);
        setTimeout(() => { play(); }, 50);
      }
      setRevealed(false);
      setOfferReveal(false);
      stopAutoSkip();
    }
  }, [currentMysteryIndex, mysteryQueue, loadRecording, play]);

  // Preload next mystery audio for seamless transitions
  useEffect(() => {
    if (!mysteryQueue.length) return;
    const next = mysteryQueue[(currentMysteryIndex + 1) % mysteryQueue.length];
    if (!next) return;
    if (preloadSet.current.has(next.id)) return;
    const url = next.file_stream_url || next.file_original_url;
    if (!url) return;
    try {
      const a = new Audio();
      a.preload = 'auto';
      a.src = url;
      a.load();
      preloadSet.current.add(next.id);
    } catch {}
  }, [currentMysteryIndex, mysteryQueue]);

  // Mid / end trigger for reveal offer
  // Midpoint reveal offer trigger
  useEffect(() => {
    if (!currentRecording || revealed || offerReveal) return;
    if (currentRecording.id !== mysteryQueue[currentMysteryIndex]?.id) return;
    if (duration > 10 && currentTime / duration >= 0.5) {
      setOfferReveal(true);
    }
  }, [currentRecording, currentTime, duration, revealed, offerReveal, currentMysteryIndex, mysteryQueue]);

  // End-of-playback handling: auto offer + countdown ring leading to skip
  useEffect(() => {
    const isCurrent = currentRecording?.id === mysteryQueue[currentMysteryIndex]?.id;
    const ended = isCurrent && duration > 0 && currentTime >= duration - 0.25;
    if (!isCurrent) {
      stopAutoSkip();
      return;
    }
    if (ended && !revealed) {
      if (!offerReveal) setOfferReveal(true);
      startAutoSkip();
    } else {
      stopAutoSkip();
    }
  }, [currentRecording, currentTime, duration, revealed, offerReveal, currentMysteryIndex, mysteryQueue]);

  // If playback ends (player moves to next), automatically advance mystery index
  useEffect(() => {
    // sync with player queue skip: if player advanced away from our current id, update index
    if (!currentRecording || !mysteryQueue.length) return;
    const idx = mysteryQueue.findIndex(r => r.id === currentRecording.id);
    if (idx !== -1 && idx !== currentMysteryIndex) {
      setCurrentMysteryIndex(idx);
      setRevealed(false);
      setOfferReveal(false);
    }
  }, [currentRecording, mysteryQueue, currentMysteryIndex]);

  const currentMystery = mysteryQueue[currentMysteryIndex];

  const nextMystery = () => {
    setCurrentMysteryIndex(i => {
      const len = mysteryQueue.length || 1;
      return (i + 1) % len;
    });
    setRevealed(false);
    setOfferReveal(false);
  };

  const revealVoice = () => {
    setRevealed(true);
  };

  // Focus trap handled by ModalShell now

  return (
  <ModalShell titleId="voices-library-title" onClose={onClose} className="max-w-5xl" contentClassName="" returnFocusRef={returnFocusRef}>
      <div className="p-6 border-b border-card-border">
              <div className="flex items-center justify-between mb-4">
                <h2 id="voices-library-title" className="text-2xl font-semibold text-card-foreground flex items-center gap-3">
                  <img src={voicesIcon} alt="Voices Icon" className="w-14 h-14 object-contain" />
                  Discover Voices
                </h2>
                <AnimatedButton variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
                  <X />
                  <span className="sr-only">Close voices</span>
                </AnimatedButton>
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
                <AnimatedButton variant={showFilters ? 'secondary':'outline'} onClick={() => setShowFilters(v=>!v)}>
                  <Filter className="w-4 h-4 mr-2" /> Filters
                </AnimatedButton>
              </div>
              <div className="text-sm text-card-foreground/60 flex items-center gap-3 flex-wrap">
                {loading ? <span className="animate-pulse">Loading…</span> : <span>{filtered.length} voice{filtered.length===1?'':'s'}</span>}
                {currentRecording && (
                  <span className="truncate max-w-[200px] text-xs">Now: {currentRecording.title}</span>
                )}
                {!loading && (
                  <div className="flex gap-2 items-center text-xs">
                    {Array.from(new Set(recordings.flatMap(r => r.mood_tags || []))).slice(0,6).map(tag => (
                      <ChipToggle
                        key={tag}
                        isActive={activeMood === tag}
                        onClick={() => setActiveMood(m => m === tag ? null : tag)}
                        className="!py-1 !px-3 text-[10px]"
                      >{tag}</ChipToggle>
                    ))}
                  </div>
                )}
              </div>
            </div>
      <div className="p-6">
        {loading && <div className="text-sm text-card-foreground/60">Loading mysterious voices…</div>}
        {!loading && !currentMystery && <div className="text-sm text-card-foreground/60">No voices match your search.</div>}
        <AnimatePresence initial={false} mode="wait">
        {currentMystery && (
          <motion.div key={currentMystery.id} className="relative max-w-2xl mx-auto"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22,0.72,0.28,0.99] }}
          >
            <AnimatedCard className="relative border border-card-border/60 bg-card/70 p-6 backdrop-blur-sm overflow-hidden">
              {/* Sound reactive glow */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ background: 'radial-gradient(circle at 30% 20%, rgba(var(--primary-rgb),0.15), transparent 70%)' }}
                animate={prefersReducedMotion ? undefined : { opacity: 0.3 + (audioLevel||0)*0.6 }}
                transition={{ duration: 0.2 }}
              />
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-lg tracking-tight">{currentMystery.title}</h3>
                {(() => {
                  const playable = !!(currentMystery.file_stream_url || currentMystery.file_original_url);
                  return (
                    <div className="relative">
                      {/* Countdown ring */}
                      {autoSkipProgress > 0 && !revealed && (
                        <svg className="absolute -inset-1.5 h-[54px] w-[54px]" viewBox="0 0 60 60" aria-hidden>
                          <circle cx="30" cy="30" r="26" stroke="var(--border)" strokeWidth="2" fill="none" opacity="0.25" />
                          <motion.circle
                            cx="30" cy="30" r="26" fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 26}
                            strokeDashoffset={(1 - autoSkipProgress) * 2 * Math.PI * 26}
                            animate={{ strokeDashoffset: (1 - autoSkipProgress) * 2 * Math.PI * 26 }}
                            transition={{ type: 'tween', duration: 0.1 }}
                          />
                        </svg>
                      )}
                      <motion.div
                        animate={prefersReducedMotion || !playable || currentRecording?.id !== currentMystery.id || !isPlaying ? { scale: 1 } : { scale: 1 + Math.min(0.05, 0.02 + (audioLevel || 0) * 0.05) }}
                        transition={{ duration: 0.25 }}
                      >
                        <AnimatedButton
                          size="icon"
                          variant="ghost"
                          disabled={!playable}
                          onClick={() => {
                            if (!playable) return;
                            if (currentRecording?.id === currentMystery.id && isPlaying) {
                              pause();
                            } else {
                              loadRecording(currentMystery);
                              play();
                              incrementPlay(currentMystery.id);
                              currentMystery.plays_count += 1;
                            }
                          }}
                          className="h-11 w-11"
                        >
                          {currentRecording?.id === currentMystery.id && isPlaying ? <PauseIcon /> : <Play className="w-5 h-5" />}
                          <span className="sr-only">{currentRecording?.id === currentMystery.id && isPlaying ? 'Pause' : 'Play'}</span>
                        </AnimatedButton>
                      </motion.div>
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-4 text-sm text-card-foreground/70">
                <p className="text-xs uppercase tracking-wide text-card-foreground/40">Mysterious Voice #{currentMysteryIndex+1}</p>
                {currentMystery.mood_tags && (
                  <motion.div className="flex flex-wrap gap-1"
                    initial={prefersReducedMotion ? false : 'hidden'}
                    animate={prefersReducedMotion ? {} : 'show'}
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 }}}}
                  >
                    {currentMystery.mood_tags.slice(0,5).map(tag => (
                      <motion.span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-input/40 text-[10px] text-card-foreground/70"
                        whileHover={{ y: -2, scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        variants={{ hidden: { opacity:0, y:4 }, show:{ opacity:1, y:0 } }}
                        transition={{ duration: 0.18 }}
                      >{tag}</motion.span>
                    ))}
                  </motion.div>
                )}
                <div className="flex items-center justify-between text-[11px] text-card-foreground/50">
                  <span>{Math.round((currentMystery.duration_sec||0)/60)} min</span>
                  <span>{currentMystery.plays_count} plays</span>
                </div>
                {/* Progress bar */}
                {currentRecording?.id === currentMystery.id && duration > 0 && (
                  <div className="mt-4 h-2 w-full rounded-full bg-input/40 overflow-hidden relative">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"
                      animate={prefersReducedMotion ? undefined : { x: ['-30%','130%'] }}
                      transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
                      style={{ opacity: 0.18 }}
                    />
                    <motion.div
                      className="relative h-full bg-primary"
                      animate={{ width: `${Math.min(100, (currentTime / duration)*100)}%` }}
                      transition={{ type: 'tween', duration: 0.25 }}
                      style={{ filter: `brightness(${1 + (audioLevel||0)*0.4})` }}
                    />
                  </div>
                )}
                {!currentMystery.file_stream_url && !currentMystery.file_original_url && (
                  <p className="text-[11px] text-destructive/70">Audio not ready / unsupported format. Skipping will find another.</p>
                )}
              </div>
            </AnimatedCard>
            {!revealed && (
              <AnimatePresence initial={false}>
                <motion.div className="mt-6 flex justify-center"
                  key={offerReveal ? 'toggle-open' : 'toggle-closed'}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? {} : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  <AnimatedButton variant="outline" size="sm" onClick={() => setOfferReveal(o=>!o)} className="text-xs">{offerReveal ? 'Hide options' : 'Who is this voice?'}</AnimatedButton>
                </motion.div>
              </AnimatePresence>
            )}
            <AnimatePresence>
            {offerReveal && !revealed && (
              <motion.div
                key="offer-panel"
                className="mt-6 rounded-xl border border-primary/30 bg-primary/10 p-4 flex flex-col gap-3"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <p className="text-sm text-card-foreground/80">Curious? Meet the singer behind this voice or skip to the next mysterious recording.</p>
                <div className="flex flex-wrap gap-3">
                  <AnimatedButton size="sm" onClick={revealVoice} className="text-xs">Meet the Voice</AnimatedButton>
                  <AnimatedButton size="sm" variant="secondary" onClick={nextMystery} className="text-xs">No, next voice</AnimatedButton>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
            <AnimatePresence>
            {revealed && (
              <motion.div
                key="revealed-panel"
                className="mt-8 rounded-xl border border-accent/30 bg-accent/10 p-6 space-y-4"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
                animate={prefersReducedMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.28, ease: [0.22,0.72,0.28,0.99] }}
              >
                <div className="flex items-center gap-3">
                  <User2 className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium">{currentMystery.user_profile?.display_name || 'Anonymous'}</p>
                    <p className="text-[11px] text-card-foreground/60">Singer revealed • You can view their profile now.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <AnimatedButton size="sm" onClick={() => navigate(`/app/p/${currentMystery.user_id}`)} className="text-xs">Open Profile</AnimatedButton>
                  <AnimatedButton size="sm" variant="outline" onClick={nextMystery} className="text-xs">Discover Another Voice</AnimatedButton>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </ModalShell>
  );
};
