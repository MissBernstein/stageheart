import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Vibe } from '@/types';
import vibesData from '@/data/vibes.json';

interface VibePickerProps {
  onVibeSelect: (vibe: Vibe) => void;
  songTitle: string;
  artist?: string;
}

export const VibePicker = ({ onVibeSelect, songTitle, artist }: VibePickerProps) => {
  const [selectedVibeId, setSelectedVibeId] = useState<string>('');
  const { t } = useTranslation();
  const vibes: Vibe[] = vibesData;

  const handleGenerate = () => {
    const selectedVibe = vibes.find(v => v.id === selectedVibeId);
    if (selectedVibe) {
      onVibeSelect(selectedVibe);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-card rounded-3xl p-8 shadow-card border border-card-border">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-card-foreground mb-2">
            {t('vibePicker.unknownTitle')}
          </h3>
          <p className="text-muted-foreground">
            {t('vibePicker.unknownSubtitle', { song: songTitle, artist: artist ? ` ${t('common.by')} ${artist}` : '' })}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="vibe" className="block text-sm font-medium text-card-foreground mb-2">
              {t('vibePicker.chooseLabel')}
            </label>
            <Select value={selectedVibeId} onValueChange={setSelectedVibeId}>
              <SelectTrigger className="h-12 text-lg bg-input border-input-border">
                <SelectValue placeholder={t('vibePicker.placeholder') || ''} />
              </SelectTrigger>
              <SelectContent className="bg-card border-card-border">
                {vibes.map((vibe) => (
                  <SelectItem 
                    key={vibe.id} 
                    value={vibe.id}
                    className="text-lg py-3 hover:bg-primary-soft"
                  >
                    {t(`vibes.${vibe.id}`, vibe.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AnimatedButton
            onClick={handleGenerate}
            disabled={!selectedVibeId}
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary-hover text-primary-foreground rounded-2xl transition-all duration-200"
          >
            {t('vibePicker.generate')}
          </AnimatedButton>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          {t('vibePicker.note')}
        </p>

        <div className="text-center mt-4">
          <Link to="/add" className="text-sm text-primary hover:text-primary-hover underline">
            {t('vibePicker.submitNew')}
          </Link>
        </div>
      </div>
    </div>
  );
};
