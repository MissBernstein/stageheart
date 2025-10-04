#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
// Simple diff script: compares static songs.json vs DB songs by title+artist (case-insensitive)
import songs from '../src/data/songs.json';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  process.exit(1);
}

interface StaticSong { title: string; artist: string; summary: string; theme: string; core_feelings: string[]; access_ideas: string[]; visual: string; }

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('songs').select('id,title,artist,created_at');
  if (error) throw error;
  const existing = new Map<string, string>();
  data.forEach(row => existing.set((row.title.trim().toLowerCase()+'__'+row.artist.trim().toLowerCase()), row.id));
  const missing: StaticSong[] = (songs as StaticSong[]).filter(s => !existing.has((s.title.trim().toLowerCase()+'__'+s.artist.trim().toLowerCase())));
  if (missing.length === 0) {
    console.log('All static songs already present in DB.');
    return;
  }
  console.log(`Missing ${missing.length} songs. Preview (first 10):`);
  missing.slice(0,10).forEach(s => console.log(`- ${s.title} :: ${s.artist}`));
  if (process.argv.includes('--insert')) {
    console.log('Inserting...');
    for (const m of missing) {
      const slug = (m.title+'-'+m.artist).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
      const { error: insertErr } = await supabase.from('songs').insert({ title: m.title, artist: m.artist, slug });
      if (insertErr) console.error('Insert error for', m.title, insertErr.message);
      else console.log('Inserted', m.title);
    }
  } else {
    console.log('Run again with --insert to add them.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });