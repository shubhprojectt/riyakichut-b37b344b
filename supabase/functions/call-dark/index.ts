import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting map - store last call time per number
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60000; // 60 seconds between calls to same number

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number
    const cleanNumber = phoneNumber.trim().replace(/\s+/g, '');

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(cleanNumber)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const now = Date.now();
    const lastCall = rateLimitMap.get(cleanNumber);
    if (lastCall && now - lastCall < RATE_LIMIT_MS) {
      const remainingSeconds = Math.ceil((RATE_LIMIT_MS - (now - lastCall)) / 1000);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Rate limited. Please wait ${remainingSeconds} seconds.` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get settings from database
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'main_settings')
      .maybeSingle();

    if (settingsError) {
      console.error('Settings fetch error:', settingsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = settingsData?.setting_value as Record<string, unknown> | null;

    // Check if calls are enabled
    if (!settings?.callDarkEnabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Call feature is disabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key and Agent ID from settings
    const omnidimApiKey = settings.callDarkApiKey as string;
    const agentId = settings.callDarkAgentId as string;

    if (!omnidimApiKey || !agentId) {
      console.error('Missing Omnidim configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Call service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Omnidim API
    console.log(`Dispatching call to ${cleanNumber} with agent ${agentId}`);
    
    const omnidimResponse = await fetch('https://backend.omnidim.io/api/v1/calls/dispatch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${omnidimApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        to_number: cleanNumber,
      }),
    });

    const omnidimData = await omnidimResponse.json();

    if (!omnidimResponse.ok) {
      console.error('Omnidim API error:', omnidimData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: omnidimData.message || 'Failed to dispatch call' 
        }),
        { status: omnidimResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update rate limit map
    rateLimitMap.set(cleanNumber, now);

    // Log the call (optional - for tracking)
    try {
      await supabase.from('search_history').insert({
        search_type: 'call_dark',
        search_query: cleanNumber.replace(/\d(?=\d{4})/g, '*'), // Mask number for privacy
      });
    } catch (logError) {
      console.error('Failed to log call:', logError);
      // Don't fail the request for logging errors
    }

    console.log('Call dispatched successfully:', omnidimData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Call dispatched successfully',
        callId: omnidimData.call_id || omnidimData.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Call dispatch error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
