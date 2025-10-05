// Central helpers for translating dynamic feeling / phrase content.
// Strategy:
// 1. Deterministically slug -> camelCase token for any phrase.
// 2. Return full i18n key (songContent.feelingCards.<token>).
// 3. Allow overrides for irregular spellings.
// 4. Provide helper to attempt translation but gracefully fall back to original text.
// 5. Optionally log missing keys when VITE_I18N_DEBUG=true.

import type { TFunction } from 'i18next';

const FEELING_OVERRIDES: Record<string, string> = {
  "i've learned": 'ivelearned',
};

export const toCamelToken = (phrase: string) => phrase
  .toLowerCase()
  .replace(/[^a-z0-9\s']/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/'(\w)/g, (_, c) => c)
  .split(' ')
  .map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
  .join('');

export const feelingKey = (phrase: string): string => {
  if (!phrase) return phrase;
  const raw = phrase.trim();
  const lower = raw.toLowerCase();
  const override = FEELING_OVERRIDES[raw] || FEELING_OVERRIDES[lower];
  const slug = override || toCamelToken(raw);
  return `songContent.feelingCards.${slug}`;
};

export const translateFeeling = (t: TFunction, text: string) => {
  const key = feelingKey(text);
  const translated = t(key, text);
  if (translated === key && import.meta.env.VITE_I18N_DEBUG) {
    // eslint-disable-next-line no-console
    console.warn('[i18n-miss] feeling', key);
  }
  return translated === key ? text : translated;
};
