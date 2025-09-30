import { describe, expect, it } from 'vitest';

import { CANONICAL_THEMES, canonicalizeTheme } from '@/lib/themes';

describe('canonicalizeTheme', () => {
  const cases: Array<{ input: string; expected: string }> = [
    { input: 'Unconditional support and comfort.', expected: 'Unconditional support & comfort' },
    { input: 'Faith, reassurance, surrender.', expected: 'Joyful praise & faith' },
    { input: 'Courage and collective strength.', expected: 'Hopeful unity & empowerment' },
    { input: 'Breaking free and celebrating after hardship.', expected: 'Freedom / breaking free' },
    { input: 'Playful longing and upbeat flirtation.', expected: 'Playful groove & flirtation' },
    { input: 'Vulnerable, whole-hearted love.', expected: 'Tender love & devotion' },
    { input: 'Gentle nostalgia and holiday hope.', expected: 'Nostalgia & holiday warmth' },
    { input: 'Bittersweet peace and solitude.', expected: 'Bittersweet peace & solitude' },
    { input: 'Yearning and hope for reunion.', expected: 'Yearning & reunion' },
    { input: 'Identity, authenticity, vulnerability.', expected: 'Identity & authenticity' },
    { input: 'Resilience, self-betterment, motion.', expected: 'Resilience & striving' },
    { input: 'Gentle holiness and serene comfort.', expected: 'Awe & contemplation' },
  ];

  cases.forEach(({ input, expected }) => {
    it(`maps "${input}" to ${expected}`, () => {
      const result = canonicalizeTheme(input);
      expect(result.canonical).toBe(expected);
      expect(result.detail).toBe(input.trim());
    });
  });

  it('returns fallback when nothing matches', () => {
    const result = canonicalizeTheme('Completely unique wording.');
    expect(CANONICAL_THEMES).toContain(result.canonical);
    expect(result.canonical).toBe('Awe & contemplation');
    expect(result.detail).toBe('Completely unique wording.');
  });
});
