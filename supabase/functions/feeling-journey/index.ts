import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mood, energy, context, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let prompt = "";
    let systemPrompt = "";

    if (type === "journey") {
      systemPrompt = `You are a vocal performance coach helping singers find the perfect song for their current emotional state and performance context. You will receive user preferences and recommend songs from the provided dataset that match their mood and needs.

Available songs dataset:
- Bridge Over Troubled Water: unconditional support, deep empathy, warm reassurance
- Mustang Sally: freedom and rebellion, playful groove, cheeky frustration  
- Signed, Sealed, Delivered: renewed love, joy, celebration
- Can't Help Falling in Love: tender love, gentle awe, quiet surrender
- Forget You: bitter heartbreak turned empowerment, playful sass
- You're the Voice: courage and collective strength, rising determination
- He Will Supply: faith and reassurance, warm trust, joyful praise
- Come Home: yearning for reunion, tender longing, vulnerable hope
- Hosanna: triumphant faith, explosive joy, unstoppable celebration
- You've Got a Friend: unconditional support, calm reassurance
- Proud Mary: breaking free after hardship, weary to wild joy
- Diavolo in Me: overpowering attraction, magnetic pull, wild surrender
- Du fragsch mi, wer i bi: identity and authenticity, tender self-reveal
- I Can Go to God in Prayer: prayer as refuge, humble need, grateful joy
- Aquarius/Let the Sunshine In: awakening and collective joy, cosmic wonder
- Higher Ground: resilience and self-betterment, strong drive, hopeful striving
- Sing: joyful self-expression, lighthearted fun, shared energy
- Luegit vo Bärg und Tal: awe and peace, calm wonder, expanding joy
- Uptown Funk: pure joy and self-assurance, playful swagger

Return your recommendation as a JSON object with:
{
  "recommendedSong": "exact song title",
  "reason": "2-3 sentence explanation of why this song matches their mood and context",
  "emotionalJourney": "description of the emotional arc they'll experience",
  "performanceTips": ["3 specific tips for performing this song in their current state"]
}`;

      prompt = `User wants a song recommendation based on:
- Current mood: ${mood}
- Energy level: ${energy}  
- Performance context: ${context}

Recommend the most suitable song from the dataset and explain why it's perfect for their current state.`;

    } else if (type === "warmup") {
      systemPrompt = `You are a vocal coach creating personalized warm-up routines based on song emotions and performance requirements. Provide practical, actionable vocal and physical warm-ups.`;
      
      prompt = `Create a warm-up routine for performing "${mood}" with core feelings: ${energy}. 
      
      Return as JSON:
      {
        "physicalWarmups": ["3 body/movement exercises"],
        "vocalWarmups": ["3 voice exercises"],
        "emotionalPrep": ["2 mental/emotional preparation techniques"],
        "duration": "total estimated time in minutes"
      }`;

    } else if (type === "setlist") {
      systemPrompt = `You are a performance consultant helping create emotionally cohesive setlists. Consider emotional flow, energy management, and audience engagement.`;
      
      prompt = `Create a 5-song setlist starting with "${mood}" as the opening song. Use songs from the available dataset to create an emotional journey for the audience.
      
      Return as JSON:
      {
        "setlist": [
          {"position": 1, "song": "song title", "purpose": "opening energy"},
          {"position": 2, "song": "song title", "purpose": "building momentum"},
          {"position": 3, "song": "song title", "purpose": "emotional peak"},
          {"position": 4, "song": "song title", "purpose": "reflection/intimate moment"},
          {"position": 5, "song": "song title", "purpose": "uplifting finale"}
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