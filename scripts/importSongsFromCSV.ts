/**
 * Import songs from CSV file to Supabase database
 * Maps themes to canonical themes from src/lib/themes.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { matchCanonicalTheme, CANONICAL_THEMES } from '../src/lib/themes';
import { generateSongSlug } from '../src/lib/songUtils';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Extended canonical themes based on CSV data
const EXTENDED_THEMES = [
  ...CANONICAL_THEMES,
  'Drama & inner turmoil',
  'Rebellion & defiance',
  'Grief & solace'
] as const;

type ExtendedTheme = typeof EXTENDED_THEMES[number];

function mapToCanonicalTheme(theme: string): ExtendedTheme {
  const normalized = theme.trim().toLowerCase();
  
  // Direct mapping for new themes
  if (normalized.includes('drama') || normalized.includes('turmoil') || normalized.includes('struggle')) {
    return 'Drama & inner turmoil';
  }
  if (normalized.includes('rebellion') || normalized.includes('defiance') || normalized.includes('unstoppable')) {
    return 'Rebellion & defiance';
  }
  if (normalized.includes('grief') || normalized.includes('solace') || normalized.includes('comfort') && normalized.includes('pain')) {
    return 'Grief & solace';
  }
  
  // Try canonical theme matching
  const result = matchCanonicalTheme(theme);
  if (result.matched) {
    return result.canonical;
  }
  
  // Fallback mapping based on keywords
  if (normalized.includes('freedom') || normalized.includes('redemption') || normalized.includes('breaking free')) {
    return 'Freedom / breaking free';
  }
  if (normalized.includes('love') && (normalized.includes('tender') || normalized.includes('devotion') || normalized.includes('romantic'))) {
    return 'Tender love & devotion';
  }
  if (normalized.includes('faith') || normalized.includes('praise') || normalized.includes('gospel') || normalized.includes('spiritual')) {
    return 'Joyful praise & faith';
  }
  if (normalized.includes('unity') || normalized.includes('empowerment') || normalized.includes('togetherness')) {
    return 'Hopeful unity & empowerment';
  }
  if (normalized.includes('nostalgia') || normalized.includes('holiday') || normalized.includes('christmas')) {
    return 'Nostalgia & holiday warmth';
  }
  if (normalized.includes('identity') || normalized.includes('authentic') || normalized.includes('self')) {
    return 'Identity & authenticity';
  }
  if (normalized.includes('resilience') || normalized.includes('striving') || normalized.includes('triumph') || normalized.includes('victory')) {
    return 'Resilience & striving';
  }
  if (normalized.includes('yearning') || normalized.includes('reunion') || normalized.includes('longing') && normalized.includes('home')) {
    return 'Yearning & reunion';
  }
  if (normalized.includes('playful') || normalized.includes('flirt') || normalized.includes('groove') || normalized.includes('sass')) {
    return 'Playful groove & flirtation';
  }
  if (normalized.includes('support') || normalized.includes('comfort') && !normalized.includes('grief')) {
    return 'Unconditional support & comfort';
  }
  if (normalized.includes('peace') || normalized.includes('solitude') || normalized.includes('bittersweet')) {
    return 'Bittersweet peace & solitude';
  }
  
  // Default fallback
  return 'Awe & contemplation';
}

function parseArrayField(field: string | undefined): string[] {
  if (!field || field.trim() === '') return [];
  
  try {
    // Try parsing as JSON array
    const parsed = JSON.parse(field);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // If not JSON, try splitting by common delimiters
    if (field.includes('|')) {
      return field.split('|').map(s => s.trim()).filter(Boolean);
    }
    if (field.includes(',') && !field.startsWith('[')) {
      return field.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  
  return [field.trim()];
}

async function importSongs(csvPath: string) {
  console.log('Reading CSV file...');
  const csvContent = readFileSync(csvPath, 'utf-8');
  
  console.log('Parsing CSV...');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true // Handle UTF-8 BOM
  });
  
  console.log(`Found ${records.length} songs to import`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const record of records) {
    const artist = record.artist?.trim();
    const title = record.title?.trim();
    
    if (!artist || !title) {
      console.warn(`Skipping song with missing artist or title:`, record);
      skipCount++;
      continue;
    }
    
    const slug = generateSongSlug(artist, title);
    
    // Check if song already exists
    const { data: existingSong } = await supabase
      .from('songs')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    
    if (existingSong) {
      console.log(`Skipping duplicate: ${artist} - ${title}`);
      skipCount++;
      continue;
    }
    
    try {
      // Map theme to canonical
      const originalTheme = record.theme?.trim() || 'Awe & contemplation';
      const canonicalTheme = mapToCanonicalTheme(originalTheme);
      
      // Parse array fields
      const coreFeelings = parseArrayField(record.core_feelings);
      const accessIdeas = parseArrayField(record.access_ideas);
      
      // Insert song
      const { data: song, error: songError } = await supabase
        .from('songs')
        .insert({
          title,
          artist,
          slug,
          song_title: title,
          version_label: record.version_label?.trim() || null,
          is_cover: false
        })
        .select()
        .single();
      
      if (songError) {
        console.error(`Error inserting song ${artist} - ${title}:`, songError);
        errorCount++;
        continue;
      }
      
      // Insert feeling card
      const { error: cardError } = await supabase
        .from('feeling_cards')
        .insert({
          song_id: song.id,
          summary: record.summary?.trim() || '',
          theme: canonicalTheme,
          core_feelings: coreFeelings,
          access_ideas: accessIdeas,
          visual: record.visual?.trim() || '🎵'
        });
      
      if (cardError) {
        console.error(`Error inserting feeling card for ${artist} - ${title}:`, cardError);
        // Clean up song
        await supabase.from('songs').delete().eq('id', song.id);
        errorCount++;
        continue;
      }
      
      console.log(`✓ Imported: ${artist} - ${title} (${canonicalTheme})`);
      successCount++;
      
    } catch (error) {
      console.error(`Unexpected error importing ${artist} - ${title}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log(`Total records: ${records.length}`);
  console.log(`Successfully imported: ${successCount}`);
  console.log(`Skipped (duplicates): ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
}

// Run the import
const csvPath = process.argv[2] || 'user-uploads://stageheart_songs_import_READY_20251005_1609.csv';
importSongs(csvPath).catch(console.error);
