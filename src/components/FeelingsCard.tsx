import { Copy, Star, CheckCircle2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeelingMap } from '@/types';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface FeelingsCardProps {
  feelingMap: FeelingMap;
}

export const FeelingsCard = ({ feelingMap }: FeelingsCardProps) => {
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { toast } = useToast();
  const [justCopied, setJustCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const handleCopy = async () => {
    const text = `${feelingMap.title}${feelingMap.artist ? ` by ${feelingMap.artist}` : ''}

Emotions: ${feelingMap.emotions.join(', ')}

Performance Tips:
${feelingMap.tips.map(tip => `• ${tip}`).join('\n')}${feelingMap.isVibeBasedMap ? '\n\n(Generated from vibe-based mapping)' : ''}`;

    try {
      await navigator.clipboard.writeText(text);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
      toast({
        title: "Copied to clipboard!",
        description: "Your feeling map is ready to use.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please try selecting and copying the text manually.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFavorite = () => {
    if (isFavorite(feelingMap)) {
      removeFavorite(feelingMap);
      toast({
        title: "Removed from favorites",
        description: "The feeling map has been removed from your favorites.",
      });
    } else {
      addFavorite(feelingMap);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      toast({
        title: "Added to favorites!",
        description: "You can find this map in your favorites drawer.",
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card/90 backdrop-blur-sm rounded-3xl p-8 shadow-card border border-card-border">
        {/* Header with song info */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-card-foreground mb-2">
            {feelingMap.title}
          </h2>
          {feelingMap.artist && (
            <p className="text-lg text-card-foreground/70">
              by {feelingMap.artist}
            </p>
          )}
          {feelingMap.isVibeBasedMap && (
            <p className="text-sm text-accent mt-2 font-medium">
              Vibe-based map: {feelingMap.vibeLabel}
            </p>
          )}
        </div>

        {/* Emotions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            Emotion Palette
          </h3>
          <div className="flex flex-wrap gap-3">
            {feelingMap.emotions.map((emotion, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-emotion-bg text-emotion-text border border-emotion-border rounded-full text-sm font-medium shadow-emotion transition-all duration-200 hover:scale-105"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {emotion}
              </span>
            ))}
          </div>
        </div>

        {/* Performance Tips */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-tip-icon" />
            Performance Hints
          </h3>
          <div className="space-y-3">
            {feelingMap.tips.map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-tip-bg rounded-2xl transition-all duration-200 hover:bg-tip-bg/80"
                style={{
                  animationDelay: `${(feelingMap.emotions.length + index) * 100}ms`,
                }}
              >
                <div className="w-2 h-2 bg-tip-icon rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-tip-text leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleCopy}
            variant="secondary"
            className="flex-1 h-12 text-base font-semibold bg-button-secondary hover:bg-button-secondary-hover rounded-2xl transition-all duration-200"
          >
            {justCopied ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Copied!
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5" />
                Copy Map
              </div>
            )}
          </Button>
          
          <Button
            onClick={handleToggleFavorite}
            variant="secondary"
            className={`h-12 px-6 font-semibold rounded-2xl transition-all duration-200 ${
              isFavorite(feelingMap) 
                ? 'bg-star hover:bg-star-hover text-white' 
                : 'bg-button-secondary hover:bg-button-secondary-hover'
            }`}
          >
            {justSaved ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Saved!
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Star className={`w-5 h-5 ${isFavorite(feelingMap) ? 'fill-current' : ''}`} />
                {isFavorite(feelingMap) ? 'Saved' : 'Save'}
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};