import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface LocalSong {
  id: string;
  title: string;
  artist: string;
  summary: string;
  theme: string;
  theme_detail?: string;
  core_feelings: string[];
  access_ideas: string[];
  visual: string;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  try {
    const { songs } = await req.json() as { songs: LocalSong[] };
    
    if (!songs || !Array.isArray(songs)) {
      throw new Error('Invalid request: songs array required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching existing songs...');
    const { data: existingSongs, error: songsErr } = await supabase
      .from('songs')
      .select('id,slug,title,artist');
    
    if (songsErr) throw songsErr;

    const existingBySlug = new Map<string, { id: string }>();
    existingSongs?.forEach(s => existingBySlug.set(s.slug, { id: s.id }));

    console.log('Fetching existing feeling cards...');
    const { data: existingCards, error: cardsErr } = await supabase
      .from('feeling_cards')
      .select('song_id');
    
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

    if (toInsertSongs.length > 0) {
      console.log('Inserting songs...');
      const { data: inserted, error: insertErr } = await supabase
        .from('songs')
        .insert(toInsertSongs)
        .select('id,slug');
      
      if (insertErr) throw insertErr;
      
      inserted?.forEach(row => existingBySlug.set(row.slug, { id: row.id }));
      console.log(`Inserted ${inserted?.length || 0} songs.`);
    }

    // Map slug->id for all songs
    const slugToId = new Map<string, string>();
    existingBySlug.forEach((v, k) => slugToId.set(k, v.id));

    const feelingCardsToInsert: any[] = [];
    for (const s of songs) {
      const slug = slugify(`${s.title}-${s.artist}`);
      const songId = slugToId.get(slug);
      if (!songId) continue;
      if (existingCardIds.has(songId)) continue;
      
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
    
    if (feelingCardsToInsert.length > 0) {
      console.log('Inserting feeling_cards in batches of 100...');
      const batchSize = 100;
      for (let i = 0; i < feelingCardsToInsert.length; i += batchSize) {
        const batch = feelingCardsToInsert.slice(i, i + batchSize);
        const { error: fcErr } = await supabase.from('feeling_cards').insert(batch);
        if (fcErr) throw fcErr;
        console.log(`Inserted feeling_cards ${i + 1} - ${i + batch.length}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalSongs: songs.length,
        alreadyInDb: songs.length - toInsertSongs.length,
        inserted: toInsertSongs.length,
        feelingCardsInserted: feelingCardsToInsert.length,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    console.error('Migration failed:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Migration failed' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
