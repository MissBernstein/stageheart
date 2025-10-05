#!/usr/bin/env tsx
/**
 * Extract song narrative fields (summary, access ideas, visual) and emit translation key stubs.
 * Usage: npx tsx scripts/extractSongNarrative.ts > i18n-narrative-export.json
 */
import fs from 'fs';
import path from 'path';

interface SongLike { id:string; title:string; summary:string; access_ideas:string[]; visual:string; }

const songsPath = path.resolve(__dirname, '../src/data/songs.json');
let localSongs: SongLike[] = [];
try {
  const raw = fs.readFileSync(songsPath, 'utf8');
  localSongs = JSON.parse(raw);
} catch {}

const toCamel = (s:string) => s.toLowerCase()
  .replace(/[^a-z0-9\s]/g,' ')
  .replace(/\s+/g,' ')
  .trim()
  .split(' ') 
  .map((w,i)=> i? w.charAt(0).toUpperCase()+w.slice(1): w)
  .join('');

const exportObj: Record<string, any> = { summaries:{}, accessIdeas:{}, visuals:{} };

for (const s of localSongs) {
  const baseKey = toCamel(s.id || s.title);
  if (s.summary) exportObj.summaries[baseKey] = s.summary;
  if (Array.isArray(s.access_ideas)) {
    s.access_ideas.forEach((idea, idx) => {
      const ideaKey = `${baseKey}_${idx}`;
      exportObj.accessIdeas[ideaKey] = idea;
    });
  }
  if (s.visual) exportObj.visuals[baseKey] = s.visual;
}

process.stdout.write(JSON.stringify(exportObj, null, 2));
