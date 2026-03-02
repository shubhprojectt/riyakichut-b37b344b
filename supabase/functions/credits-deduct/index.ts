import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Credit costs - All searches cost 1 credit
const CREDIT_COST = 1;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionToken, searchType, searchQuery } = await req.json();

    console.log(`Credit deduction request - Type: ${searchType}, Query: ${searchQuery}`);

    if (!sessionToken || !searchType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session token and search type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the session
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*, access_passwords(*)')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      console.log('Invalid session');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if password is enabled
    if (!session.access_passwords.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password has been disabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All searches cost 1 credit
    const creditCost = CREDIT_COST;
    const currentCredits = session.access_passwords.remaining_credits;
    const isUnlimited = session.access_passwords.is_unlimited || false;

    // If unlimited, skip credit check and deduction
    if (isUnlimited) {
      console.log('Unlimited credits - skipping deduction');
      
      // Log the usage but don't deduct
      await supabase
        .from('credit_usage')
        .insert({
          password_id: session.access_passwords.id,
          search_type: searchType,
          credits_used: 0,
          search_query: searchQuery || null
        });

      return new Response(
        JSON.stringify({
          success: true,
          creditsUsed: 0,
          remainingCredits: currentCredits,
          unlimited: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has enough credits
    if (currentCredits < creditCost) {
      console.log(`Insufficient credits: has ${currentCredits}, needs ${creditCost}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient credits',
          credits: currentCredits,
          required: creditCost
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduct credits
    const newCredits = currentCredits - creditCost;
    const { error: updateError } = await supabase
      .from('access_passwords')
      .update({ remaining_credits: newCredits })
      .eq('id', session.access_passwords.id);

    if (updateError) {
      console.error('Error deducting credits:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to deduct credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the credit usage
    await supabase
      .from('credit_usage')
      .insert({
        password_id: session.access_passwords.id,
        search_type: searchType,
        credits_used: creditCost,
        search_query: searchQuery || null
      });

    console.log(`Credits deducted: ${creditCost}, Remaining: ${newCredits}`);

    return new Response(
      JSON.stringify({
        success: true,
        creditsUsed: creditCost,
        remainingCredits: newCredits
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Deduct credits error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});