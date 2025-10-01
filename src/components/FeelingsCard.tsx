import { Heart, CheckCircle2, Pencil, Trash2, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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

interface EditableItem {
  id: string;
  text: string;
  isCustom: boolean;
}

const generateId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

interface FeelingsCardProps {
  feelingMap: FeelingMap;
  onOpenPrepTools?: () => void;
}

export const FeelingsCard = ({ feelingMap, onOpenPrepTools }: FeelingsCardProps) => {
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
  const [coreFeelings, setCoreFeelings] = useState<EditableItem[]>([]);
  const [emotionalAccess, setEmotionalAccess] = useState<EditableItem[]>([]);
  const [visualCues, setVisualCues] = useState<EditableItem[]>([]);
  const [isAddingCoreFeeling, setIsAddingCoreFeeling] = useState(false);
  const [newCoreFeeling, setNewCoreFeeling] = useState('');
  const [editingCoreId, setEditingCoreId] = useState<string | null>(null);
  const [editingCoreValue, setEditingCoreValue] = useState('');
  const [isAddingAccessIdea, setIsAddingAccessIdea] = useState(false);
  const [newAccessIdea, setNewAccessIdea] = useState('');
  const [editingAccessId, setEditingAccessId] = useState<string | null>(null);
  const [editingAccessValue, setEditingAccessValue] = useState('');
  const [isAddingVisualCue, setIsAddingVisualCue] = useState(false);
  const [newVisualCue, setNewVisualCue] = useState('');
  const [editingVisualId, setEditingVisualId] = useState<string | null>(null);
  const [editingVisualValue, setEditingVisualValue] = useState('');
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
    const baseCoreFeelings = (feelingMap.core_feelings || feelingMap.emotions || []).map((text, index) => ({
      id: `core-base-${index}`,
      text,
      isCustom: false,
    }));

    const accessIdeasSource = feelingMap.access_ideas || feelingMap.tips || [];
    const baseAccessIdeas = accessIdeasSource.map((text, index) => ({
      id: `access-base-${index}`,
      text,
      isCustom: false,
    }));

    const visualsSource = feelingMap.visual ? [feelingMap.visual] : [];
    const baseVisuals = visualsSource.map((text, index) => ({
      id: `visual-base-${index}`,
      text,
      isCustom: false,
    }));

    setCoreFeelings(baseCoreFeelings);
    setEmotionalAccess(baseAccessIdeas);
    setVisualCues(baseVisuals);

    setIsAddingCoreFeeling(false);
    setNewCoreFeeling('');
    setEditingCoreId(null);
    setEditingCoreValue('');

    setIsAddingAccessIdea(false);
    setNewAccessIdea('');
    setEditingAccessId(null);
    setEditingAccessValue('');

    setIsAddingVisualCue(false);
    setNewVisualCue('');
    setEditingVisualId(null);
    setEditingVisualValue('');
  }, [feelingMap]);

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

  const handleAddCoreFeeling = () => {
    const trimmed = newCoreFeeling.trim();
    if (!trimmed) return;

    setCoreFeelings(prev => [
      ...prev,
      { id: generateId('core-custom'), text: trimmed, isCustom: true },
    ]);
    setNewCoreFeeling('');
    setIsAddingCoreFeeling(false);
  };

  const handleSaveCoreFeeling = () => {
    if (!editingCoreId) return;
    const trimmed = editingCoreValue.trim();
    if (!trimmed) return;

    setCoreFeelings(prev =>
      prev.map(item =>
        item.id === editingCoreId ? { ...item, text: trimmed } : item
      ),
    );
    setEditingCoreId(null);
    setEditingCoreValue('');
  };

  const handleDeleteCoreFeeling = (id: string) => {
    setCoreFeelings(prev =>
      prev.filter(item => item.id !== id || !item.isCustom),
    );
  };

  const handleAddAccessIdea = () => {
    const trimmed = newAccessIdea.trim();
    if (!trimmed) return;

    setEmotionalAccess(prev => [
      ...prev,
      { id: generateId('access-custom'), text: trimmed, isCustom: true },
    ]);
    setNewAccessIdea('');
    setIsAddingAccessIdea(false);
  };

  const handleSaveAccessIdea = () => {
    if (!editingAccessId) return;
    const trimmed = editingAccessValue.trim();
    if (!trimmed) return;

    setEmotionalAccess(prev =>
      prev.map(item =>
        item.id === editingAccessId ? { ...item, text: trimmed } : item
      ),
    );
    setEditingAccessId(null);
    setEditingAccessValue('');
  };

  const handleDeleteAccessIdea = (id: string) => {
    setEmotionalAccess(prev =>
      prev.filter(item => item.id !== id || !item.isCustom),
    );
  };

  const handleAddVisualCue = () => {
    const trimmed = newVisualCue.trim();
    if (!trimmed) return;

    setVisualCues(prev => [
      ...prev,
      { id: generateId('visual-custom'), text: trimmed, isCustom: true },
    ]);
    setNewVisualCue('');
    setIsAddingVisualCue(false);
  };

  const handleSaveVisualCue = () => {
    if (!editingVisualId) return;
    const trimmed = editingVisualValue.trim();
    if (!trimmed) return;

    setVisualCues(prev =>
      prev.map(item =>
        item.id === editingVisualId ? { ...item, text: trimmed } : item
      ),
    );
    setEditingVisualId(null);
    setEditingVisualValue('');
  };

  const handleDeleteVisualCue = (id: string) => {
    setVisualCues(prev =>
      prev.filter(item => item.id !== id || !item.isCustom),
    );
  };

  const handleCopy = async () => {
    const themeDetail = feelingMap.theme_detail ?? feelingMap.theme ?? '';
    const personalNotesSection = personalNote.trim()
      ? `\n\nPersonal notes:\n${personalNote.trim()}`
      : '';

    const coreFeelingTexts = coreFeelings.map(item => item.text.trim()).filter(Boolean);
    const coreFeelingSection = coreFeelingTexts.length
      ? coreFeelingTexts.join(', ')
      : 'None';

    const accessIdeaTexts = emotionalAccess.map(item => item.text.trim()).filter(Boolean);
    const accessIdeasSection = accessIdeaTexts.length
      ? accessIdeaTexts.map(tip => `• ${tip}`).join('\n')
      : 'None';

    const visualCueTexts = visualCues.map(item => item.text.trim()).filter(Boolean);
    const visualSection = visualCueTexts.length === 0
      ? 'Visual cues: None'
      : visualCueTexts.length === 1
        ? `Visual cue: ${visualCueTexts[0]}`
        : `Visual cues:\n${visualCueTexts.map(cue => `• ${cue}`).join('\n')}`;

    const vibeSuffix = feelingMap.isVibeBasedMap ? '\n\n(Generated from vibe-based mapping)' : '';

    const text = `${feelingMap.title}${feelingMap.artist ? ` — ${feelingMap.artist}` : ''}

${feelingMap.summary}
${themeDetail}${feelingMap.theme_detail ? `\nCanonical theme: ${feelingMap.theme}` : ''}

Core feeling arc: ${coreFeelingSection}

Performance tips:
${accessIdeasSection}

${visualSection}${vibeSuffix}${personalNotesSection}`;

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
            {coreFeelings.map((item, index) => (
              <div key={item.id} className="group">
                {editingCoreId === item.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingCoreValue}
                      onChange={(e) => setEditingCoreValue(e.target.value)}
                      className="h-9 w-44 sm:w-52"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveCoreFeeling}
                      disabled={!editingCoreValue.trim()}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCoreId(null);
                        setEditingCoreValue('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emotion-bg text-emotion-text border border-emotion-border rounded-full text-sm font-medium shadow-emotion transition-all duration-200"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span>{item.text}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCoreId(item.id);
                        setEditingCoreValue(item.text);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
                      aria-label="Edit core feeling"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCoreFeeling(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
                        aria-label="Delete core feeling"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {isAddingCoreFeeling ? (
            <div className="flex items-center gap-2 pt-3">
              <Input
                value={newCoreFeeling}
                onChange={(e) => setNewCoreFeeling(e.target.value)}
                placeholder="Add a feeling"
                className="h-9 w-44 sm:w-52"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleAddCoreFeeling}
                disabled={!newCoreFeeling.trim()}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingCoreFeeling(false);
                  setNewCoreFeeling('');
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingCoreFeeling(true)}
              className="mt-3 h-9 w-9 p-0 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
              <span className="sr-only">Add custom feeling</span>
            </Button>
          )}
        </div>

        {/* Performance Tips */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <img src={lightbulbIcon} alt="Emotional access icon" className="w-6 h-6 object-contain" />
            {t('feelingMap.emotionalAccess')}
          </h3>
          <div className="space-y-3">
            {emotionalAccess.map((item, index) => (
              <div key={item.id} className="group">
                {editingAccessId === item.id ? (
                  <div className="p-4 bg-tip-bg rounded-2xl flex flex-col gap-2">
                    <Textarea
                      value={editingAccessValue}
                      onChange={(e) => setEditingAccessValue(e.target.value)}
                      className="min-h-[80px]"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        onClick={handleSaveAccessIdea}
                        disabled={!editingAccessValue.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingAccessId(null);
                          setEditingAccessValue('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-start justify-between gap-3 p-4 bg-tip-bg rounded-2xl transition-all duration-200"
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="w-2 h-2 bg-tip-icon rounded-full mt-2 flex-shrink-0" />
                      <p className="text-tip-text leading-relaxed">{item.text}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccessId(item.id);
                          setEditingAccessValue(item.text);
                        }}
                        className="p-1.5 rounded-full hover:bg-muted"
                        aria-label="Edit access idea"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {item.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAccessIdea(item.id)}
                          className="p-1.5 rounded-full hover:bg-muted"
                          aria-label="Delete access idea"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {isAddingAccessIdea ? (
            <div className="mt-3 p-4 bg-tip-bg rounded-2xl space-y-3">
              <Textarea
                value={newAccessIdea}
                onChange={(e) => setNewAccessIdea(e.target.value)}
                placeholder="Add your own idea"
                className="min-h-[80px]"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={handleAddAccessIdea}
                  disabled={!newAccessIdea.trim()}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingAccessIdea(false);
                    setNewAccessIdea('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingAccessIdea(true)}
              className="mt-3 h-9 w-9 p-0 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
              <span className="sr-only">Add custom idea</span>
            </Button>
          )}
        </div>

        {/* Visual Cues */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <img src={visualCueIcon} alt="Visual cue icon" className="w-6 h-6 object-contain" />
            {t('feelingMap.visualCues')}
          </h3>
          {visualCues.length > 0 ? (
            <div className="space-y-3">
              {visualCues.map((item, index) => (
                <div key={item.id} className="group">
                  {editingVisualId === item.id ? (
                    <div className="p-4 bg-muted rounded-2xl space-y-3">
                      <Textarea
                        value={editingVisualValue}
                        onChange={(e) => setEditingVisualValue(e.target.value)}
                        className="min-h-[80px]"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={handleSaveVisualCue}
                          disabled={!editingVisualValue.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingVisualId(null);
                            setEditingVisualValue('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="p-4 bg-muted rounded-2xl flex items-start justify-between gap-3"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <p className="text-tip-text text-lg font-medium flex-1">
                        {item.text}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVisualId(item.id);
                            setEditingVisualValue(item.text);
                          }}
                          className="p-1.5 rounded-full hover:bg-muted"
                          aria-label="Edit visual cue"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteVisualCue(item.id)}
                            className="p-1.5 rounded-full hover:bg-muted"
                            aria-label="Delete visual cue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">
              No visual cues yet—add your own below.
            </p>
          )}
          {isAddingVisualCue ? (
            <div className="mt-3 p-4 bg-muted rounded-2xl space-y-3">
              <Textarea
                value={newVisualCue}
                onChange={(e) => setNewVisualCue(e.target.value)}
                placeholder="Describe the imagery you want to remember"
                className="min-h-[80px]"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  onClick={handleAddVisualCue}
                  disabled={!newVisualCue.trim()}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingVisualCue(false);
                    setNewVisualCue('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingVisualCue(true)}
              className="mt-3 h-9 w-9 p-0 flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
              <span className="sr-only">Add custom visual cue</span>
            </Button>
          )}
        </div>

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
        <div className="flex flex-wrap gap-3 sm:flex-nowrap">
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
          
          {onOpenPrepTools && (
            <Button
              onClick={onOpenPrepTools}
              variant="secondary"
              className="flex-1 h-12 text-base font-semibold bg-button-secondary hover:bg-button-secondary-hover rounded-2xl transition-all duration-200"
            >
              Performance Prep Tools
            </Button>
          )}
          <Button
            onClick={handleToggleFavorite}
            variant="secondary"
            className={`flex-1 h-12 px-6 font-semibold rounded-2xl transition-all duration-200 ${
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
