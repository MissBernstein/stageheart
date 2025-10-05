#!/usr/bin/env tsx
/**
 * i18nSync.ts
 * Populates English locale (en.json) with narrative song content keys derived from songs.json.
 * Step A of localization rollout. Does NOT touch German so fallback keeps working.
 * Safe: will not overwrite existing non-empty keys.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LocaleRoot = any;

const rootDir = path.resolve(__dirname, '..');
const songsPath = path.join(rootDir, 'src/data/songs.json');
const enPath = path.join(rootDir, 'src/i18n/locales/en.json');

function toCamel(id: string) {
  return id.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function ensure(obj: any, pathStr: string, init: any) {
  const parts = pathStr.split('.');
  let cur = obj;
  for (const p of parts) {
    if (!(p in cur)) cur[p] = {};
    cur = cur[p];
  }
  return cur;
}

function main() {
  if (!fs.existsSync(songsPath)) {
    console.error('songs.json not found');
    process.exit(1);
  }
  const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8')) as any[];
  const en: LocaleRoot = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const songContent = ensure(en, 'songContent', {});
  const summaries = songContent.summaries = songContent.summaries || {};
  const accessIdeas = songContent.accessIdeas = songContent.accessIdeas || {};
  const visualCues = songContent.visualCues = songContent.visualCues || {};
  const themeDetail = songContent.themeDetail = songContent.themeDetail || {};

  let added = 0;
  for (const s of songs) {
    const id = s.id || toCamel(s.title);
    if (s.summary && !summaries[id]) { summaries[id] = s.summary; added++; }
    if (s.theme_detail && !themeDetail[id]) { themeDetail[id] = s.theme_detail; added++; }
    if (Array.isArray(s.access_ideas)) {
      s.access_ideas.forEach((idea: string, idx: number) => {
        const key = `${id}_${idx}`;
        if (!accessIdeas[key]) { accessIdeas[key] = idea; added++; }
      });
    }
    if (s.visual) {
      const vKey = `${id}_0`; // Align with FeelingsCard indexing pattern
      if (!visualCues[vKey]) { visualCues[vKey] = s.visual; added++; }
    }
  }

  if (added > 0) {
    fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
    console.log(`i18nSync: Added ${added} new narrative keys to en.json`);
  } else {
    console.log('i18nSync: No new keys to add');
  }
}

main();