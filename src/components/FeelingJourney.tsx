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
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const prefersReducedMotion = usePrefersReducedMotion();
  const hoverLift = prefersReducedMotion ? undefined : { y: -2, scale: 1.02 };
  const navigate = useNavigate();

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
          variant: "error",
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
        variant: "error",
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
        variant: "error",
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
                  <span>Feeling Journey</span>
                </button>
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
                <h3 className="font-medium mb-4">How are you feeling right now?</h3>
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
                        <span className="font-medium">{option.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <AnimatedButton
                  onClick={() => setStep(2)}
                  disabled={!mood}
                  className="flex w-full items-center justify-center gap-2"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </AnimatedButton>
              </div>
            )}

            {/* Step 2: Energy */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-medium mb-4">What's your energy level?</h3>
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
                        <span className="font-medium">{option.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <AnimatedButton variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => setStep(3)}
                    disabled={!energy}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </AnimatedButton>
                </div>
              </div>
            )}

            {/* Step 3: Context */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-medium mb-4">What's the performance context?</h3>
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
                        <span className="font-medium">{option.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <AnimatedButton variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={getRecommendation}
                    disabled={!context || isLoading}
                    isLoading={isLoading}
                    loadingText="Finding your song..."
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    Get Recommendation <ArrowRight className="w-4 h-4" />
                  </AnimatedButton>
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
                  <AnimatedButton variant="outline" onClick={reset} className="flex-1">
                    Try Again
                  </AnimatedButton>
                  <AnimatedButton onClick={handleSelectRecommendedSong} className="flex-1">
                    Use This Song
                  </AnimatedButton>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>,
    document.body
  );
};
