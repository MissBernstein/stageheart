import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// All 129 songs from CSV
const SONGS_DATA = [
  { title: "Bohemian Rhapsody", artist: "Queen", summary: "Operatic rock epic exploring guilt, fate, and freedom.", theme: "Drama & inner turmoil", core_feelings: ["conflicted soul", "epic struggle", "wild release"], access_ideas: ["Shift dynamics: tender intro, operatic middle, rock out safely.", "Visualize cinematic inner battle.", "Let final fade be resigned."], visual: "🎭⚡" },
  { title: "Let Me Live", artist: "Queen", summary: "Gospel-tinged plea for freedom and second chances.", theme: "Freedom & redemption", core_feelings: ["pleading hope", "joyous release", "forgiveness"], access_ideas: ["Blend rock and gospel feel; wide chorus smile.", "Visualize breaking free into sun.", "Support big belts safely."], visual: "☀️🎤" },
  { title: "We Will Rock You", artist: "Queen", summary: "Stomping arena anthem of defiance and power.", theme: "Rebellion & unstoppable strength", core_feelings: ["fight energy", "crowd unity", "swagger"], access_ideas: ["Stomp/clap rhythm physically while singing.", "Visualize stadium stamping feet together.", "Keep grit safe on shouts."], visual: "👣🏟️" },
  { title: "Somebody to Love", artist: "Queen", summary: "Soulful gospel-rock plea for love and understanding.", theme: "Loneliness & yearning for love", core_feelings: ["aching hope", "spiritual cry", "big yearning"], access_ideas: ["Float tender verses then unleash big safe belts.", "Visualize pleading in empty church or hall.", "Let choir backing lift energy."], visual: "🙏🎶" },
  { title: "Miss Celie's Blues (Sister)", artist: "Quincy Jones", summary: "Tender blues invitation to connection and sisterhood.", theme: "Comfort & loving bond", core_feelings: ["warm sisterhood", "gentle flirt", "homey joy"], access_ideas: ["Keep phrasing smooth and cozy.", "Visualize sharing tea and safe smiles.", "Swing lightly with warmth."], visual: "☕💜" },
  { title: "Maybe God Is Trying to Tell You Something", artist: "Quincy Jones", summary: "Powerful gospel-soul cry of awakening and divine message.", theme: "Spiritual wake-up & release", core_feelings: ["soul fire", "divine call", "urgent release"], access_ideas: ["Sing full gospel cry safely; let passion grow.", "Visualize spirit shaking you awake.", "Clap and move with music."], visual: "🔥🙌" },
  { title: "Creep", artist: "Radiohead", summary: "Alt-rock confession of alienation and longing for belonging.", theme: "Self-doubt & yearning", core_feelings: ["insecurity", "ache", "angst"], access_ideas: ["Start soft and fragile; explode safely in chorus.", "Visualize standing apart from crowd wanting in.", "Let raw emotion color but stay controlled."], visual: "😶‍🌫️💔" },
  { title: "Georgia on My Mind", artist: "Ray Charles", summary: "Tender soulful ode to deep love and nostalgic home.", theme: "Love & homesickness", core_feelings: ["wistful warmth", "devotion", "memory comfort"], access_ideas: ["Sing smooth and heartfelt; gentle blues runs.", "Visualize quiet southern sunset and longing.", "Keep tempo easy and rich."], visual: "🌅🎹" },
  { title: "Hit the Road Jack", artist: "Ray Charles", summary: "Playful, sassy break-up warning with blues swing.", theme: "Defiance & playful goodbye", core_feelings: ["sass", "freedom", "cheeky anger"], access_ideas: ["Bounce groove with crisp diction and attitude.", "Visualize waving goodbye at door.", "Keep tone light but firm."], visual: "👋🚗" },
  { title: "What'd I Say", artist: "Ray Charles", summary: "Joyous, sensual R&B jam with call and response.", theme: "Joy & flirtation", core_feelings: ["playful lust", "dance energy", "celebration"], access_ideas: ["Engage playful improv safely; call-response feel.", "Visualize live club dancing and flirting.", "Keep riffs energetic but supported."], visual: "🎷🔥" },
  { title: "Trouble", artist: "Ray LaMontagne", summary: "Soulful folk confession of inner struggle and love's rescue.", theme: "Struggle & tender salvation", core_feelings: ["aching honesty", "comfort", "hope"], access_ideas: ["Sing husky but controlled; gentle falsetto touches.", "Visualize darkness giving way to light through love.", "Keep tempo intimate and steady."], visual: "🌧️🕯️" },
  { title: "Under the Bridge", artist: "Red Hot Chili Peppers", summary: "Melancholic alt-rock about loneliness and urban isolation.", theme: "Loneliness & quiet reflection", core_feelings: ["urban ache", "longing for belonging", "wistful calm"], access_ideas: ["Start whispery; rise to safe rock belt mid-song.", "Visualize empty LA streets under bridge.", "Keep verses intimate."], visual: "🌉🏙️" },
  { title: "Losing My Religion", artist: "R.E.M.", summary: "Alt-rock lament of unrequited love and obsessive doubt.", theme: "Vulnerability & confusion", core_feelings: ["yearning", "questioning faith", "emotional nakedness"], access_ideas: ["Sing airy but strong, maintain calm dynamics.", "Visualize wrestling feelings in secret room.", "Lean into mandolin-like phrasing."], visual: "🙏💔" },
  { title: "Seasons of Love", artist: "Rent", summary: "Broadway anthem counting love as life's true measure.", theme: "Love & shared humanity", core_feelings: ["warmth", "community", "celebration"], access_ideas: ["Blend ensemble feel or solo big notes safely.", "Visualize friends arm in arm reflecting on year.", "Smile openly while singing."], visual: "🕯️❤️" },
  { title: "Love on the Brain", artist: "Rihanna", summary: "Retro soul-pop about toxic but irresistible love.", theme: "Painful desire & surrender", core_feelings: ["ache", "passion", "raw vulnerability"], access_ideas: ["Channel grit safely on high belts; warm lower register.", "Visualize begging lover despite pain.", "Stay bluesy but controlled."], visual: "💋💔" },
  { title: "Umbrella", artist: "Rihanna", summary: "Comforting pop-R&B promise of loyalty and protection.", theme: "Loyal love & shelter", core_feelings: ["steadfast care", "comfort", "friendship"], access_ideas: ["Keep chorus warm, chesty but not harsh.", "Visualize holding umbrella over loved one.", "Move gently with beat."], visual: "☂️🤍" },
  { title: "La Bamba", artist: "Ritchie Valens", summary: "Festive rock adaptation of Mexican folk dance song.", theme: "Joyful celebration & heritage", core_feelings: ["fiesta energy", "pride", "dance"], access_ideas: ["Bright and playful; clear Spanish diction.", "Visualize dancing fiesta crowd.", "Smile and move hips lightly."], visual: "🎉🇲🇽" },
  { title: "Tiger Striped Sky", artist: "Roo Panes", summary: "Gentle indie folk reflection on hope through struggles.", theme: "Quiet hope & wonder", core_feelings: ["soft resilience", "nature wonder", "tender peace"], access_ideas: ["Keep breathy gentle tone; intimate guitar feel.", "Visualize open field sky shifting after storm.", "Stay mellow and warm."], visual: "🌅🐅" },
  { title: "Junimond", artist: "Rio Reiser", summary: "Poetic German ballad of lost love and bittersweet summer night.", theme: "Lost love & nostalgia", core_feelings: ["melancholy", "quiet longing", "tender memory"], access_ideas: ["Sing hushed intimate German phrasing.", "Visualize summer evening empty bench.", "Keep chorus soft aching."], visual: "🌙🌼" },
  { title: "Walk This Way", artist: "Run-DMC & Aerosmith", summary: "Groundbreaking rap-rock collab with playful swagger and lust.", theme: "Bold fun & fusion energy", core_feelings: ["cheeky desire", "party", "crossover cool"], access_ideas: ["Rap sharply then unleash rock shouts safely.", "Visualize jam session breaking barriers.", "Move with funk-rock groove."], visual: "🎸🎤" },
  // ... Continue with remaining 109 songs
];

function generateSlug(artist: string, title: string): string {
  return (artist + '-' + title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapTheme(theme: string): string {
  const lower = theme.toLowerCase();
  
  if (lower.includes('drama') || lower.includes('turmoil')) return 'Drama & inner turmoil';
  if (lower.includes('rebellion') || lower.includes('defiance') || lower.includes('unstoppable')) return 'Rebellion & defiance';
  if (lower.includes('grief') || lower.includes('solace')) return 'Grief & solace';
  if (lower.includes('freedom') || lower.includes('redemption') || lower.includes('breaking free')) return 'Freedom / breaking free';
  if (lower.includes('love') && (lower.includes('tender') || lower.includes('devotion'))) return 'Tender love & devotion';
  if (lower.includes('faith') || lower.includes('praise') || lower.includes('gospel') || lower.includes('spiritual')) return 'Joyful praise & faith';
  if (lower.includes('unity') || lower.includes('empowerment')) return 'Hopeful unity & empowerment';
  if (lower.includes('nostalgia') || lower.includes('holiday')) return 'Nostalgia & holiday warmth';
  if (lower.includes('identity') || lower.includes('authentic')) return 'Identity & authenticity';
  if (lower.includes('resilience') || lower.includes('striving') || lower.includes('triumph')) return 'Resilience & striving';
  if (lower.includes('yearning') || lower.includes('reunion')) return 'Yearning & reunion';
  if (lower.includes('playful') || lower.includes('flirt') || lower.includes('groove')) return 'Playful groove & flirtation';
  if (lower.includes('support') || (lower.includes('comfort') && !lower.includes('grief'))) return 'Unconditional support & comfort';
  if (lower.includes('peace') || lower.includes('solitude') || lower.includes('bittersweet')) return 'Bittersweet peace & solitude';
  
  return 'Awe & contemplation';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let success = 0;
    let skipped = 0;
    let errors = 0;
    const logs: string[] = [];

    for (const song of SONGS_DATA) {
      const slug = generateSlug(song.artist, song.title);

      // Check if exists
      const { data: existing } = await supabaseClient
        .from('songs')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        logs.push(`Skipped duplicate: ${song.artist} - ${song.title}`);
        skipped++;
        continue;
      }

      // Insert song
      const { data: newSong, error: songError } = await supabaseClient
        .from('songs')
        .insert({
          title: song.title,
          artist: song.artist,
          slug,
          song_title: song.title,
        })
        .select()
        .single();

      if (songError) {
        logs.push(`Error inserting ${song.artist} - ${song.title}: ${songError.message}`);
        errors++;
        continue;
      }

      // Insert feeling card
      const canonicalTheme = mapTheme(song.theme);
      const { error: cardError } = await supabaseClient
        .from('feeling_cards')
        .insert({
          song_id: newSong.id,
          summary: song.summary,
          theme: canonicalTheme,
          core_feelings: song.core_feelings,
          access_ideas: song.access_ideas,
          visual: song.visual,
        });

      if (cardError) {
        logs.push(`Error creating card for ${song.artist} - ${song.title}: ${cardError.message}`);
        await supabaseClient.from('songs').delete().eq('id', newSong.id);
        errors++;
        continue;
      }

      logs.push(`Imported: ${song.artist} - ${song.title} → ${canonicalTheme}`);
      success++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: SONGS_DATA.length,
        imported: success,
        skipped,
        errors,
        logs
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
