import { Copy, Star, CheckCircle2, Lightbulb, ExternalLink, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FeelingMap } from '@/types';
import { useFavorites } from '@/hooks/useFavorites';
import { usePersonalNotes } from '@/hooks/usePersonalNotes';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface FeelingsCardProps {
  feelingMap: FeelingMap;
}

export const FeelingsCard = ({ feelingMap }: FeelingsCardProps) => {
  const { t } = useTranslation();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { getNote, saveNote } = usePersonalNotes();
  const { toast } = useToast();
  const [justCopied, setJustCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [personalNote, setPersonalNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    setPersonalNote(getNote(feelingMap));
  }, [feelingMap, getNote]);

  const handleCopy = async () => {
    const text = `${feelingMap.title}${feelingMap.artist ? ` — ${feelingMap.artist}` : ''}

${feelingMap.summary}
${feelingMap.theme}

Core feeling arc: ${feelingMap.core_feelings?.join(', ') || feelingMap.emotions?.join(', ')}

Performance tips:
${(feelingMap.access_ideas || feelingMap.tips)?.map(tip => `• ${tip}`).join('\n')}

Visual cue: ${feelingMap.visual || ''}${feelingMap.isVibeBasedMap ? '\n\n(Generated from vibe-based mapping)' : ''}`;

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

  const handleSaveNote = () => {
    saveNote(feelingMap, personalNote);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    toast({
      title: "Note saved!",
      description: "Your personal note has been saved.",
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card rounded-3xl p-8 shadow-card border-2 border-card-border">
        {/* Header with song info */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-card-foreground mb-2">
            {feelingMap.title}
          </h2>
          {feelingMap.artist && (
            <p className="text-lg text-muted-foreground">
              by {feelingMap.artist}
            </p>
          )}
          {feelingMap.isVibeBasedMap && (
            <p className="text-sm text-accent mt-2 font-medium">
              Vibe-based map: {feelingMap.vibeLabel}
            </p>
          )}
        </div>

        {/* Summary */}
        {feelingMap.summary && (
          <div className="mb-6">
            <p className="text-lg text-card-foreground leading-relaxed italic">
              {feelingMap.summary}
            </p>
          </div>
        )}

        {/* Theme */}
        {feelingMap.theme && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              {t('feelingMap.theme')}
            </h3>
            <p className="text-muted-foreground font-medium">
              {feelingMap.theme}
            </p>
          </div>
        )}

        {/* Core Feelings Arc */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            {t('feelingMap.coreFeelgs')}
          </h3>
          <div className="flex flex-wrap gap-3">
            {(feelingMap.core_feelings || feelingMap.emotions || []).map((feeling, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-emotion-bg text-emotion-text border border-emotion-border rounded-full text-sm font-medium shadow-emotion transition-all duration-200 hover:scale-105"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {feeling}
              </span>
            ))}
          </div>
        </div>

        {/* Performance Tips */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-tip-icon" />
            {t('feelingMap.emotionalAccess')}
          </h3>
          <div className="space-y-3">
            {(feelingMap.access_ideas || feelingMap.tips || []).map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-tip-bg rounded-2xl transition-all duration-200 hover:bg-muted"
                style={{
                  animationDelay: `${((feelingMap.core_feelings || feelingMap.emotions || []).length + index) * 100}ms`,
                }}
              >
                <div className="w-2 h-2 bg-tip-icon rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-tip-text leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Cue */}
        {feelingMap.visual && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              {t('feelingMap.visualCues')}
            </h3>
            <div className="p-4 bg-muted rounded-2xl text-center">
              <p className="text-tip-text text-lg font-medium">
                {feelingMap.visual}
              </p>
            </div>
          </div>
        )}

        {/* View Lyrics Button */}
        <div className="mb-8">
          <a
            href={`https://genius.com/search?q=${encodeURIComponent(`${feelingMap.title} ${feelingMap.artist || ''}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full p-4 bg-primary-soft hover:bg-button-primary-hover text-primary border-2 border-card-border rounded-2xl transition-all duration-200 font-semibold"
          >
            <ExternalLink className="w-5 h-5" />
            View Lyrics on Genius
          </a>
        </div>

        {/* Personal Notes */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            Personal Notes
          </h3>
          <Textarea
            value={personalNote}
            onChange={(e) => setPersonalNote(e.target.value)}
            placeholder="Add your personal notes about this song..."
            className="min-h-[100px] mb-3 rounded-2xl resize-none"
          />
          <Button
            onClick={handleSaveNote}
            variant="secondary"
            className="w-full h-12 text-base font-semibold bg-button-secondary hover:bg-button-secondary-hover rounded-2xl transition-all duration-200"
          >
            {noteSaved ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Note Saved
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                Save Note
              </div>
            )}
          </Button>
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
                {t('feelingMap.copied')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5" />
                {t('feelingMap.copyMap')}
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
                {t('feelingMap.saved')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Star className={`w-5 h-5 ${isFavorite(feelingMap) ? 'fill-current' : ''}`} />
                {isFavorite(feelingMap) ? t('feelingMap.saved') : t('feelingMap.save')}
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};