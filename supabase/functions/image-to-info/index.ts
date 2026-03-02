import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare the image URL for the AI
    const imageUrl = imageBase64.startsWith("data:") 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an OSINT (Open Source Intelligence) expert specializing in image analysis. 
            
Your task is to analyze uploaded images and extract ANY publicly available information that could be useful for identification or social media lookup.

For EVERY image, provide a detailed analysis including:

1. **PERSON IDENTIFICATION** (if face visible):
   - Estimated age range
   - Gender
   - Ethnicity/nationality guess
   - Distinctive features (tattoos, scars, jewelry, glasses, hairstyle)
   - Clothing brands/style
   - Expression/mood

2. **LOCATION CLUES**:
   - Any visible text (signs, posters, receipts)
   - Language of visible text
   - Architecture style
   - Vegetation/climate indicators
   - Business names/logos
   - Street signs, landmarks
   - Vehicle license plates

3. **SOCIAL MEDIA INDICATORS**:
   - Platform watermarks (Instagram, TikTok, Snapchat)
   - Username if visible
   - Profile indicators
   - Story/post metadata
   - Filter/effect used

4. **METADATA CLUES**:
   - Image quality/camera type guess
   - Screenshot indicators
   - Edit/filter indicators
   - Time of day from lighting
   - Indoor/outdoor setting

5. **REVERSE SEARCH RECOMMENDATIONS**:
   - Suggest specific platforms to search
   - Keywords to use for searching
   - Similar image search strategies

6. **ADDITIONAL INTEL**:
   - Objects in frame (devices, accessories)
   - Background details
   - Event/occasion indicators
   - Economic status indicators
   - Profession/occupation clues

Format your response as a structured JSON object with clear categories.
Be thorough but acknowledge limitations - clearly state when information is uncertain or speculative.
NEVER make up information - only report what is actually visible in the image.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and extract all possible publicly available information for OSINT purposes. Be thorough and detailed."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysisContent = aiResponse.choices?.[0]?.message?.content;

    if (!analysisContent) {
      throw new Error("No analysis content received from AI");
    }

    // Try to parse as JSON, fallback to structured text
    let analysisData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisContent.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[1]);
      } else if (analysisContent.trim().startsWith("{")) {
        analysisData = JSON.parse(analysisContent);
      } else {
        // Structure the text response
        analysisData = {
          raw_analysis: analysisContent,
          parsed: false
        };
      }
    } catch {
      analysisData = {
        raw_analysis: analysisContent,
        parsed: false
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisData,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Image analysis error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to analyze image" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
