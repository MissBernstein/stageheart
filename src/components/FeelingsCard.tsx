import { Heart, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import themeIcon from '@/assets/themeicon.png';
import lightbulbIcon from '@/assets/lightbulbicon.png';
import visualCueIcon from '@/assets/visualcueicon.png';
import headphonesIcon from '@/assets/headphonesicon.png';
import personalNotesIcon from '@/assets/personalnotesicon.png';
import generalHeartIcon from '@/assets/generalhearticon.png';

import { FeelingMap } from '@/types';
import { useFavorites } from '@/hooks/useFavorites';
import { usePersonalNotes } from '@/hooks/usePersonalNotes';
import { FavoriteCategoryModal } from '@/components/FavoriteCategoryModal';
import { useToast } from '@/hooks/use-toast';

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
  const [noteSaved, setNoteSaved] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [lastSavedNote, setLastSavedNote] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const noteInitRef = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enableAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (enableAutoSaveRef.current) {
      clearTimeout(enableAutoSaveRef.current);
      enableAutoSaveRef.current = null;
    }

    noteInitRef.current = true;
    const existingNote = getNote(feelingMap);
    setPersonalNote(existingNote);
    setLastSavedNote(existingNote);
    setNoteSaved(true);
    setIsSavingNote(false);

    enableAutoSaveRef.current = setTimeout(() => {
      noteInitRef.current = false;
    }, 0);

    return () => {
      noteInitRef.current = true;
      if (enableAutoSaveRef.current) {
        clearTimeout(enableAutoSaveRef.current);
        enableAutoSaveRef.current = null;
      }
    };
  }, [feelingMap, getNote]);

  useEffect(() => {
    if (noteInitRef.current) {
      return;
    }

    if (personalNote === lastSavedNote) {
      setIsSavingNote(false);
      setNoteSaved(true);
      return;
    }

    setIsSavingNote(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote(feelingMap, personalNote);
      setLastSavedNote(personalNote);
      setIsSavingNote(false);
      setNoteSaved(true);
      saveTimeoutRef.current = null;
    }, 600);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [personalNote, lastSavedNote, feelingMap, saveNote]);

  const handleCopy = async () => {
    const themeDetail = feelingMap.theme_detail ?? feelingMap.theme ?? '';
    const personalNotesSection = personalNote.trim()
      ? `\n\nPersonal notes:\n${personalNote.trim()}`
      : '';
    const text = `${feelingMap.title}${feelingMap.artist ? ` — ${feelingMap.artist}` : ''}

${feelingMap.summary}
${themeDetail}${feelingMap.theme_detail ? `\nCanonical theme: ${feelingMap.theme}` : ''}

Core feeling arc: ${feelingMap.core_feelings?.join(', ') || feelingMap.emotions?.join(', ')}

Performance tips:
${(feelingMap.access_ideas || feelingMap.tips)?.map(tip => `• ${tip}`).join('\n')}

Visual cue: ${feelingMap.visual || ''}${feelingMap.isVibeBasedMap ? '\n\n(Generated from vibe-based mapping)' : ''}${personalNotesSection}`;

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
      setShowCategoryModal(true);
    }
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
        {(feelingMap.theme_detail || feelingMap.theme) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <img src={themeIcon} alt="Theme icon" className="w-6 h-6 object-contain" />
              {t('feelingMap.theme')}
            </h3>
            {feelingMap.theme_detail && (
              <p className="text-muted-foreground font-medium">
                {feelingMap.theme_detail}
              </p>
            )}
            {feelingMap.theme && (
              <p className="text-xs text-muted-foreground/80 mt-2 uppercase tracking-wide">
                Canonical: {feelingMap.theme}
              </p>
            )}
          </div>
        )}

        {/* Core Feelings Arc */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <img src={generalHeartIcon} alt="Core feelings icon" className="w-6 h-6 object-contain" />
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
            <img src={lightbulbIcon} alt="Emotional access icon" className="w-6 h-6 object-contain" />
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
              <img src={visualCueIcon} alt="Visual cue icon" className="w-6 h-6 object-contain" />
              {t('feelingMap.visualCues')}
            </h3>
            <div className="p-4 bg-muted rounded-2xl text-center">
              <p className="text-tip-text text-lg font-medium">
                {feelingMap.visual}
              </p>
            </div>
          </div>
        )}

        {/* Listen & Learn Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <img src={headphonesIcon} alt="Listen and learn icon" className="w-6 h-6 object-contain" />
            Listen & Learn
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`https://listen.tidal.com/search?q=${encodeURIComponent(`${feelingMap.title} ${feelingMap.artist || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-4 bg-primary-soft hover:bg-button-primary-hover text-primary border-2 border-card-border rounded-2xl transition-all duration-200 font-semibold"
            >
              Listen on Tidal
            </a>
            <a
              href={`https://genius.com/search?q=${encodeURIComponent(`${feelingMap.title} ${feelingMap.artist || ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-4 bg-primary-soft hover:bg-button-primary-hover text-primary border-2 border-card-border rounded-2xl transition-all duration-200 font-semibold"
            >
              View Lyrics on Genius
            </a>
          </div>
        </div>

        {/* Personal Notes */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <img src={personalNotesIcon} alt="Personal notes icon" className="w-6 h-6 object-contain" />
            Personal Notes
          </h3>
          <div className="relative mb-3">
            <Textarea
              value={personalNote}
              onChange={(e) => {
                setPersonalNote(e.target.value);
                setNoteSaved(false);
                setIsSavingNote(true);
              }}
              placeholder="Add your personal notes about this song..."
              className="min-h-[100px] rounded-2xl resize-none pr-10"
            />
            <div className="pointer-events-none absolute bottom-3 right-3">
              {isSavingNote ? (
                <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              ) : noteSaved ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : null}
            </div>
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
                {t('feelingMap.copied')}
              </div>
            ) : (
              t('feelingMap.copyMap')
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
                <Heart
                  className="w-5 h-5"
                  fill={isFavorite(feelingMap) ? 'currentColor' : 'none'}
                />
                {isFavorite(feelingMap) ? t('feelingMap.saved') : t('feelingMap.save')}
              </div>
            )}
          </Button>
        </div>
      </div>

      <FavoriteCategoryModal
        song={feelingMap}
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
      />
    </div>
  );
};
