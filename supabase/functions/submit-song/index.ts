import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const slugify = (s: string): string =>
  s.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { title, artist } = await req.json().catch(() => ({}));
    
    if (!title || !artist) {
      return new Response(
        JSON.stringify({ error: 'Artist and title are required.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const slug = slugify(`${artist} ${title}`);

    // Check if already published
    const { data: existingSong } = await supabase
      .from('songs')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (existingSong) {
      return new Response(
        JSON.stringify({ ok: true, status: 'EXISTS', message: 'Already in library.', slug }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already queued
    const { data: queuedSubmission } = await supabase
      .from('submissions')
      .select('slug')
      .eq('slug', slug)
      .in('status', ['QUEUED', 'PROCESSING', 'REVIEW'])
      .maybeSingle();

    if (queuedSubmission) {
      return new Response(
        JSON.stringify({ ok: true, status: 'QUEUED', message: 'Already submitted. Processing.', slug }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new submission
    const { error: insertError } = await supabase
      .from('submissions')
      .insert({
        title: title.trim(),
        artist: artist.trim(),
        slug,
        status: 'QUEUED'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create submission.' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, status: 'QUEUED', slug }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-song:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
