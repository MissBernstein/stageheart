import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

// Sections we enforce parity on
const SECTIONS = [
  'songContent.feelingCards',
  'songContent.summaries',
  'songContent.accessIdeas',
  'songContent.visualCues',
  'songContent.themeDetail',
];

function loadLocale(lang: string) {
  const p = path.resolve(__dirname, '..', 'src', 'i18n', 'locales', `${lang}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, any>;
}

function getSection(obj: any, pathStr: string): Record<string, any> {
  return pathStr.split('.').reduce((acc, part) => (acc && acc[part]) ? acc[part] : {}, obj) || {};
}

describe('i18n parity (en vs de)', () => {
  const en = loadLocale('en');
  const de = loadLocale('de');

  for (const section of SECTIONS) {
    it(`has matching keys for ${section}`, () => {
      const enSec = getSection(en, section);
      const deSec = getSection(de, section);
      const enKeys = Object.keys(enSec).sort();
      const deKeys = Object.keys(deSec).sort();

      const missingInDe = enKeys.filter(k => !deSec.hasOwnProperty(k));
      const extraInDe = deKeys.filter(k => !enSec.hasOwnProperty(k));

      if (missingInDe.length || extraInDe.length) {
        const details = [
          missingInDe.length ? `Missing in de (${missingInDe.length}): ${missingInDe.slice(0,20).join(', ')}${missingInDe.length>20?'…':''}` : null,
          extraInDe.length ? `Extra in de (${extraInDe.length}): ${extraInDe.slice(0,20).join(', ')}${extraInDe.length>20?'…':''}` : null,
        ].filter(Boolean).join('\n');
        expect.fail(`Key parity failed for ${section}\n${details}`);
      }
      expect(deKeys.length).toBe(enKeys.length); // defensive
    });
  }
});
