import { useState } from 'react';
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
            I don't know that one yet!
          </h3>
          <p className="text-muted-foreground">
            No worries — pick a vibe for <strong>"{songTitle}"</strong>
            {artist && ` by ${artist}`} and I'll still help:
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="vibe" className="block text-sm font-medium text-card-foreground mb-2">
              Choose a vibe
            </label>
            <Select value={selectedVibeId} onValueChange={setSelectedVibeId}>
              <SelectTrigger className="h-12 text-lg bg-input border-input-border">
                <SelectValue placeholder="Select how this song feels..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-card-border">
                {vibes.map((vibe) => (
                  <SelectItem 
                    key={vibe.id} 
                    value={vibe.id}
                    className="text-lg py-3 hover:bg-primary-soft"
                  >
                    {vibe.label}
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
            Generate Vibe-Based Map
          </AnimatedButton>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          This will be a vibe-based map (no specific lyrics analysis)
        </p>
      </div>
    </div>
  );
};
