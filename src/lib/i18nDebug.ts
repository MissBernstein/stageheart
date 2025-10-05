// i18nDebug.ts
// Helper to translate narrative keys with optional debug logging of missing translations.
// Activate by starting the app with VITE_I18N_DEBUG=true
import type { TFunction } from 'i18next';

const seenMissing = new Set<string>();

function shouldDebug(): boolean {
  // Vite in-browser exposes as string; treat any truthy non 'false' value as enabled
  // @ts-ignore - import.meta.env exists in Vite
  return !!import.meta.env.VITE_I18N_DEBUG;
}

export function translateNarrative(t: TFunction, key: string, fallback: string) {
  let value = t(key, fallback) as string;
  if (value === key) {
    if (shouldDebug() && !seenMissing.has(key)) {
      // eslint-disable-next-line no-console
      console.warn('[i18n-miss:narrative]', key);
      seenMissing.add(key);
    }
    return fallback;
  }
  if (value.startsWith('__TODO__ ')) value = value.slice(9); // user-friendly display
  return value;
}
