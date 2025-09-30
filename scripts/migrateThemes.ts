import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Song } from '@/types';
import { matchCanonicalTheme, type CanonicalTheme } from '@/lib/themes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const songsPath = resolve(__dirname, '../src/data/songs.json');

interface SongRecord extends Song {
  theme_detail?: string;
}

interface FallbackLog {
  id: string;
  title: string;
  original?: string;
  reason: string;
}

const toCanonical = (value: string | undefined | null) => {
  if (!value) {
    return null;
  }

  const match = matchCanonicalTheme(value);
  return { ...match, sourceValue: value.trim() };
};

const inferFromSummaryOrFeelings = (song: SongRecord) => {
  const summaryMatch = song.summary ? toCanonical(song.summary) : null;
  if (summaryMatch?.matched) {
    return { ...summaryMatch, reason: 'summary' } as const;
  }

  const feelingsText = Array.isArray(song.core_feelings)
    ? song.core_feelings.join(' ')
    : '';

  const feelingsMatch = feelingsText ? toCanonical(feelingsText) : null;
  if (feelingsMatch?.matched) {
    return { ...feelingsMatch, reason: 'core_feelings' } as const;
  }

  return null;
};

const migrate = () => {
  const raw = readFileSync(songsPath, 'utf8');
  const songs = JSON.parse(raw) as SongRecord[];

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(
    dirname(songsPath),
    `songs.json.backup-${timestamp}`,
  );
  copyFileSync(songsPath, backupPath);

  const fallbackLogs: FallbackLog[] = [];

  const migratedSongs = songs.map((song) => {
    const updated: SongRecord = { ...song };
    const themeMatch = toCanonical(song.theme);

    if (themeMatch?.matched) {
      updated.theme = themeMatch.canonical;
      updated.theme_detail = themeMatch.sourceValue;
      return updated;
    }

    if (song.theme && !themeMatch?.matched) {
      fallbackLogs.push({
        id: song.id,
        title: song.title,
        original: song.theme,
        reason: 'theme',
      });
    }

    const inferred = inferFromSummaryOrFeelings(song);

    if (inferred?.matched) {
      updated.theme = inferred.canonical;
      if (song.theme) {
        updated.theme_detail = song.theme.trim();
      }
      return updated;
    }

    const fallbackTheme: CanonicalTheme = 'Awe & contemplation';
    updated.theme = fallbackTheme;
    if (song.theme) {
      updated.theme_detail = song.theme.trim();
    }

    fallbackLogs.push({
      id: song.id,
      title: song.title,
      original: song.theme,
      reason: song.theme ? 'theme' : 'inference',
    });

    return updated;
  });

  writeFileSync(songsPath, `${JSON.stringify(migratedSongs, null, 2)}\n`, 'utf8');

  console.log(`Updated ${migratedSongs.length} songs.`);
  console.log(`Backup written to ${backupPath}.`);

  if (fallbackLogs.length) {
    console.warn('Songs defaulted to "Awe & contemplation":');
    fallbackLogs.forEach(({ id, title, original, reason }) => {
      const detail = original ? ` (original: ${original.trim()})` : '';
      console.warn(` - ${title} [${id}] via ${reason}${detail}`);
    });
  }
};

migrate();
