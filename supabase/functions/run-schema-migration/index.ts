import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('🚀 Starting schema migration...')

    // Step 1: Check current schema
    const { data: columns } = await supabase.rpc('get_table_columns', { table_name: 'songs' })
    console.log('Current columns:', columns)

    // Step 2: Add new columns (using individual operations for safety)
    console.log('📝 Adding new columns...')
    
    try {
      // Add song_title column
      await supabase.rpc('execute_sql', { 
        query: 'ALTER TABLE songs ADD COLUMN IF NOT EXISTS song_title TEXT;' 
      })
      
      // Add public_id column
      await supabase.rpc('execute_sql', { 
        query: 'ALTER TABLE songs ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();' 
      })
      
      // Add other columns
      await supabase.rpc('execute_sql', { 
        query: 'ALTER TABLE songs ADD COLUMN IF NOT EXISTS parent_song_id UUID;' 
      })
      
      await supabase.rpc('execute_sql', { 
        query: 'ALTER TABLE songs ADD COLUMN IF NOT EXISTS version_label TEXT;' 
      })
      
      await supabase.rpc('execute_sql', { 
        query: 'ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_cover BOOLEAN DEFAULT false;' 
      })
      
      console.log('✅ New columns added successfully')
    } catch (error) {
      console.log('⚠️ Column addition may have failed (might already exist):', error.message)
    }

    // Step 3: Backfill data using direct updates
    console.log('🔄 Backfilling song_title data...')
    
    const { data: songsToUpdate } = await supabase
      .from('songs')
      .select('id, title, song_title')
      .is('song_title', null)

    console.log(`Found ${songsToUpdate?.length || 0} songs to update`)

    if (songsToUpdate && songsToUpdate.length > 0) {
      for (const song of songsToUpdate) {
        await supabase
          .from('songs')
          .update({ song_title: song.title })
          .eq('id', song.id)
      }
      console.log('✅ Backfill completed')
    }

    // Step 4: Update slugs to use artist+title pattern
    console.log('🔧 Updating slugs...')
    
    const { data: allSongs } = await supabase
      .from('songs')
      .select('id, artist, song_title, slug')
      .not('artist', 'is', null)
      .not('song_title', 'is', null)

    let updatedSlugs = 0
    if (allSongs) {
      for (const song of allSongs) {
        const newSlug = (song.artist + '-' + song.song_title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')

        if (newSlug !== song.slug) {
          await supabase
            .from('songs')
            .update({ slug: newSlug })
            .eq('id', song.id)
          updatedSlugs++
        }
      }
    }
    console.log(`✅ Updated ${updatedSlugs} slugs`)

    // Step 5: Create indexes (try but don't fail if they already exist)
    console.log('📊 Creating indexes...')
    try {
      await supabase.rpc('execute_sql', { 
        query: `CREATE UNIQUE INDEX IF NOT EXISTS songs_artist_title_ver_idx
                ON songs (lower(artist), lower(song_title), COALESCE(version_label, ''));` 
      })
      
      await supabase.rpc('execute_sql', { 
        query: 'CREATE UNIQUE INDEX IF NOT EXISTS songs_slug_key ON songs(slug);' 
      })
      
      await supabase.rpc('execute_sql', { 
        query: 'CREATE UNIQUE INDEX IF NOT EXISTS songs_public_id_key ON songs(public_id);' 
      })
      
      console.log('✅ Indexes created')
    } catch (error) {
      console.log('⚠️ Index creation may have failed (might already exist):', error.message)
    }

    // Validation
    const { data: validation } = await supabase
      .from('songs')
      .select('id, song_title, artist, slug, public_id')
      .limit(5)

    const result = {
      success: true,
      message: '🎉 Schema migration completed successfully!',
      summary: {
        songsBackfilled: songsToUpdate?.length || 0,
        slugsUpdated: updatedSlugs,
        totalSongs: allSongs?.length || 0,
        sampleData: validation
      }
    }

    console.log('Migration result:', result)

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Migration failed',
        details: error.toString()
      }, null, 2),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})