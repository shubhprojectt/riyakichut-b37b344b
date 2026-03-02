import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, userId, username } = await req.json();

    console.log(`Telegram OSINT request: endpoint=${endpoint}, userId=${userId}, username=${username}`);

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client to get settings
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get JWT token and base URL from settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'main_settings')
      .single();

    if (settingsError || !settingsData) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = settingsData.setting_value as any;
    const jwtToken = settings?.telegramOsint?.jwtToken;
    const baseUrl = settings?.telegramOsint?.baseUrl || 'https://funstat.info';

    if (!jwtToken) {
      console.error('JWT token not configured');
      return new Response(
        JSON.stringify({ error: 'JWT token not configured in admin settings' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the API URL based on endpoint
    let apiUrl = `${baseUrl}${endpoint}`;
    
    // Only add query parameters if the endpoint doesn't already have them
    const hasQueryParams = endpoint.includes('?');
    
    // Add query parameters based on the endpoint type
    if (endpoint.includes('resolve_username') || endpoint.includes('username_usage')) {
      if (username && !hasQueryParams) {
        apiUrl += `?username=${encodeURIComponent(username)}`;
      }
    } else if (userId && !hasQueryParams) {
      // Only add user_id if endpoint doesn't already have query params
      apiUrl += `?user_id=${encodeURIComponent(userId)}`;
    }

    console.log(`Making API request to: ${apiUrl}`);

    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `API Error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('API response received successfully');

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Telegram OSINT error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
