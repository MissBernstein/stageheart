import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CardJSON {
  id: string;
  title: string;
  artist: string;
  summary: string;
  theme: string;
  core_feelings: string[];
  access_ideas: string[];
  visual: string;
}

async function generateCardJSON(input: { title: string; artist: string }): Promise<CardJSON> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `You are Stage Heart's music librarian. Output ONLY valid JSON. Match the exact card style: feeling-first, gentle, choir-friendly. No technique, BPM, keys, or ranges.`;

  const fewshot1 = {
    "id": "silentnight",
    "title": "Silent Night",
    "artist": "Traditional carol",
    "summary": "Peaceful Christmas night—calm, sacred, and full of love.",
    "theme": "Gentle holiness and serene comfort.",
    "core_feelings": ["peace", "tender reverence", "warm love"],
    "access_ideas": [
      "Picture a still winter night with candlelight.",
      "Breath slow and deep; jaw loose for hush.",
      "Sing softly as a lullaby to the world."
    ],
    "visual": "🌙✨ candle in night"
  };

  const fewshot2 = {
    "id": "sittinonthedock",
    "title": "Sittin' on the Dock of the Bay",
    "artist": "Otis Redding",
    "summary": "Quiet reflection on life's drift, loneliness, and gentle acceptance.",
    "theme": "Bittersweet peace and solitude.",
    "core_feelings": ["wistful calm", "gentle sadness", "resigned peace"],
    "access_ideas": [
      "Think of time alone processing change.",
      "Slow sway; loosen jaw; let sighs out.",
      "Eyes soft, distant horizon gaze."
    ],
    "visual": "⚓🌅 dock and sunset water"
  };

  const userPrompt = `Make a Stage Heart feeling card for:
Artist: ${input.artist}
Title: ${input.title}

Return JSON EXACTLY in this shape:
{
  "id": "lowercase-slug-from-title-and-artist",
  "title": "${input.title}",
  "artist": "${input.artist}",
  "summary": "Short 1-sentence emotional summary.",
  "theme": "Overall emotional theme.",
  "core_feelings": ["three concise emotional words/phrases"],
  "access_ideas": [
    "Short physical/imagery access cue",
    "Another",
    "Another"
  ],
  "visual": "one or two emojis + tiny image idea"
}

Examples:
${JSON.stringify(fewshot1, null, 2)}

${JSON.stringify(fewshot2, null, 2)}

Rules:
- Feeling-first. No technical singing advice. Keep tone consistent with examples.
- Output ONLY the JSON, no explanation.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI gateway error:', response.status, errorText);
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in AI response');
  }

  return JSON.parse(content) as CardJSON;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const REQUIRE_REVIEW = Deno.env.get('REQUIRE_REVIEW') === 'true';

    // Get queued submissions
    const { data: submissions, error: fetchError } = await supabase
      .from('submissions')
      .select('id, title, artist, slug')
      .eq('status', 'QUEUED')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch submissions' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!submissions || submissions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No submissions to process', processed: 0 }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    for (const sub of submissions) {
      try {
        // Mark as processing
        await supabase
          .from('submissions')
          .update({ status: 'PROCESSING' })
          .eq('id', sub.id);

        // Upsert song
        const { data: existingSong } = await supabase
          .from('songs')
          .select('id')
          .eq('slug', sub.slug)
          .maybeSingle();

        let songId = existingSong?.id;
        if (!songId) {
          const { data: newSong, error: songError } = await supabase
            .from('songs')
            .insert({
              slug: sub.slug,
              title: sub.title,
              artist: sub.artist
            })
            .select('id')
            .single();

          if (songError) throw songError;
          songId = newSong.id;
        }

        // Generate AI card
        const card = await generateCardJSON({ title: sub.title, artist: sub.artist });

        // Validate
        if (!card?.summary || !card?.theme || !Array.isArray(card?.core_feelings) || !Array.isArray(card?.access_ideas)) {
          throw new Error('AI output incomplete or invalid');
        }

        // Store feeling card
        const { error: cardError } = await supabase
          .from('feeling_cards')
          .insert({
            song_id: songId,
            summary: card.summary.trim(),
            theme: card.theme.trim(),
            core_feelings: card.core_feelings.map(s => s.trim()),
            access_ideas: card.access_ideas.map(s => s.trim()),
            visual: card.visual || null
          });

        if (cardError) throw cardError;

        // Mark as published or review
        await supabase
          .from('submissions')
          .update({ 
            status: REQUIRE_REVIEW ? 'REVIEW' : 'PUBLISHED',
            processed_at: new Date().toISOString()
          })
          .eq('id', sub.id);

        processed++;
      } catch (error) {
        console.error(`Error processing submission ${sub.id}:`, error);
        await supabase
          .from('submissions')
          .update({ 
            status: 'REVIEW',
            error: error instanceof Error ? error.message : String(error),
            processed_at: new Date().toISOString()
          })
          .eq('id', sub.id);
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed ${processed} submissions`, processed }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-submissions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
