import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Mic, Brain, Clock, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Song } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import vibesData from '@/data/vibes.json';

interface PerformancePrepToolsProps {
  currentSong?: Song;
  onClose: () => void;
  songs: Song[];
}

export const PerformancePrepTools = ({ currentSong, onClose, songs }: PerformancePrepToolsProps) => {
  const [warmupData, setWarmupData] = useState<any>(null);
  const [setlistData, setSetlistData] = useState<any>(null);
  const [isLoadingWarmup, setIsLoadingWarmup] = useState(false);
  const [isLoadingSetlist, setIsLoadingSetlist] = useState(false);
  const [setlistSongs, setSetlistSongs] = useState<Song[]>([]);
  const [savedWarmups, setSavedWarmups] = useState<any[]>([]);
  const [songCount, setSongCount] = useState(5);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSavedWarmups();
  }, []);

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
    if (!currentSong && !selectedVibe) return;
    
    setIsLoadingWarmup(true);
    try {
      const vibe = vibesData.find(v => v.id === selectedVibe);
      
      const { data, error } = await supabase.functions.invoke('feeling-journey', {
        body: currentSong ? { 
          mood: currentSong.title,
          energy: currentSong.core_feelings.join(', '),
          type: 'warmup' 
        } : {
          vibe: vibe?.label,
          energy: vibe?.emotions.join(', '),
          type: 'warmup'
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

      setWarmupData(data);
    } catch (error) {
      console.error('Error generating warmup:', error);
      toast({
        title: "Error",
        description: "Failed to generate warmup routine. Please try again.",
        variant: "destructive",
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

      const vibe = vibesData.find(v => v.id === selectedVibe);

      const { error } = await supabase
        .from('saved_warmups')
        .insert({
          user_id: user.id,
          song_title: currentSong?.title || null,
          song_artist: currentSong?.artist || null,
          vibe: vibe?.label || null,
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
                <Dumbbell className="w-5 h-5 text-primary" />
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
            {!currentSong && !selectedVibe ? (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <p className="text-card-foreground/60 mb-6">
                    Select a vibe category to generate a warm-up routine
                  </p>
                </div>
                
                {/* Vibe Selector */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {vibesData.map((vibe) => (
                    <button
                      key={vibe.id}
                      onClick={() => {
                        setSelectedVibe(vibe.id);
                        setWarmupData(null);
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedVibe === vibe.id
                          ? 'border-primary bg-primary/10'
                          : 'border-card-border hover:border-primary/50'
                      }`}
                    >
                      <h4 className="font-semibold mb-2">{vibe.label}</h4>
                      <p className="text-xs text-card-foreground/60">
                        {vibe.emotions.slice(0, 2).join(', ')}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Saved Warm-ups Section - Always visible */}
                {savedWarmups.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Save className="w-5 h-5 text-primary" />
                      Saved Warm-ups
                    </h3>
                    <div className="space-y-2">
                      {savedWarmups.map((warmup) => (
                        <div
                          key={warmup.id}
                          className="flex items-center justify-between p-4 bg-card-accent/20 rounded-lg"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium">
                              {warmup.vibe || `${warmup.song_title}${warmup.song_artist ? ` by ${warmup.song_artist}` : ''}`}
                            </h4>
                            <p className="text-xs text-card-foreground/50 mt-1">
                              {warmup.duration} min • {new Date(warmup.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadSavedWarmup(warmup)}
                            >
                              Load
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSavedWarmup(warmup.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* AI Warm-up Generator */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Dumbbell className="w-5 h-5 text-primary" />
                    AI Warm-up Generator
                    {selectedVibe && !currentSong && (
                      <Badge variant="secondary" className="ml-2">
                        {vibesData.find(v => v.id === selectedVibe)?.label}
                      </Badge>
                    )}
                  </h3>
                  <div className="space-y-6">
                    {!warmupData ? (
                      <div className="text-center py-8 space-y-4">
                        <Button
                          onClick={generateWarmup}
                          disabled={isLoadingWarmup}
                          size="lg"
                        >
                          {isLoadingWarmup ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating routine...
                            </>
                          ) : (
                            <>
                              <Dumbbell className="w-4 h-4 mr-2" />
                              Generate AI Warm-up
                            </>
                          )}
                        </Button>
                        {!currentSong && (
                          <button
                            onClick={() => {
                              setSelectedVibe(null);
                              setWarmupData(null);
                            }}
                            className="text-sm text-card-foreground/60 hover:text-card-foreground underline"
                          >
                            ← Choose different vibe
                          </button>
                        )}
                        <p className="text-sm text-card-foreground/60">
                          {currentSong 
                            ? "Get a personalized warm-up based on your song's emotional requirements"
                            : "Get a warm-up routine tailored to your selected vibe"
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Physical Warm-ups */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Dumbbell className="w-4 h-4" />
                              Physical
                            </CardTitle>
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

                        {/* Vocal Warm-ups */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Mic className="w-4 h-4" />
                              Vocal
                            </CardTitle>
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

                        {/* Emotional Prep */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              Mental
                            </CardTitle>
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
                      <div className="flex items-center justify-between p-4 bg-card-accent/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">
                            Total Duration: {warmupData.duration} minutes
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={saveWarmup}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWarmupData(null)}
                          >
                            Generate New
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Saved Warm-ups */}
                {/* Saved Warm-ups - Only show when song is selected */}
                {currentSong && savedWarmups.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Save className="w-5 h-5 text-primary" />
                      Saved Warm-ups
                    </h3>
                    <div className="space-y-2">
                      {savedWarmups.map((warmup) => (
                        <div
                          key={warmup.id}
                          className="flex items-center justify-between p-4 bg-card-accent/20 rounded-lg"
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadSavedWarmup(warmup)}
                            >
                              Load
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSavedWarmup(warmup.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Setlist Generator */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Setlist Builder
                  </h3>
                  <div className="space-y-6">
                    {!setlistData ? (
                      <div className="text-center py-8 space-y-4">
                        <div className="flex items-center justify-center gap-4">
                          <label className="text-sm font-medium">
                            Number of songs:
                          </label>
                          <input
                            type="number"
                            min="3"
                            max="10"
                            value={songCount}
                            onChange={(e) => setSongCount(Math.max(3, Math.min(10, parseInt(e.target.value) || 5)))}
                            className="w-20 px-3 py-2 border border-input bg-background rounded-md text-center"
                          />
                        </div>
                        <Button
                          onClick={generateSetlist}
                          disabled={isLoadingSetlist}
                          size="lg"
                        >
                          {isLoadingSetlist ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Building setlist...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Build {songCount}-Song Setlist
                            </>
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
                          <p className="text-card-foreground/80 text-sm">{setlistData.overallArc}</p>
                        </div>

                        <div className="space-y-3">
                          {setlistData.setlist?.map((item: any, index: number) => {
                            const song = setlistSongs[index];
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-4 p-4 bg-card-accent/20 rounded-lg"
                              >
                                <div className="text-2xl font-bold text-primary w-8">
                                  {item.position}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium">{item.song}</h4>
                                  <p className="text-sm text-card-foreground/60">{item.purpose}</p>
                                  {song && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {song.core_feelings.slice(0, 2).map((feeling, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {feeling}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {song && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addToPersonalSetlist(song)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-6 p-4 bg-tip-bg rounded-lg">
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
                      <Button
                        variant="outline"
                        onClick={() => setSetlistData(null)}
                        className="w-full"
                      >
                        Generate New Setlist
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};