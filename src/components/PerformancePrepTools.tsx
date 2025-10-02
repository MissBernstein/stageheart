import { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Trash2 } from 'lucide-react';
import { Song } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import prepIcon from '@/assets/prepicon.png';
import { ChipToggle } from '@/ui/ChipToggle';
import { AnimatedCard } from '@/ui/AnimatedCard';
import { AnimatedListItem } from '@/ui/AnimatedListItem';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionIfOkay } from '@/ui/MotionIfOkay';
import { fadeInUp, motionDur, motionEase } from '@/ui/motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { useNavigate } from 'react-router-dom';
import {
  generateWarmupPlan,
  WARMUP_VIBE_OPTIONS,
  WARMUP_VIBE_LABELS,
  WarmupVibe,
  VoiceType,
  Technique,
  WarmupRequest,
  WarmupPlan,
  TECHNIQUE_LABELS,
} from '@/lib/warmupGenerator';
import {
  buildSetlist,
  SetlistRequest,
  SetlistResponse,
  SetlistSource,
  SetlistItem,
  getStoredSetlistSource,
  storeSetlistSource,
} from '@/lib/setlistBuilder';
import { WarmupCriteriaPreview } from '@/components/WarmupCriteriaPreview';
import PitchDetectorCard, { MetronomeCard } from '@/components/PitchDetector';
import { Input } from '@/components/ui/input';

const WARMUP_PREF_KEY = 'warmup-preferences';
const WARMUP_LABELS_KEY = 'warmup-custom-labels';
type NonNullVoiceType = Exclude<VoiceType, null>;

const VOICE_OPTIONS: { id: NonNullVoiceType; label: string }[] = [
  { id: 'soprano', label: 'Soprano' },
  { id: 'alto', label: 'Alto' },
  { id: 'tenor', label: 'Tenor' },
  { id: 'bass', label: 'Bass' },
];

const TECHNIQUE_OPTIONS: { id: Technique; label: string }[] = [
  { id: 'belting', label: 'Belting' },
  { id: 'head_voice', label: 'Head Voice' },
];

interface WarmupRecord {
  id: string;
  created_at: string;
  duration: number;
  song_title: string | null;
  song_artist: string | null;
  vibe: string | null;
  physical_warmups: string[];
  vocal_warmups: string[];
  emotional_prep: string[];
  custom_label?: string | null;
  [key: string]: any;
}

const SETLIST_SOURCE_OPTIONS: { id: SetlistSource; label: string; description: string }[] = [
  { id: 'library', label: 'App Library', description: 'Use songs already in Stage Heart.' },
  { id: 'favorites', label: 'My Favorites', description: 'Only your saved favorites.' },
  { id: 'open', label: 'Open', description: 'Include outside suggestions.' },
];

const getStoredWarmupLabels = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WARMUP_LABELS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const persistWarmupLabels = (labels: Record<string, string>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WARMUP_LABELS_KEY, JSON.stringify(labels));
  } catch (error) {
    console.error('Error persisting warmup labels:', error);
  }
};

interface PerformancePrepToolsProps {
  currentSong?: Song;
  onClose: () => void;
  songs: Song[];
}

export const PerformancePrepTools = ({ currentSong, onClose, songs }: PerformancePrepToolsProps) => {
  const [warmupData, setWarmupData] = useState<WarmupPlan | null>(null);
  const [setlistData, setSetlistData] = useState<SetlistResponse | null>(null);
  const [isLoadingWarmup, setIsLoadingWarmup] = useState(false);
  const [isLoadingSetlist, setIsLoadingSetlist] = useState(false);
  const [setlistSongs, setSetlistSongs] = useState<Song[]>([]);
  const [savedWarmups, setSavedWarmups] = useState<WarmupRecord[]>([]);
  const [songCount, setSongCount] = useState(5);
  const [setlistSource, setSetlistSource] = useState<SetlistSource>(getStoredSetlistSource());
  const [selectedVibe, setSelectedVibe] = useState<WarmupVibe | null>(null);
  const [voiceType, setVoiceType] = useState<VoiceType>(null);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const voiceButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastWarmupRequestRef = useRef<WarmupRequest | null>(null);
  const { toast, success, error } = useToast();
  const prefersReducedMotion = usePrefersReducedMotion();
  const hoverLift = prefersReducedMotion ? undefined : { y: -2, scale: 1.01 };
  const [renamingWarmupId, setRenamingWarmupId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedWarmups();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(WARMUP_PREF_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<WarmupRequest>;

      if (parsed.vibe && WARMUP_VIBE_OPTIONS.some(option => option.id === parsed.vibe)) {
        setSelectedVibe(parsed.vibe as WarmupVibe);
      }

      if (parsed.voiceType && VOICE_OPTIONS.some(option => option.id === parsed.voiceType)) {
        setVoiceType(parsed.voiceType as VoiceType);
      }

      if (Array.isArray(parsed.techniques)) {
        const validTechniques = parsed.techniques.filter((tech): tech is Technique =>
          TECHNIQUE_OPTIONS.some(option => option.id === tech)
        );
        setTechniques(validTechniques);
      }
    } catch (error) {
      console.error('Error loading warm-up preferences:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const payload = {
      vibe: selectedVibe,
      voiceType,
      techniques,
    };

    localStorage.setItem(WARMUP_PREF_KEY, JSON.stringify(payload));
  }, [selectedVibe, voiceType, techniques]);

  const selectedVibeLabel = selectedVibe
    ? WARMUP_VIBE_OPTIONS.find(option => option.id === selectedVibe)?.label ?? null
    : null;

  const toggleTechnique = (technique: Technique) => {
    setTechniques(prev => {
      const exists = prev.includes(technique);
      const next = exists ? prev.filter(item => item !== technique) : [...prev, technique];
      return next as Technique[];
    });
    setWarmupData(null);
  };

  const handleSetlistSourceChange = (source: SetlistSource) => {
    setSetlistSource(source);
    storeSetlistSource(source);
    setSetlistData(null);
    setSetlistSongs([]);
  };

  const handleAddExternalToLibrary = (item: SetlistItem) => {
    toast({
      title: 'Add to Library',
      description: `"${item.title}" can be added to your library soon. Stay tuned!`,
    });
  };

  const handleExportWarmupPdf = () => {
    if (!warmupData) {
      error('No warm-up yet', 'Generate a warm-up before exporting.');
      return;
    }

    const request = lastWarmupRequestRef.current;

    const techniqueSummary = (req?: WarmupRequest) =>
      req && req.techniques.length
        ? req.techniques.map(tech => TECHNIQUE_LABELS[tech]).join(', ')
        : 'None';

    const requestSection = request
      ? `
        <section style="margin-bottom:16px;">
          <h2 style="font-size:16px;margin-bottom:6px;">Criteria</h2>
          <ul style="padding-left:18px;margin:0;">
            <li><strong>Vibe:</strong> ${WARMUP_VIBE_LABELS[request.vibe]}</li>
            <li><strong>Voice Type:</strong> ${request.voiceType ? request.voiceType : 'Unspecified'}</li>
            <li><strong>Techniques:</strong> ${techniqueSummary(request)}</li>
          </ul>
        </section>
      `
      : '';

    const buildList = (title: string, items: string[]) => `
      <section style="margin-bottom:16px;">
        <h2 style="font-size:16px;margin-bottom:4px;">${title}</h2>
        <ol style="padding-left:18px;margin:0;">
          ${items.map(item => `<li style="margin-bottom:6px;">${item}</li>`).join('')}
        </ol>
      </section>
    `;

    const html = `
      <html>
        <head>
          <title>Warm-up Routine Export</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 22px; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>AI Warm-up Routine</h1>
          ${requestSection}
          ${buildList('Physical Warm-ups', warmupData.physicalWarmups)}
          ${buildList('Vocal Warm-ups', warmupData.vocalWarmups)}
          ${buildList('Mental Focus', warmupData.emotionalPrep)}
          <p><strong>Total Duration:</strong> ${warmupData.duration} minutes</p>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=900,height=650');
    if (!printWindow) {
      error('Popup blocked', 'Allow popups or use browser print to save as PDF.');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleVoiceKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const { key } = event;
    const lastIndex = VOICE_OPTIONS.length - 1;

    const moveFocus = (targetIndex: number) => {
      const target = VOICE_OPTIONS[targetIndex];
      setVoiceType(target.id);
      setWarmupData(null);
      voiceButtonRefs.current[targetIndex]?.focus();
    };

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = index === lastIndex ? 0 : index + 1;
      moveFocus(nextIndex);
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = index === 0 ? lastIndex : index - 1;
      moveFocus(prevIndex);
    } else if (key === 'Home') {
      event.preventDefault();
      moveFocus(0);
    } else if (key === 'End') {
      event.preventDefault();
      moveFocus(lastIndex);
    } else if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault();
      setVoiceType(null);
      setWarmupData(null);
    }
  };

  const loadSavedWarmups = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_warmups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const labels = getStoredWarmupLabels();
      const mapped: WarmupRecord[] = (data as WarmupRecord[] | null)?.map((warmup) => ({
        ...warmup,
        custom_label: labels[warmup.id] ?? warmup.custom_label ?? null,
      })) ?? [];
      setSavedWarmups(mapped);
    } catch (error) {
      console.error('Error loading saved warmups:', error);
    }
  };

  const generateWarmup = async () => {
    if (!selectedVibe) {
      toast({
        title: 'Pick a vibe',
        description: 'Choose one of the vibe tiles to unlock the warm-up generator.',
        variant: 'default',
      });
      return;
    }

    setIsLoadingWarmup(true);
    try {
      const request: WarmupRequest = {
        vibe: selectedVibe,
        voiceType,
        techniques,
      };

      const plan = generateWarmupPlan(request);
      setWarmupData(plan);
      lastWarmupRequestRef.current = request;
      success('Warm-up generated');
    } catch (err) {
      console.error('Error generating warmup:', err);
      error('Error', 'Failed to generate warm-up. Please try again.');
    } finally {
      setIsLoadingWarmup(false);
    }
  };

  const saveWarmup = async () => {
    if (!warmupData) return;
    if (!currentSong && !selectedVibe) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('saved_warmups')
        .insert({
          user_id: user.id,
          song_title: currentSong?.title || null,
          song_artist: currentSong?.artist || null,
          vibe:
            selectedVibe
              ? WARMUP_VIBE_OPTIONS.find(option => option.id === selectedVibe)?.label || null
              : null,
          physical_warmups: warmupData.physicalWarmups || [],
          vocal_warmups: warmupData.vocalWarmups || [],
          emotional_prep: warmupData.emotionalPrep || [],
          duration: Number(warmupData.duration) || 15,
        });

      if (error) throw error;

      success('Selections saved', 'Warm-up routine saved to your collection.');

      loadSavedWarmups();
    } catch (err) {
      console.error('Error saving warmup:', err);
      error('Error', 'Failed to save warmup routine. Please try again.');
    }
  };

  const deleteSavedWarmup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_warmups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      success('Warm-up removed', 'Warm-up routine removed from your collection.');
      const labels = getStoredWarmupLabels();
      if (labels[id]) {
        delete labels[id];
        persistWarmupLabels(labels);
      }

      loadSavedWarmups();
    } catch (err) {
      console.error('Error deleting warmup:', err);
      error('Error', 'Failed to delete warmup routine.');
    }
  };

  const renameSavedWarmup = async () => {
    if (!renamingWarmupId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      error('Name required', 'Enter a name to save this warm-up.');
      return;
    }

    const labels = getStoredWarmupLabels();
    labels[renamingWarmupId] = trimmed;
    persistWarmupLabels(labels);

    setSavedWarmups((prev) =>
      prev.map((warmup) =>
        warmup.id === renamingWarmupId ? { ...warmup, custom_label: trimmed } : warmup,
      ),
    );

    success('Warm-up renamed');
    setRenamingWarmupId(null);
    setRenameValue('');
  };

  const loadSavedWarmup = (warmup: WarmupRecord) => {
    setWarmupData({
      physicalWarmups: warmup.physical_warmups,
      vocalWarmups: warmup.vocal_warmups,
      emotionalPrep: warmup.emotional_prep,
      duration: warmup.duration
    });
  };

  const beginRenameWarmup = (warmup: WarmupRecord) => {
    setRenamingWarmupId(warmup.id);
    setRenameValue(
      warmup.custom_label ||
        warmup.vibe ||
        (warmup.song_title ? `${warmup.song_title}${warmup.song_artist ? ` by ${warmup.song_artist}` : ''}` : '')
    );
  };

  const cancelRenameWarmup = () => {
    setRenamingWarmupId(null);
    setRenameValue('');
  };

  const generateSetlist = async () => {
    setIsLoadingSetlist(true);
    try {
      setSetlistData(null);
      setSetlistSongs([]);

      const request: SetlistRequest = {
        count: songCount,
        source: setlistSource,
        seedSongId: currentSong?.id ?? null,
      };

      const response = await buildSetlist(request);
      setSetlistData(response);
      success('Setlist ready');
      if (response.note) {
        toast({ title: response.note });
      }

      const mappedSongs = response.items
        .map(item => songs.find(song => song.id === item.id))
        .filter((song): song is Song => Boolean(song));

      setSetlistSongs(mappedSongs);
    } catch (err) {
      console.error('Error generating setlist:', err);
      error('Error', 'Failed to generate setlist. Please try again.');
    } finally {
      setIsLoadingSetlist(false);
    }
  };

  const addToPersonalSetlist = (song: Song) => {
    // This could be enhanced to save to local storage or a user's setlist collection
    success('Setlist updated', `"${song.title}" added to your personal setlist.`);
  };

  return (
    <MotionIfOkay>
      <motion.div
        initial={prefersReducedMotion ? false : fadeInUp.initial}
        animate={prefersReducedMotion ? undefined : fadeInUp.animate}
        exit={prefersReducedMotion ? undefined : fadeInUp.exit}
        className="fixed inset-0 bg-background/95 z-50 overflow-y-auto backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/');
                  }}
                  className="flex items-center gap-2 group"
                >
                  <img
                    src={prepIcon}
                    alt="Performance prep icon"
                    className="w-12 h-12 transition-transform duration-200 group-hover:scale-105"
                  />
                  <span>Performance Prep Tools</span>
                </button>
              </CardTitle>
              <AnimatedButton
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 text-lg text-card-foreground/60 hover:text-card-foreground"
              >
                <span aria-hidden>×</span>
                <span className="sr-only">Close performance prep tools</span>
              </AnimatedButton>
            </div>
            {currentSong && (
              <p className="text-sm text-card-foreground/70">
                Preparing for "{currentSong.title}" by {currentSong.artist}
              </p>
            )}
          </CardHeader>

          <CardContent>
            <div className="space-y-10">
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-card-foreground/60">
                    Select a vibe category to generate a warm-up routine.
                  </p>
                  {selectedVibeLabel && (
                    <Badge variant="secondary">{selectedVibeLabel}</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AnimatePresence>
                    {WARMUP_VIBE_OPTIONS.map((option) => {
                      const isActive = selectedVibe === option.id;
                      return (
                        <motion.button
                          key={option.id}
                          type="button"
                          layout={!prefersReducedMotion}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          whileHover={prefersReducedMotion ? undefined : { scale: 1.02, y: -2 }}
                          whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                          transition={{ duration: motionDur.base / 1000, ease: motionEase.standard }}
                          aria-pressed={isActive}
                          onClick={() => {
                            setSelectedVibe((prev) => (prev === option.id ? null : option.id));
                            setWarmupData(null);
                          }}
                          className={`motion-safe-only rounded-2xl border-2 p-4 text-left backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            isActive
                              ? 'border-primary bg-primary/15 shadow-lg'
                              : 'border-card-border/70 bg-card/60 hover:border-primary/50'
                          }`}
                        >
                          <h4 className="text-lg font-semibold mb-1">{option.label}</h4>
                          <p className="text-sm text-card-foreground/60">{option.subtitle}</p>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-lg font-semibold text-card-foreground">Warm-up Styles</h4>
                  <p className="text-sm text-card-foreground/60">
                    Choose your voice type and technique focus (optional).
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-card-foreground/80">Voice Type</span>
                    <div role="radiogroup" aria-label="Voice type" className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {VOICE_OPTIONS.map((option, index) => {
                        const isActive = voiceType === option.id;
                        return (
                          <ChipToggle
                            key={option.id}
                            ref={(element) => {
                              voiceButtonRefs.current[index] = element;
                            }}
                            role="radio"
                            aria-checked={isActive}
                            isActive={isActive}
                            onKeyDown={(event) => handleVoiceKeyDown(event, index)}
                            onClick={() => {
                              setVoiceType((prev) => (prev === option.id ? null : option.id));
                              setWarmupData(null);
                            }}
                            className="justify-center"
                          >
                            {option.label}
                          </ChipToggle>
                        );
                      })}
                    </div>
                    {!voiceType && (
                      <p className="mt-1 text-xs text-card-foreground/60">Choose voice type</p>
                    )}
                  </div>

                  <div>
                    <span className="text-sm font-medium text-card-foreground/80">Technique Focus</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TECHNIQUE_OPTIONS.map((option) => {
                        const isActive = techniques.includes(option.id);
                        return (
                          <ChipToggle
                            key={option.id}
                            role="checkbox"
                            aria-checked={isActive}
                            isActive={isActive}
                            onClick={() => toggleTechnique(option.id)}
                          >
                            {option.label}
                          </ChipToggle>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <motion.div 
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionDur.base / 1000, ease: motionEase.standard, delay: 0.1 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2">
                    <motion.h3 
                      initial={prefersReducedMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: motionDur.base / 1000, ease: motionEase.standard, delay: 0.15 }}
                      className="text-xl font-semibold"
                    >
                      AI Warm-up Generator
                    </motion.h3>
                  </div>
                  {selectedVibe && (
                    <WarmupCriteriaPreview
                      request={{
                        vibe: selectedVibe,
                        voiceType,
                        techniques,
                      }}
                    />
                  )}
                </motion.div>

                <div className="space-y-6">
                  {!warmupData ? (
                    <div className="text-center py-8 space-y-4">
                      <AnimatedButton
                        onClick={generateWarmup}
                        disabled={!selectedVibe || isLoadingWarmup}
                        size="lg"
                        isLoading={isLoadingWarmup}
                        loadingText="Generating routine..."
                      >
                        Generate Warm-up
                      </AnimatedButton>
                      <p className="text-sm text-card-foreground/60">
                        {currentSong
                          ? "Blend your song's emotional arc with the selected vibe."
                          : 'Choose a vibe and styles to craft a routine that matches your set.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-3">
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="text-lg">Physical</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {warmupData.physicalWarmups?.map((exercise: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <span className="text-primary font-bold">{index + 1}.</span>
                                {exercise}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </AnimatedCard>
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="text-lg">Vocal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {warmupData.vocalWarmups?.map((exercise: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <span className="text-primary font-bold">{index + 1}.</span>
                                {exercise}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </AnimatedCard>
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="text-lg">Mental</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {warmupData.emotionalPrep?.map((prep: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <span className="text-primary font-bold">{index + 1}.</span>
                                {prep}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </AnimatedCard>
                    </div>
                  )}

                  {warmupData && (
                    <div className="flex flex-col gap-3 rounded-lg bg-card-accent/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">
                          Total Duration: {warmupData.duration} minutes
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <AnimatedButton variant="outline" size="sm" onClick={handleExportWarmupPdf}>
                          Export PDF
                        </AnimatedButton>
                        <AnimatedButton variant="outline" size="sm" onClick={saveWarmup}>
                          Save
                        </AnimatedButton>
                        <AnimatedButton variant="outline" size="sm" onClick={() => setWarmupData(null)}>
                          Generate New
                        </AnimatedButton>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {savedWarmups.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xl font-semibold">Saved Warm-ups</h3>
                  <ul className="space-y-2">
                    <AnimatePresence>
                      {savedWarmups.map((warmup) => (
                        <AnimatedListItem key={warmup.id} className="rounded-xl border border-card-border/40 bg-card/60">
                          <motion.div
                            className="flex items-center justify-between gap-4 px-5 py-4"
                            whileHover={hoverLift}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                            transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
                          >
                            <div className="flex-1 min-w-0">
                              {renamingWarmupId === warmup.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    placeholder="Warm-up name"
                                    className="h-9"
                                    autoFocus
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <AnimatedButton
                                      size="sm"
                                      onClick={renameSavedWarmup}
                                      className="px-3 justify-center"
                                    >
                                      Save Name
                                    </AnimatedButton>
                                    <AnimatedButton
                                      size="sm"
                                      variant="ghost"
                                      onClick={cancelRenameWarmup}
                                      className="px-3 justify-center"
                                    >
                                      Cancel
                                    </AnimatedButton>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <h4 className="font-medium truncate">
                                    {warmup.custom_label ||
                                      warmup.vibe ||
                                      `${warmup.song_title}${
                                        warmup.song_artist ? ` by ${warmup.song_artist}` : ''
                                      }`}
                                  </h4>
                                  {warmup.song_artist && !warmup.vibe && (
                                    <p className="text-sm text-card-foreground/60 truncate">{warmup.song_artist}</p>
                                  )}
                                  <p className="mt-1 text-xs text-card-foreground/50">
                                    {warmup.duration} min • {new Date(warmup.created_at).toLocaleDateString()}
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-2">
                              {renamingWarmupId !== warmup.id && (
                                <AnimatedButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => beginRenameWarmup(warmup)}
                                  className="px-3 justify-center"
                                >
                                  Rename
                                </AnimatedButton>
                              )}
                              <AnimatedButton
                                variant="outline"
                                size="sm"
                                onClick={() => loadSavedWarmup(warmup)}
                                className="px-3 justify-center"
                              >
                                Load
                              </AnimatedButton>
                              <AnimatedButton
                                variant="outline"
                                size="sm"
                                onClick={() => deleteSavedWarmup(warmup.id)}
                                className="px-3 justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </AnimatedButton>
                            </div>
                          </motion.div>
                        </AnimatedListItem>
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              )}

              <section className="space-y-4">
                <motion.h3 
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionDur.base / 1000, ease: motionEase.standard, delay: 0.4 }}
                  className="text-xl font-semibold"
                >
                  Setlist Builder
                </motion.h3>
                <motion.div 
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionDur.base / 1000, ease: motionEase.standard, delay: 0.5 }}
                  className="space-y-6"
                >
                  {!setlistData ? (
                    <div className="space-y-6">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-full max-w-xl space-y-2">
                          <span className="text-sm font-medium text-card-foreground/80">Source</span>
                          <div className="flex flex-wrap gap-2">
                            {SETLIST_SOURCE_OPTIONS.map((option) => {
                              const isActive = setlistSource === option.id;
                              return (
                                <ChipToggle
                                  key={option.id}
                                  isActive={isActive}
                                  onClick={() => handleSetlistSourceChange(option.id)}
                                  className="flex-1 min-w-[140px] justify-center"
                                >
                                  {option.label}
                                </ChipToggle>
                              );
                            })}
                          </div>
                          <div className="mt-1 grid grid-cols-1 gap-1 text-xs text-card-foreground/70 sm:grid-cols-3">
                            {SETLIST_SOURCE_OPTIONS.map(option => (
                              <span key={option.id} className="leading-tight text-center">
                                {option.description}
                              </span>
                            ))}
                          </div>
                        </div>
                        <motion.div 
                          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: motionDur.base / 1000, ease: motionEase.standard, delay: 0.1 }}
                          className="flex items-center gap-4"
                        >
                          <label className="text-sm font-medium">Number of songs:</label>
                          <motion.input
                            type="number"
                            min="3"
                            max="10"
                            value={songCount}
                            onChange={(e) =>
                              setSongCount(Math.max(3, Math.min(10, parseInt(e.target.value) || 5)))
                            }
                            whileFocus={prefersReducedMotion ? {} : { scale: 1.05, borderColor: '#3b82f6' }}
                            transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
                            className="w-20 rounded-md border border-input bg-background px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          />
                        </motion.div>
                        <AnimatedButton
                          onClick={generateSetlist}
                          disabled={isLoadingSetlist}
                          size="lg"
                          isLoading={isLoadingSetlist}
                          loadingText="Building setlist..."
                        >
                          Build Setlist
                        </AnimatedButton>
                        <p className="text-sm text-card-foreground/60 text-center max-w-xl">
                          Pick the source pool and we will handle the sequence.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mb-4">
                        <h3 className="font-semibold mb-2">Emotional Arc:</h3>
                        <p className="text-sm text-card-foreground/80">{setlistData.overallArc}</p>
                      </div>

                      {setlistData.note && (
                        <p className="rounded-md bg-card-accent/20 px-3 py-2 text-sm text-card-foreground/70">
                          {setlistData.note}
                        </p>
                      )}

                      <ul className="space-y-3">
                        <AnimatePresence>
                          {setlistData.items.length === 0 && (
                            <AnimatedListItem className="rounded-xl border border-card-border/40 bg-card/60 px-5 py-3 text-sm text-card-foreground/60">
                              No songs available for the selected source yet.
                            </AnimatedListItem>
                          )}
                          {setlistData.items.map((item, index) => {
                            const matchingSong = setlistSongs.find(song => song.id === item.id);
                            const entry = setlistData.setlist[index];
                            return (
                              <AnimatedListItem key={`${item.id}-${index}`} className="rounded-xl border border-card-border/40 bg-card/60">
                                <motion.div
                                  className="flex items-center gap-4 px-5 py-4"
                                  whileHover={hoverLift}
                                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                                  transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
                                >
                                  <div className="w-8 text-2xl font-bold text-primary">
                                    {entry?.position ?? index + 1}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium">{item.title}</h4>
                                      {item.external && (
                                        <Badge variant="outline" className="border-amber-400 text-amber-400">
                                          Suggested
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-card-foreground/60">
                                      {entry?.purpose || item.reason || 'Maintains narrative flow'}
                                    </p>
                                    {matchingSong && matchingSong.core_feelings?.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {matchingSong.core_feelings.slice(0, 2).map((feeling, i) => (
                                          <Badge key={i} variant="secondary" className="text-xs">
                                            {feeling}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    {item.external && (
                                      <AnimatedButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddExternalToLibrary(item)}
                                      >
                                        + Add to Library
                                      </AnimatedButton>
                                    )}
                                    {matchingSong && (
                                      <AnimatedButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addToPersonalSetlist(matchingSong)}
                                      >
                                        Add
                                      </AnimatedButton>
                                    )}
                                  </div>
                                </motion.div>
                              </AnimatedListItem>
                            );
                          })}
                        </AnimatePresence>
                      </ul>

                      <div className="mt-6 rounded-lg bg-tip-bg p-4">
                        <h4 className="font-medium mb-2">Transition Tips:</h4>
                        <ul className="space-y-1">
                          {setlistData.transitionTips?.map((tip: string, index: number) => (
                            <li key={index} className="text-sm text-tip-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {setlistData && (
                    <AnimatedButton variant="outline" onClick={() => setSetlistData(null)} className="w-full">
                      Generate New Setlist
                    </AnimatedButton>
                  )}
                </motion.div>
              </section>

              <section className="space-y-6">
                <motion.h3 
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionDur.base / 1000, ease: motionEase.standard, delay: 0.2 }}
                  className="text-xl font-semibold"
                >
                  Pitch & Rhythm Tools
                </motion.h3>
                <motion.div 
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionDur.base / 1000, ease: motionEase.standard, delay: 0.3 }}
                  className="grid gap-6"
                >
                  <motion.div
                    whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.01 }}
                    transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
                  >
                    <PitchDetectorCard className="border bg-card/95" defaultRange="voice" defaultA4={440} />
                  </motion.div>
                  <motion.div
                    whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.01 }}
                    transition={{ duration: motionDur.fast / 1000, ease: motionEase.standard }}
                  >
                    <MetronomeCard className="border bg-card/95" />
                  </motion.div>
                </motion.div>
              </section>
            </div>
          </CardContent>
          </Card>
        </div>
      </motion.div>
    </MotionIfOkay>
  );
};
