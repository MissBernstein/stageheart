import { WarmupRequest, WARMUP_VIBE_LABELS, TECHNIQUE_LABELS } from '@/lib/warmupGenerator';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

interface WarmupCriteriaPreviewProps {
  request: WarmupRequest;
}

export const WarmupCriteriaPreview = ({ request }: WarmupCriteriaPreviewProps) => {
  const chips: string[] = [WARMUP_VIBE_LABELS[request.vibe]];

  if (request.voiceType) {
    chips.push(capitalize(request.voiceType));
  }

  request.techniques.forEach(technique => {
    chips.push(TECHNIQUE_LABELS[technique]);
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
