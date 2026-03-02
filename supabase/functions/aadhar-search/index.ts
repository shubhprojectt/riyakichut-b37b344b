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
    const { term, apiUrl: customApiUrl } = await req.json();
    
    if (!term) {
      return new Response(
        JSON.stringify({ error: "Term is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use custom API URL from settings, or fallback to default
    const defaultApiUrl = 'http://zionix.rf.gd/land.php?type=id_number&term=';
    const baseUrl = customApiUrl?.trim() || defaultApiUrl;
    
    console.log('Fetching Aadhar for:', term, 'using API:', baseUrl);
    
    const apiUrl = `${baseUrl}${encodeURIComponent(term)}`;
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const text = await response.text();
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // If not JSON, return the raw text
      data = { raw: text };
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Aadhar search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch data";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
