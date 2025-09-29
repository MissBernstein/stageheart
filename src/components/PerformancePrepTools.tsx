import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Mic, Brain, Clock, Loader2, Plus, X } from 'lucide-react';
import { Song } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PerformancePrepToolsProps {
  currentSong?: Song;
  onClose: () => void;
  songs: Song[];
}

export const PerformancePrepTools = ({ currentSong, onClose, songs }: PerformancePrepToolsProps) => {
  const [activeTab, setActiveTab] = useState<'warmup' | 'setlist'>('warmup');
  const [warmupData, setWarmupData] = useState<any>(null);
  const [setlistData, setSetlistData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [setlistSongs, setSetlistSongs] = useState<Song[]>([]);
  const { toast } = useToast();

  const generateWarmup = async () => {
    if (!currentSong) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('feeling-journey', {
        body: { 
          mood: currentSong.title,
          energy: currentSong.core_feelings.join(', '),
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
      setIsLoading(false);
    }
  };

  const generateSetlist = async () => {
    if (!currentSong) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('feeling-journey', {
        body: { 
          mood: currentSong.title,
          type: 'setlist' 
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
      
      // Find actual song objects for the setlist
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
      setIsLoading(false);
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
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
            {!currentSong ? (
              <div className="text-center py-8">
                <p className="text-card-foreground/60">
                  Select a song first to generate performance preparation tools.
                </p>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                  <Button
                    variant={activeTab === 'warmup' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('warmup')}
                    className="flex-1"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Warm-up Routine
                  </Button>
                  <Button
                    variant={activeTab === 'setlist' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('setlist')}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Build Setlist
                  </Button>
                </div>

                {/* Warm-up Tab */}
                {activeTab === 'warmup' && (
                  <div className="space-y-6">
                    {!warmupData ? (
                      <div className="text-center py-8">
                        <Button
                          onClick={generateWarmup}
                          disabled={isLoading}
                          size="lg"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating routine...
                            </>
                          ) : (
                            <>
                              <Dumbbell className="w-4 h-4 mr-2" />
                              Generate Warm-up Routine
                            </>
                          )}
                        </Button>
                        <p className="text-sm text-card-foreground/60 mt-2">
                          Get a personalized warm-up based on your song's emotional requirements
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWarmupData(null)}
                        >
                          Generate New Routine
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Setlist Tab */}
                {activeTab === 'setlist' && (
                  <div className="space-y-6">
                    {!setlistData ? (
                      <div className="text-center py-8">
                        <Button
                          onClick={generateSetlist}
                          disabled={isLoading}
                          size="lg"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Building setlist...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Build 5-Song Setlist
                            </>
                          )}
                        </Button>
                        <p className="text-sm text-card-foreground/60 mt-2">
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
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};