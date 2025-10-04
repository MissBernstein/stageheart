import { WarmupRequest, WARMUP_VIBE_OPTIONS } from '@/lib/warmupGenerator';
import { useTranslation } from 'react-i18next';
import type { Technique } from '@/lib/warmupGenerator';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

interface WarmupCriteriaPreviewProps {
  request: WarmupRequest;
}

export const WarmupCriteriaPreview = ({ request }: WarmupCriteriaPreviewProps) => {
  const { t } = useTranslation();
  const vibeOption = WARMUP_VIBE_OPTIONS.find(o => o.id === request.vibe);
  const chips: string[] = [vibeOption ? t(vibeOption.labelKey) : request.vibe];

  if (request.voiceType) {
    chips.push(capitalize(request.voiceType));
  }

  request.techniques.forEach((technique: Technique) => {
    // technique translation keys already exist (e.g., prep.belting, prep.headVoice)
    const key = technique === 'belting' ? 'prep.belting' : 'prep.headVoice';
    chips.push(t(key));
  });

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(label => (
        <span
          key={label}
          className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm text-primary-foreground/90"
        >
          {label}
        </span>
      ))}
    </div>
  );
};
