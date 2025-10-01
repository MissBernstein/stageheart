import { describe, expect, it } from 'vitest';
import {
  generateWarmupPlan,
  WARMUP_VIBE_OPTIONS,
} from '../warmupGenerator';

const getVibeId = (label: string) =>
  WARMUP_VIBE_OPTIONS.find(option => option.label === label)?.id ?? 'bright_playful';

describe('generateWarmupPlan', () => {
  it('uses default range when voice type is null', () => {
    const plan = generateWarmupPlan({
      vibe: getVibeId('Warm / Emotional'),
      voiceType: null,
      techniques: [],
    });

    expect(plan.vocalWarmups.length).toBeGreaterThan(0);
    expect(plan.vocalWarmups.every(item => !item.includes('undefined'))).toBe(true);
    expect(plan.duration).toBeGreaterThan(0);
  });

  it('applies tenor belting specifics', () => {
    const plan = generateWarmupPlan({
      vibe: getVibeId('Strong / Powerful'),
      voiceType: 'tenor',
      techniques: ['belting'],
    });

    const hasRange = plan.vocalWarmups.some(item => item.includes('C3–E5'));
    const mentionsBelt = plan.vocalWarmups.some(item => /belt|chest/i.test(item));

    expect(hasRange).toBe(true);
    expect(mentionsBelt).toBe(true);
    expect(plan.duration).toBeGreaterThan(17); // base 17 + adjustments
  });

  it('adds head-voice overlays for soprano', () => {
    const plan = generateWarmupPlan({
      vibe: getVibeId('Bright / Playful'),
      voiceType: 'soprano',
      techniques: ['head_voice'],
    });

    const hasRange = plan.vocalWarmups.some(item => item.includes('A3–C6'));
    const mentionsSirens = plan.vocalWarmups.some(item => /siren|slide/i.test(item));

    expect(hasRange).toBe(true);
    expect(mentionsSirens).toBe(true);
    expect(plan.duration).toBeGreaterThan(14);
  });
});
