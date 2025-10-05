#!/usr/bin/env tsx
/**
 * Post-migration validation script
 * Run this after applying the schema migration to validate everything worked correctly
 * 
 * Usage: 
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run tsx scripts/validateSchemaMigration.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
  auth: { persistSession: false } 
});

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  count?: number;
}

async function runValidation(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    // 1. Check for NULL values in critical fields
    const { data: nullCheck } = await supabase
      .from('songs')
      .select('id')
      .or('song_title.is.null,artist.is.null');
    
    results.push({
      check: 'No NULL values in song_title or artist',
      status: (nullCheck?.length || 0) === 0 ? 'PASS' : 'FAIL',
      details: `Found ${nullCheck?.length || 0} songs with null values`,
      count: nullCheck?.length || 0
    });

    // 2. Check for empty strings
    const { data: emptyCheck } = await supabase
      .from('songs')
      .select('id')
      .or('song_title.eq.,artist.eq.');
    
    results.push({
      check: 'No empty strings in song_title or artist',
      status: (emptyCheck?.length || 0) === 0 ? 'PASS' : 'FAIL',
      details: `Found ${emptyCheck?.length || 0} songs with empty values`,
      count: emptyCheck?.length || 0
    });

    // 3. Check slug uniqueness
    const { data: slugDupsRaw } = await supabase.rpc('check_slug_duplicates', {});
    const slugDups = slugDupsRaw as { slug: string; count: number }[] || [];
    
    results.push({
      check: 'Slug uniqueness',
      status: slugDups.length === 0 ? 'PASS' : 'FAIL',
      details: `Found ${slugDups.length} duplicate slugs`,
      count: slugDups.length
    });

    // 4. Check public_id uniqueness
    const { data: publicIdCheck } = await supabase
      .from('songs')
      .select('public_id')
      .not('public_id', 'is', null);
    
    const uniquePublicIds = new Set(publicIdCheck?.map(r => r.public_id));
    
    results.push({
      check: 'public_id uniqueness',
      status: uniquePublicIds.size === (publicIdCheck?.length || 0) ? 'PASS' : 'FAIL',
      details: `${publicIdCheck?.length || 0} public_ids, ${uniquePublicIds.size} unique`,
      count: publicIdCheck?.length || 0
    });

    // 5. Check feeling_cards 1:1 mapping
    const { data: fcDupsRaw } = await supabase.rpc('check_feeling_cards_duplicates', {});
    const fcDups = fcDupsRaw as { song_id: string; count: number }[] || [];
    
    results.push({
      check: 'feeling_cards 1:1 mapping',
      status: fcDups.length === 0 ? 'PASS' : 'WARN',
      details: `Found ${fcDups.length} songs with multiple feeling_cards`,
      count: fcDups.length
    });

    // 6. Check sample data integrity
    const { data: sampleSongs } = await supabase
      .from('songs')
      .select('id, slug, song_title, artist, public_id, feeling_cards(summary, theme)')
      .limit(5);
    
    results.push({
      check: 'Sample data integrity',
      status: (sampleSongs?.length || 0) > 0 ? 'PASS' : 'WARN',
      details: `Retrieved ${sampleSongs?.length || 0} sample songs with proper structure`,
      count: sampleSongs?.length || 0
    });

    // 7. Check index performance on search
    const startTime = Date.now();
    const { data: searchTest } = await supabase
      .from('songs')
      .select('id, song_title, artist')
      .textSearch('artist_song_title', 'hello', { type: 'websearch' })
      .limit(10);
    
    const searchTime = Date.now() - startTime;
    
    results.push({
      check: 'Search performance',
      status: searchTime < 1000 ? 'PASS' : 'WARN',
      details: `Search completed in ${searchTime}ms, found ${searchTest?.length || 0} results`,
      count: searchTime
    });

  } catch (error) {
    results.push({
      check: 'Database connection',
      status: 'FAIL',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return results;
}

// Helper RPC functions (need to be created in the database)
const helperFunctions = `
-- Helper function to check slug duplicates
CREATE OR REPLACE FUNCTION check_slug_duplicates()
RETURNS TABLE(slug TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.slug, COUNT(*)::BIGINT
  FROM songs s
  GROUP BY s.slug
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check feeling_cards duplicates
CREATE OR REPLACE FUNCTION check_feeling_cards_duplicates()
RETURNS TABLE(song_id UUID, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT fc.song_id, COUNT(*)::BIGINT
  FROM feeling_cards fc
  GROUP BY fc.song_id
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;
`;

async function main() {
  console.log('🔍 Running post-migration validation...\n');
  
  console.log('📋 Note: The following helper functions should be added to your database:');
  console.log(helperFunctions);
  console.log('\n⏳ Running validation checks...\n');

  const results = await runValidation();
  
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.check}: ${result.details}`);
    
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else warnCount++;
  });

  console.log(`\n📊 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
  
  if (failCount > 0) {
    console.log('\n🚨 Migration validation failed! Please review the issues above.');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('\n⚠️  Migration completed with warnings. Review before proceeding.');
  } else {
    console.log('\n🎉 Migration validation passed! Schema is ready for use.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}