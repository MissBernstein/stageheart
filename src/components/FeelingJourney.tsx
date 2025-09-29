import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Heart, Zap, MapPin, Loader2 } from 'lucide-react';
import { Song } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeelingJourneyProps {
  onSelectSong: (song: Song) => void;
  onClose: () => void;
  songs: Song[];
}

export const FeelingJourney = ({ onSelectSong, onClose, songs }: FeelingJourneyProps) => {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');
  const [context, setContext] = useState('');
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const moodOptions = [
    { id: 'happy', label: 'Happy & Uplifted', icon: '😊' },
    { id: 'contemplative', label: 'Contemplative & Thoughtful', icon: '🤔' },
    { id: 'empowered', label: 'Empowered & Strong', icon: '💪' },
    { id: 'vulnerable', label: 'Vulnerable & Open', icon: '🤲' },
    { id: 'celebratory', label: 'Celebratory & Joyful', icon: '🎉' },
    { id: 'peaceful', label: 'Peaceful & Calm', icon: '🕯️' },
    { id: 'passionate', label: 'Passionate & Intense', icon: '🔥' },
    { id: 'nostalgic', label: 'Nostalgic & Reflective', icon: '🌅' }
  ];

  const energyOptions = [
    { id: 'low', label: 'Gentle & Subdued', icon: '🌙' },
    { id: 'medium', label: 'Balanced & Warm', icon: '☀️' },
    { id: 'high', label: 'Energetic & Dynamic', icon: '⚡' },
    { id: 'explosive', label: 'Explosive & Powerful', icon: '🚀' }
  ];

  const contextOptions = [
    { id: 'solo', label: 'Solo Performance', icon: '🎤' },
    { id: 'group', label: 'Group/Choir', icon: '👥' },
    { id: 'practice', label: 'Practice Session', icon: '🎵' },
    { id: 'audition', label: 'Audition', icon: '🎭' },
    { id: 'casual', label: 'Casual/Fun', icon: '🎶' },
    { id: 'emotional', label: 'Emotional Release', icon: '💭' }
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
          variant: "destructive",
        });
        return;
      }

      setRecommendation(data);
      setStep(4);
    } catch (error) {
      console.error('Error getting recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to get song recommendation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRecommendedSong = () => {
    const song = songs.find(s => s.title === recommendation.recommendedSong);
    if (song) {
      onSelectSong(song);
    } else {
      toast({
        title: "Song not found",
        description: "The recommended song is not in our library.",
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setStep(1);
    setMood('');
    setEnergy('');
    setContext('');
    setRecommendation(null);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Feeling Journey
              </CardTitle>
              <button
                onClick={onClose}
                className="text-card-foreground/60 hover:text-card-foreground transition-colors text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-card-foreground/70">
              Let's find the perfect song for your current mood and performance context
            </p>
            
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
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-4 h-4 text-primary" />
                  <h3 className="font-medium">How are you feeling right now?</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {moodOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setMood(option.id)}
                      className={`p-4 text-left rounded-xl border transition-all ${
                        mood === option.id
                          ? 'border-primary bg-primary/10'
                          : 'border-card-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-medium">{option.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!mood}
                  className="w-full"
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Energy */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="font-medium">What's your energy level?</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {energyOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setEnergy(option.id)}
                      className={`p-4 text-left rounded-xl border transition-all ${
                        energy === option.id
                          ? 'border-primary bg-primary/10'
                          : 'border-card-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-medium">{option.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!energy}
                    className="flex-1"
                  >
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Context */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h3 className="font-medium">What's the performance context?</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contextOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setContext(option.id)}
                      className={`p-4 text-left rounded-xl border transition-all ${
                        context === option.id
                          ? 'border-primary bg-primary/10'
                          : 'border-card-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-medium">{option.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={getRecommendation}
                    disabled={!context || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Finding your song...
                      </>
                    ) : (
                      <>
                        Get Recommendation <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Recommendation */}
            {step === 4 && recommendation && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Your Perfect Song</h3>
                  <h2 className="text-2xl font-bold text-primary mb-4">
                    {recommendation.recommendedSong}
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Why this song is perfect for you:</h4>
                    <p className="text-card-foreground/80">{recommendation.reason}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Your emotional journey:</h4>
                    <p className="text-card-foreground/80">{recommendation.emotionalJourney}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Performance tips:</h4>
                    <ul className="space-y-1">
                      {recommendation.performanceTips?.map((tip: string, index: number) => (
                        <li key={index} className="text-sm text-card-foreground/80 flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={reset} className="flex-1">
                    Try Again
                  </Button>
                  <Button onClick={handleSelectRecommendedSong} className="flex-1">
                    Use This Song
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};