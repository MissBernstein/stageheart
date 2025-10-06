import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('Starting schema migration...')

    // Step 1: Add new columns safely
    console.log('Adding new columns...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS song_title TEXT;
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS parent_song_id UUID;
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS version_label TEXT;
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;
      `
    })

    // Step 2: Backfill data
    console.log('Backfilling data...')
    const { data: songsNeedingBackfill } = await supabase
      .from('songs')
      .select('id, title, artist')
      .is('song_title', null)

    if (songsNeedingBackfill && songsNeedingBackfill.length > 0) {
      for (const song of songsNeedingBackfill) {
        await supabase
          .from('songs')
          .update({ 
            song_title: song.title,
            artist: song.artist || 'Unknown Artist'
          })
          .eq('id', song.id)
      }
    }

    // Step 3: Update slugs to use artist+title
    console.log('Updating slugs...')
    const { data: songsToUpdate } = await supabase
      .from('songs')
      .select('id, artist, song_title, slug')
      .not('artist', 'is', null)
      .not('song_title', 'is', null)

    for (const song of songsToUpdate || []) {
      const newSlug = (song.artist + '-' + song.song_title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      if (newSlug !== song.slug) {
        await supabase
          .from('songs')
          .update({ slug: newSlug })
          .eq('id', song.id)
      }
    }

    // Step 4: Create indexes
    console.log('Creating indexes...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE UNIQUE INDEX IF NOT EXISTS songs_artist_title_ver_idx
        ON songs (lower(artist), lower(song_title), COALESCE(version_label, ''));
        
        CREATE UNIQUE INDEX IF NOT EXISTS songs_slug_key ON songs(slug);
        CREATE UNIQUE INDEX IF NOT EXISTS songs_public_id_key ON songs(public_id);
      `
    })

    // Step 5: Update foreign key
    console.log('Updating foreign keys...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE feeling_cards
          DROP CONSTRAINT IF EXISTS feeling_cards_song_id_fkey,
          ADD CONSTRAINT feeling_cards_song_id_fkey
            FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE;
      `
    })

    // Validation
    console.log('Running validation...')
    const { data: validation } = await supabase
      .from('songs')
      .select('id')
      .or('song_title.is.null,artist.is.null')

    const result = {
      success: true,
      message: 'Schema migration completed successfully',
      validation: {
        songsWithNullValues: validation?.length || 0,
        totalSongsProcessed: songsToUpdate?.length || 0
      }
    }

    console.log('Migration completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Migration failed:', error)
    const errorMsg = error instanceof Error ? error.message : 'Migration failed'
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMsg
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})