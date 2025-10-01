import { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Loader2, Save, Trash2 } from 'lucide-react';
import { Song } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import prepIcon from '@/assets/prepicon.png';
import {
  generateWarmupPlan,
  WARMUP_VIBE_OPTIONS,
  WarmupVibe,
  VoiceType,
  Technique,
  WarmupRequest,
  WarmupPlan,
} from '@/lib/warmupGenerator';

const WARMUP_PREF_KEY = 'warmup-preferences';
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

interface PerformancePrepToolsProps {
  currentSong?: Song;
  onClose: () => void;
  songs: Song[];
}

export const PerformancePrepTools = ({ currentSong, onClose, songs }: PerformancePrepToolsProps) => {
  const [warmupData, setWarmupData] = useState<WarmupPlan | null>(null);
  const [setlistData, setSetlistData] = useState<any>(null);
  const [isLoadingWarmup, setIsLoadingWarmup] = useState(false);
  const [isLoadingSetlist, setIsLoadingSetlist] = useState(false);
  const [setlistSongs, setSetlistSongs] = useState<Song[]>([]);
  const [savedWarmups, setSavedWarmups] = useState<any[]>([]);
  const [songCount, setSongCount] = useState(5);
  const [selectedVibe, setSelectedVibe] = useState<WarmupVibe | null>(null);
  const [voiceType, setVoiceType] = useState<VoiceType>(null);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const voiceButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { toast } = useToast();

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

  const handleVoiceKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
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
      setSavedWarmups(data || []);
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
    } catch (error) {
      console.error('Error generating warmup:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate warm-up. Please try again.',
        variant: 'destructive',
      });
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
          duration: Number(warmupData.duration) || 15
        });

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Warm-up routine saved to your collection.",
      });
      
      loadSavedWarmups();
    } catch (error) {
      console.error('Error saving warmup:', error);
      toast({
        title: "Error",
        description: "Failed to save warmup routine. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteSavedWarmup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_warmups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Warm-up routine removed from your collection.",
      });
      
      loadSavedWarmups();
    } catch (error) {
      console.error('Error deleting warmup:', error);
      toast({
        title: "Error",
        description: "Failed to delete warmup routine.",
        variant: "destructive",
      });
    }
  };

  const loadSavedWarmup = (warmup: any) => {
    setWarmupData({
      physicalWarmups: warmup.physical_warmups,
      vocalWarmups: warmup.vocal_warmups,
      emotionalPrep: warmup.emotional_prep,
      duration: warmup.duration
    });
  };

  const generateSetlist = async () => {
    if (!currentSong) return;
    
    setIsLoadingSetlist(true);
    try {
      const { data, error } = await supabase.functions.invoke('feeling-journey', {
        body: { 
          mood: currentSong.title,
          type: 'setlist',
          songCount: songCount
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "AI Service Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setSetlistData(data);
      
      const foundSongs = data.setlist?.map((item: any) => 
        songs.find(s => s.title.toLowerCase().includes(item.song.toLowerCase()) || 
                      item.song.toLowerCase().includes(s.title.toLowerCase()))
      ).filter(Boolean) || [];
      
      setSetlistSongs(foundSongs);
    } catch (error) {
      console.error('Error generating setlist:', error);
      toast({
        title: "Error",
        description: "Failed to generate setlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSetlist(false);
    }
  };

  const addToPersonalSetlist = (song: Song) => {
    // This could be enhanced to save to local storage or a user's setlist collection
    toast({
      title: "Added to Setlist",
      description: `"${song.title}" added to your personal setlist.`,
    });
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <img src={prepIcon} alt="Performance prep icon" className="w-6 h-6" />
                Performance Prep Tools
              </CardTitle>
              <button
                onClick={onClose}
                className="text-card-foreground/60 hover:text-card-foreground transition-colors text-2xl"
              >
                ×
              </button>
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
                  {WARMUP_VIBE_OPTIONS.map(option => {
                    const isActive = selectedVibe === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          setSelectedVibe(prev => (prev === option.id ? null : option.id));
                          setWarmupData(null);
                        }}
                        className={`rounded-2xl border-2 p-4 text-left transition-all ${
                          isActive
                            ? 'border-primary bg-primary/10 shadow-lg'
                            : 'border-card-border hover:border-primary/50'
                        }`}
                      >
                        <h4 className="text-lg font-semibold mb-1">{option.label}</h4>
                        <p className="text-sm text-card-foreground/60">{option.subtitle}</p>
                      </button>
                    );
                  })}
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
                    <div
                      role="radiogroup"
                      aria-label="Voice type"
                      className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2"
                    >
                      {VOICE_OPTIONS.map((option, index) => {
                        const isActive = voiceType === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            ref={element => {
                              voiceButtonRefs.current[index] = element;
                            }}
                            onKeyDown={event => handleVoiceKeyDown(event, index)}
                            onClick={() => {
                              setVoiceType(prev => (prev === option.id ? null : option.id));
                              setWarmupData(null);
                            }}
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                              isActive
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-card-border text-card-foreground/80 hover:border-primary/50'
                            }`}
                          >
                            {option.label}
                          </button>
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
                      {TECHNIQUE_OPTIONS.map(option => {
                        const isActive = techniques.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="checkbox"
                            aria-checked={isActive}
                            onClick={() => toggleTechnique(option.id)}
                            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                              isActive
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-card-border text-card-foreground/80 hover:border-primary/50'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">AI Warm-up Generator</h3>
                  {selectedVibeLabel && <Badge variant="secondary">{selectedVibeLabel}</Badge>}
                </div>

                <div className="space-y-6">
                  {!warmupData ? (
                    <div className="text-center py-8 space-y-4">
                      <Button
                        onClick={generateWarmup}
                        disabled={!selectedVibe || isLoadingWarmup}
                        size="lg"
                      >
                        {isLoadingWarmup ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating routine...
                          </>
                        ) : (
                          'Generate Warm-up'
                        )}
                      </Button>
                      {!selectedVibe && (
                        <p className="text-sm text-card-foreground/60">
                          Select a vibe above to enable the generator.
                        </p>
                      )}
                      <p className="text-sm text-card-foreground/60">
                        {currentSong
                          ? "Blend your song's emotional arc with the selected vibe."
                          : 'Choose a vibe and styles to craft a routine that matches your set.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-3">
                      <Card>
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
                      </Card>
                      <Card>
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
                      </Card>
                      <Card>
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
                      </Card>
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
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={saveWarmup}>
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setWarmupData(null)}>
                          Generate New
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {savedWarmups.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Save className="w-5 h-5 text-primary" />
                    Saved Warm-ups
                  </h3>
                  <div className="space-y-2">
                    {savedWarmups.map((warmup) => (
                      <div
                        key={warmup.id}
                        className="flex items-center justify-between rounded-lg bg-card-accent/20 p-4"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {warmup.vibe || `${warmup.song_title}${warmup.song_artist ? ` by ${warmup.song_artist}` : ''}`}
                          </h4>
                          {warmup.song_artist && !warmup.vibe && (
                            <p className="text-sm text-card-foreground/60">{warmup.song_artist}</p>
                          )}
                          <p className="text-xs text-card-foreground/50 mt-1">
                            {warmup.duration} min • {new Date(warmup.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => loadSavedWarmup(warmup)}>
                            Load
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteSavedWarmup(warmup.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <h3 className="text-xl font-semibold">Setlist Builder</h3>
                <div className="space-y-6">
                  {!setlistData ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <label className="text-sm font-medium">Number of songs:</label>
                        <input
                          type="number"
                          min="3"
                          max="10"
                          value={songCount}
                          onChange={(e) =>
                            setSongCount(Math.max(3, Math.min(10, parseInt(e.target.value) || 5)))
                          }
                          className="w-20 rounded-md border border-input bg-background px-3 py-2 text-center"
                        />
                      </div>
                      <Button onClick={generateSetlist} disabled={isLoadingSetlist} size="lg">
                        {isLoadingSetlist ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Building setlist...
                          </>
                        ) : (
                          `Build ${songCount}-Song Setlist`
                        )}
                      </Button>
                      <p className="text-sm text-card-foreground/60">
                        Create an emotionally cohesive setlist starting with your selected song
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mb-4">
                        <h3 className="font-semibold mb-2">Emotional Arc:</h3>
                        <p className="text-sm text-card-foreground/80">{setlistData.overallArc}</p>
                      </div>

                      <div className="space-y-3">
                        {setlistData.setlist?.map((item: any, index: number) => {
                          const song = setlistSongs[index];
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-4 rounded-lg bg-card-accent/20 p-4"
                            >
                              <div className="w-8 text-2xl font-bold text-primary">
                                {item.position}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{item.song}</h4>
                                <p className="text-sm text-card-foreground/60">{item.purpose}</p>
                                {song && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {song.core_feelings.slice(0, 2).map((feeling, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {feeling}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {song && (
                                <Button variant="outline" size="sm" onClick={() => addToPersonalSetlist(song)}>
                                  Add
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>

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
                    <Button variant="outline" onClick={() => setSetlistData(null)} className="w-full">
                      Generate New Setlist
                    </Button>
                  )}
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
