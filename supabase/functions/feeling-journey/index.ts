// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mood, energy, context, type, songCount = 5, vibe } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let prompt = "";
    let systemPrompt = "";

    if (type === "journey") {
      // --- Dynamic dataset build (replaces legacy hard-coded list) ---
      // We cache for a short interval to reduce DB + token overhead.
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
      let datasetLines: string[] = [];
      if (supabaseUrl && supabaseKey) {
        try {
          // Simple in-memory cache (resets on cold start)
          const cacheKey = 'songsDatasetCache';
          const globalAny = globalThis as any;
          const now = Date.now();
          const CACHE_MS = 1000 * 60 * 5; // 5 minutes
          if (!globalAny.__songsDataset || (now - globalAny.__songsDataset.timestamp) > CACHE_MS) {
            const sb: SupabaseClient = createClient(supabaseUrl, supabaseKey);
            const { data, error } = await sb
              .from('songs')
              .select('title, artist, feeling_cards ( theme, core_feelings )')
              .limit(600); // safety upper bound
            if (error) throw error;
            const lines: string[] = [];
            for (const row of (data || [])) {
              const fc = Array.isArray((row as any).feeling_cards) ? (row as any).feeling_cards[0] : (row as any).feeling_cards;
              const core = Array.isArray(fc?.core_feelings) ? fc.core_feelings : [];
              if (!core.length) continue; // filter out entries without core feelings
              const theme = fc?.theme || 'Unknown theme';
              const feelings = core.slice(0, 3).join(', ');
              lines.push(`- ${row.title}: ${theme}${feelings ? ' – ' + feelings : ''}`);
            }
            // If dataset extremely large, prune to a manageable subset: keep newest ~300 & random sample of rest
            let final = lines;
            const MAX_LINES = 380; // token safety
            if (final.length > MAX_LINES) {
              const firstChunk = final.slice(0, 280); // keep first chunk (likely newest if query sorted)
              const remaining = final.slice(280);
              // random sample
              for (let i = remaining.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
              }
              final = firstChunk.concat(remaining.slice(0, MAX_LINES - firstChunk.length));
            }
            globalAny.__songsDataset = { timestamp: now, lines: final };
          }
          datasetLines = (globalAny.__songsDataset?.lines as string[]) || [];
        } catch (e) {
          console.error('Failed to build dynamic songs dataset, falling back to legacy list', e);
        }
      }
      if (!datasetLines.length) {
        // Fallback minimal legacy subset to avoid total failure (kept short)
        datasetLines = [
          '- Bridge Over Troubled Water: unconditional support, deep empathy, warm reassurance',
          '- Mustang Sally: freedom and rebellion, playful groove, cheeky frustration',
          '- Signed, Sealed, Delivered: renewed love, joy, celebration',
          '- Can\'t Help Falling in Love: tender love, gentle awe, quiet surrender',
          '- Uptown Funk: pure joy and self-assurance, playful swagger'
        ];
      }

  systemPrompt = `You are a vocal performance coach helping singers find the perfect song for their current emotional state and performance context. You will receive user preferences and recommend songs strictly from the provided dataset that match their mood and needs. If multiple songs could work, rank the top 3 (1 = best) for clarity.

Available songs dataset (title: theme – core feelings):\n${datasetLines.join('\n')}\n\nReturn JSON ONLY with shape:\n{\n  "recommendedSong": "exact title of rank 1",\n  "candidates": [\n    {"title": "rank 1 exact title", "reason": "1-2 sentence reason", "emotionalJourney": "short arc", "performanceTips": ["tip1","tip2","tip3"]},\n    {"title": "rank 2 exact title", "reason": "...", "emotionalJourney": "...", "performanceTips": ["tip1","tip2","tip3"]},\n    {"title": "rank 3 exact title", "reason": "...", "emotionalJourney": "...", "performanceTips": ["tip1","tip2","tip3"]}\n  ]\n}\nRules:\n- Titles MUST come verbatim from dataset.\n- Always provide exactly 3 candidates unless dataset has fewer than 3 items.\n- Performance tips: concise, actionable, no numbering, 5-10 words each.`;

  prompt = `User wants a song recommendation based on:\n- Current mood: ${mood}\n- Energy level: ${energy}\n- Performance context: ${context}\n\nProvide ranked top 3 as specified.`;

    } else if (type === "warmup") {
      systemPrompt = `You are a vocal coach creating personalized warm-up routines based on song emotions and performance requirements. Provide practical, actionable vocal and physical warm-ups.`;
      
      const warmupContext = vibe 
        ? `Create a warm-up routine for the "${vibe}" vibe with core feelings: ${energy}.`
        : `Create a warm-up routine for performing "${mood}" with core feelings: ${energy}.`;
      
      prompt = `${warmupContext} 
      
      Return as JSON:
      {
        "physicalWarmups": ["3 body/movement exercises"],
        "vocalWarmups": ["3 voice exercises"],
        "emotionalPrep": ["2 mental/emotional preparation techniques"],
        "duration": "total estimated time in minutes"
      }`;

    } else if (type === "setlist") {
      systemPrompt = `You are a performance consultant helping create emotionally cohesive setlists. Consider emotional flow, energy management, and audience engagement.`;
      
      prompt = `Create a ${songCount}-song setlist starting with "${mood}" as the opening song. Use songs from the available dataset to create an emotional journey for the audience.
      
      Return as JSON with ${songCount} songs in the setlist array:
      {
        "setlist": [
          {"position": 1, "song": "song title", "purpose": "role in the setlist"},
          ... (continue for all ${songCount} songs)
        ],
        "overallArc": "description of the emotional journey",
        "transitionTips": ["2 tips for smooth transitions between songs"]
      }`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "No valid JSON found in response" };
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return new Response(JSON.stringify({ 
        error: "Failed to parse AI response", 
        rawContent: content 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("feeling-journey error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});