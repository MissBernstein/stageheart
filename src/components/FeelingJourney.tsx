import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import { Song } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import feelingJourneyIcon from '@/assets/feelingjourneyicon.png';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { motionDur, motionEase } from '@/ui/motion';
import { useNavigate } from 'react-router-dom';

interface FeelingJourneyProps {
  onSelectSong: (song: Song) => void;
  onClose: () => void;
  songs: Song[];
}

export const FeelingJourney = ({ onSelectSong, onClose, songs }: FeelingJourneyProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');
  const [context, setContext] = useState('');
  const [recommendation, setRecommendation] = useState<any>(null); // { recommendedSong, candidates? }
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [missingTitle, setMissingTitle] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const prefersReducedMotion = usePrefersReducedMotion();
  const hoverLift = prefersReducedMotion ? undefined : { y: -2, scale: 1.02 };
  const navigate = useNavigate();
  const CACHE_KEY = 'feelingJourney:lastRecommendation';
  const MAX_CANDIDATES = 3;

  const moodOptions = [
    { id: 'peaceful', labelKey: 'journey.moods.peaceful', icon: '🕯️' },
    { id: 'joyful', labelKey: 'journey.moods.joyful', icon: '🎉' },
    { id: 'melancholy', labelKey: 'journey.moods.melancholy', icon: '🌅' },
    { id: 'energetic', labelKey: 'journey.moods.energetic', icon: '🔥' },
    { id: 'romantic', labelKey: 'journey.moods.romantic', icon: '💘' },
    { id: 'spiritual', labelKey: 'journey.moods.spiritual', icon: '✨' }
  ];

  const energyOptions = [
    { id: 'low', labelKey: 'journey.energyLevels.low', icon: '🌙' },
    { id: 'medium', labelKey: 'journey.energyLevels.medium', icon: '☀️' },
    { id: 'high', labelKey: 'journey.energyLevels.high', icon: '⚡' }
  ];

  const contextOptions = [
    { id: 'practice', labelKey: 'journey.contexts.practice', icon: '📝' },
    { id: 'performance', labelKey: 'journey.contexts.performance', icon: '🎤' },
    { id: 'personal', labelKey: 'journey.contexts.personal', icon: '💭' },
    { id: 'social', labelKey: 'journey.contexts.social', icon: '👥' },
    { id: 'worship', labelKey: 'journey.contexts.worship', icon: '✨' }
  ];

  const getRecommendation = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('feeling-journey', {
        body: { mood, energy, context, type: 'journey' }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "AI Service Error",
          description: data.error,
          variant: "error",
        });
        return;
      }

      // Normalize legacy single result vs new multi-candidate shape
      let recObj: any;
      if (data && Array.isArray(data.candidates) && data.candidates.length) {
        const cleaned = data.candidates
          .filter((c: any) => c && typeof c.title === 'string' && c.title.trim().length > 0)
          .slice(0, MAX_CANDIDATES);
        // Ensure we have at least one candidate; if not fall back using recommendedSong
        if (!cleaned.length && data.recommendedSong) {
          cleaned.push({
            title: data.recommendedSong,
            reason: data.reason,
            emotionalJourney: data.emotionalJourney,
            performanceTips: data.performanceTips
          });
        }
        recObj = { ...data, candidates: cleaned };
      } else {
        // Wrap single response as first candidate for unified UI
        recObj = {
          recommendedSong: data?.recommendedSong,
            candidates: [{
              title: data?.recommendedSong,
              reason: data?.reason,
              emotionalJourney: data?.emotionalJourney,
              performanceTips: data?.performanceTips
            }]
        };
      }
      setRecommendation(recObj);
      setSelectedCandidateIndex(0);
      // Cache last recommendation locally for quick return without re-calling function
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            timestamp: Date.now(),
            mood,
            energy,
            context,
            recommendation: recObj,
            selectedCandidateIndex: 0
          })
        );
      } catch { /* ignore quota / SSR issues */ }
      setStep(4);
    } catch (error) {
      console.error('Error getting recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to get song recommendation. Please try again.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fuzzyFindSong = (title: string) => {
    if (!title) return undefined;
    const normalized = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    // Exact title
    let match = songs.find(s => s.title === title);
    if (match) return match;
    // Case-insensitive
    match = songs.find(s => s.title.toLowerCase() === title.toLowerCase());
    if (match) return match;
    const normTitle = normalized(title);
    // Normalized equality
    match = songs.find(s => normalized(s.title) === normTitle);
    if (match) return match;
    // Starts with or includes
    match = songs.find(s => normalized(s.title).startsWith(normTitle) || normTitle.startsWith(normalized(s.title)));
    if (match) return match;
    // Token overlap heuristic
    const tokens = new Set(normTitle.split(' '));
    let best: { song: any; score: number } | null = null;
    for (const s of songs) {
      const sTokens = new Set(normalized(s.title).split(' '));
      let overlap = 0; tokens.forEach(t => { if (sTokens.has(t)) overlap++; });
      const score = overlap / Math.max(1, sTokens.size);
      if (!best || score > best.score) best = { song: s, score };
    }
    if (best && best.score >= 0.5) return best.song; // threshold
    return undefined;
  };

  const handleSelectRecommendedSong = () => {
    if (!recommendation) return;
    const candidate = recommendation.candidates?.[selectedCandidateIndex];
    const title = candidate?.title || recommendation.recommendedSong;
    const song = fuzzyFindSong(title);
    if (song) {
      onSelectSong(song);
      setMissingTitle(null);
    } else {
      setMissingTitle(title);
      toast({
        title: "Song not found locally",
        description: `"${title}" might have just been submitted. You can refresh and retry.`,
        variant: "default",
      });
    }
  };

  const refreshAndRetry = async () => {
    if (!missingTitle) return;
    setRefreshing(true);
    try {
      // Lightweight direct fetch (mirrors useAllSongs shape) WITHOUT updating parent state; only for retry.
      const { data, error } = await supabase
        .from('songs')
        .select('id,slug,title,artist,created_at,feeling_cards ( summary, theme, core_feelings, access_ideas, visual, created_at )')
        .limit(5) // micro-optimization: attempt targeted match by title filter below if available later
        ;
      if (error) throw error;
      if (data && Array.isArray(data)) {
        // Try wider fetch if not found in small sample
        let pool = data;
        const matchDirect = pool.find(r => r.title === missingTitle) || pool.find(r => r.title.toLowerCase() === missingTitle.toLowerCase());
        if (!matchDirect) {
          const { data: moreData, error: moreErr } = await supabase
            .from('songs')
            .select('id,slug,title,artist,created_at,feeling_cards ( summary, theme, core_feelings, access_ideas, visual, created_at )')
            .limit(300);
          if (!moreErr && moreData) pool = moreData;
        }
        // Map to Song shape & fuzzy match
        const mapped = (pool as any[]).map(r => {
          const fcRaw = (r as any).feeling_cards;
          const fc = Array.isArray(fcRaw) ? fcRaw[0] : fcRaw;
          return {
            id: r.id,
            slug: (r as any).slug || undefined,
            title: r.title,
            artist: r.artist,
            summary: fc?.summary || '',
            theme: fc?.theme || 'Unknown',
            core_feelings: Array.isArray(fc?.core_feelings) ? fc.core_feelings : [],
            access_ideas: Array.isArray(fc?.access_ideas) ? fc.access_ideas : [],
            visual: (typeof fc?.visual === 'string' && fc.visual) ? fc.visual : '🎵',
            theme_detail: undefined,
            created_at: fc?.created_at || r.created_at,
            isRemote: true,
          } as Song;
        });
        const normalized = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
        let found = mapped.find(s => s.title === missingTitle) ||
          mapped.find(s => s.title.toLowerCase() === missingTitle.toLowerCase()) ||
          mapped.find(s => normalized(s.title) === normalized(missingTitle));
        if (!found) {
          found = mapped.find(s => normalized(s.title).includes(normalized(missingTitle)) || normalized(missingTitle).includes(normalized(s.title)));
        }
        if (found) {
          onSelectSong(found);
          setMissingTitle(null);
          toast({ title: 'Song found', description: 'Just refreshed and located the recommended song.' });
          return;
        }
      }
  toast({ title: 'Still not found', description: 'Song not yet in catalog. Try again later or pick another candidate.', variant: 'default' });
    } catch (e: any) {
      toast({ title: 'Refresh failed', description: e.message || 'Network error', variant: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const reset = () => {
    setStep(1);
    setMood('');
    setEnergy('');
    setContext('');
    setRecommendation(null);
    setSelectedCandidateIndex(0);
    setMissingTitle(null);
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  };

  // Attempt to restore cached recommendation on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.recommendation) return;
      // Basic validation: ensure recommendation has candidates
      if (Array.isArray(parsed.recommendation.candidates) && parsed.recommendation.candidates.length) {
        setMood(parsed.mood || '');
        setEnergy(parsed.energy || '');
        setContext(parsed.context || '');
        setRecommendation(parsed.recommendation);
        setSelectedCandidateIndex(Math.min(parsed.selectedCandidateIndex || 0, parsed.recommendation.candidates.length - 1));
        setStep(4);
      }
    } catch {/* ignore parse errors */}
  }, []);

  // lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[999] overflow-y-auto min-h-screen w-screen bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/');
                  }}
                  className="flex items-center gap-3 group"
                >
                  <img
                    src={feelingJourneyIcon}
                    alt="Feeling journey icon"
                    className="w-10 h-10 object-contain transition-transform duration-200 group-hover:scale-105"
                  />
                  <span>{t('journey.title')}</span>
                </button>
              </CardTitle>
              <button
                onClick={onClose}
                className="text-card-foreground/60 hover:text-card-foreground transition-colors text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-card-foreground/70">{t('journey.subtitle')}</p>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i <= step ? 'bg-primary' : 'bg-card-accent/30'
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Mood */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-medium mb-4">{t('journey.mood')}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {moodOptions.map((option) => {
                    const isActive = mood === option.id;
                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        onClick={() => setMood(option.id)}
                        whileHover={hoverLift}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                        transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
                        className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-primary-soft text-primary-foreground'
                            : 'border-card-border/70 bg-card/70 hover:border-primary'
                        }`}
                      >
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-medium">{t(option.labelKey)}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <AnimatedButton
                  onClick={() => setStep(2)}
                  disabled={!mood}
                  className="flex w-full items-center justify-center gap-2"
                >
                  {t('journey.next')} <ArrowRight className="w-4 h-4" />
                </AnimatedButton>
              </div>
            )}

            {/* Step 2: Energy */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-medium mb-4">{t('journey.energy')}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {energyOptions.map((option) => {
                    const isActive = energy === option.id;
                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        onClick={() => setEnergy(option.id)}
                        whileHover={hoverLift}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                        transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
                        className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-primary-soft text-primary-foreground'
                            : 'border-card-border/70 bg-card/70 hover:border-primary'
                        }`}
                      >
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-medium">{t(option.labelKey)}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <AnimatedButton variant="outline" onClick={() => setStep(1)} className="flex-1">
                    {t('journey.back')}
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => setStep(3)}
                    disabled={!energy}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    {t('journey.next')} <ArrowRight className="w-4 h-4" />
                  </AnimatedButton>
                </div>
              </div>
            )}

            {/* Step 3: Context */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-medium mb-4">{t('journey.context')}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {contextOptions.map((option) => {
                    const isActive = context === option.id;
                    return (
                      <motion.button
                        key={option.id}
                        type="button"
                        onClick={() => setContext(option.id)}
                        whileHover={hoverLift}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                        transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
                        className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-colors ${
                          isActive
                            ? 'border-primary bg-primary-soft text-primary-foreground'
                            : 'border-card-border/70 bg-card/70 hover:border-primary'
                        }`}
                      >
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-medium">{t(option.labelKey)}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <AnimatedButton variant="outline" onClick={() => setStep(2)} className="flex-1">
                    {t('journey.back')}
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={getRecommendation}
                    disabled={!context || isLoading}
                    isLoading={isLoading}
                    loadingText="Finding your song..."
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    {t('journey.findSong')} <ArrowRight className="w-4 h-4" />
                  </AnimatedButton>
                </div>
              </div>
            )}

            {/* Step 4: Recommendation */}
            {step === 4 && recommendation && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">{t('journey.recommendedSong')}</h3>
                  <p className="text-sm text-card-foreground/60">
                    {recommendation.candidates.length === 1
                      ? 'Top match for your inputs'
                      : `Top ${recommendation.candidates.length} matches ranked for your inputs`}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {recommendation.candidates.map((c: any, i: number) => {
                      const active = i === selectedCandidateIndex;
                      return (
                        <button
                          key={c.title+ i}
                          type="button"
                          onClick={() => setSelectedCandidateIndex(i)}
                          className={`rounded-xl border p-4 text-left transition-all ${active ? 'border-primary bg-primary/10 shadow-sm' : 'border-card-border/70 hover:border-primary'} focus:outline-none focus:ring-2 focus:ring-primary/40`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm font-semibold leading-tight line-clamp-2">{c.title}</span>
                            {i === 0 && <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">#1</span>}
                            {i === 1 && <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">#2</span>}
                            {i === 2 && <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">#3</span>}
                          </div>
                          <p className="text-[11px] text-card-foreground/70 line-clamp-4 mb-2">{c.reason}</p>
                          <p className="text-[10px] text-card-foreground/50 italic line-clamp-3">{c.emotionalJourney}</p>
                        </button>
                      );
                    })}
                  </div>
                  {/* Details for active candidate */}
                  {recommendation.candidates[selectedCandidateIndex] && (
                    <div className="space-y-4 mt-2">
                      <div>
                        <h4 className="font-medium mb-2">{t('journey.performanceTips')}</h4>
                        <ul className="space-y-1">
                          {recommendation.candidates[selectedCandidateIndex].performanceTips?.map((tip: string, index: number) => (
                            <li key={index} className="text-sm text-card-foreground/80 flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <AnimatedButton variant="outline" onClick={reset} className="flex-1">
                    {t('journey.tryAgain')}
                  </AnimatedButton>
                  <AnimatedButton onClick={handleSelectRecommendedSong} className="flex-1">
                    {t('journey.selectSong')}
                  </AnimatedButton>
                  {missingTitle && (
                    <AnimatedButton
                      variant="secondary"
                      onClick={refreshAndRetry}
                      isLoading={refreshing}
                      loadingText="Refreshing..."
                      className="flex-1"
                    >
                      Refresh & Retry
                    </AnimatedButton>
                  )}
                </div>
                {missingTitle && (
                  <div className="text-[11px] text-card-foreground/60 mt-1">
                    We couldn’t find <span className="font-semibold">{missingTitle}</span> locally. If it was just added, a refresh may pull it in.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>,
    document.body
  );
};
