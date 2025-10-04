#!/usr/bin/env tsx
/**
 * Migrates the legacy local songs.json into Supabase (songs + feeling_cards).
 * Idempotent: skips songs already present (by slug) and feeling_cards already present (by song_id).
 * Usage:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run migrate:local-songs
 *   (Optionally add --dry-run to preview without writing.)
 */
import { createClient } from '@supabase/supabase-js';
// @ts-ignore - json import
import rawSongs from '../src/data/songs.json';

interface LocalSong { id: string; title: string; artist: string; summary: string; theme: string; theme_detail?: string; core_feelings: string[]; access_ideas: string[]; visual: string; }
const songs: LocalSong[] = rawSongs as LocalSong[];

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

  console.log('Fetching existing songs...');
  const { data: existingSongs, error: songsErr } = await supabase.from('songs').select('id,slug,title,artist');
  if (songsErr) throw songsErr;
  const existingBySlug = new Map<string, { id: string }>();
  existingSongs?.forEach(s => existingBySlug.set(s.slug, { id: s.id }));

  console.log('Fetching existing feeling cards (song ids)...');
  const { data: existingCards, error: cardsErr } = await supabase.from('feeling_cards').select('song_id');
  if (cardsErr) throw cardsErr;
  const existingCardIds = new Set<string>(existingCards?.map(c => c.song_id));

  const toInsertSongs: { title: string; artist: string; slug: string }[] = [];
  const plannedSongSlugToLocal: Record<string, LocalSong> = {};

  for (const s of songs) {
    const slug = slugify(`${s.title}-${s.artist}`);
    if (!existingBySlug.has(slug)) {
      toInsertSongs.push({ title: s.title, artist: s.artist, slug });
      plannedSongSlugToLocal[slug] = s;
    }
  }

  console.log(`Local songs total: ${songs.length}`);
  console.log(`Already in DB: ${songs.length - toInsertSongs.length}`);
  console.log(`Missing (to insert): ${toInsertSongs.length}`);
  if (DRY_RUN) {
    console.log('Dry run: listing first 10 planned inserts:');
    toInsertSongs.slice(0, 10).forEach(s => console.log('-', s.slug));
  } else if (toInsertSongs.length > 0) {
    console.log('Inserting songs...');
    const { data: inserted, error: insertErr } = await supabase.from('songs').insert(toInsertSongs).select('id,slug');
    if (insertErr) throw insertErr;
    inserted?.forEach(row => existingBySlug.set(row.slug, { id: row.id }));
    console.log(`Inserted ${inserted?.length || 0} songs.`);
  }

  // Refresh or map slug->id for all songs (including new ones)
  const slugToId = new Map<string, string>();
  existingBySlug.forEach((v, k) => slugToId.set(k, v.id));

  const feelingCardsToInsert: any[] = [];
  for (const s of songs) {
    const slug = slugify(`${s.title}-${s.artist}`);
    const songId = slugToId.get(slug);
    if (!songId) continue; // should not happen
    if (existingCardIds.has(songId)) continue; // card already exists
    feelingCardsToInsert.push({
      song_id: songId,
      summary: s.summary,
      theme: s.theme,
      core_feelings: s.core_feelings,
      access_ideas: s.access_ideas,
      visual: s.visual,
    });
  }

  console.log(`Missing feeling_cards to insert: ${feelingCardsToInsert.length}`);
  if (DRY_RUN) {
    console.log('Dry run: sample feeling card payload:', feelingCardsToInsert[0]);
  } else if (feelingCardsToInsert.length > 0) {
    console.log('Inserting feeling_cards in batches of 100...');
    const batchSize = 100;
    for (let i = 0; i < feelingCardsToInsert.length; i += batchSize) {
      const batch = feelingCardsToInsert.slice(i, i + batchSize);
      const { error: fcErr } = await supabase.from('feeling_cards').insert(batch);
      if (fcErr) throw fcErr;
      console.log(`Inserted feeling_cards ${i + 1} - ${i + batch.length}`);
    }
  }

  console.log('Migration complete.');
  if (DRY_RUN) console.log('No changes were written (dry run).');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});