import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple hash function using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "shubh_secret_salt_2024");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

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

    const { password, deviceId } = await req.json();

    console.log(`Login attempt with device: ${deviceId}`);

    if (!password || !deviceId) {
      return new Response(
        JSON.stringify({ error: 'Password and device ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Find the password in database
    const { data: passwordRecord, error: findError } = await supabase
      .from('access_passwords')
      .select('*')
      .eq('password_hash', passwordHash)
      .single();

    if (findError || !passwordRecord) {
      console.log('Password not found');
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if password is enabled
    if (!passwordRecord.is_enabled) {
      console.log('Password is disabled');
      return new Response(
        JSON.stringify({ error: 'This password has been disabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark password as used (no device binding - same password works on all devices)
    if (!passwordRecord.is_used) {
      const { error: updateError } = await supabase
        .from('access_passwords')
        .update({
          is_used: true,
          used_at: new Date().toISOString()
        })
        .eq('id', passwordRecord.id);

      if (updateError) {
        console.error('Error updating password:', updateError);
      }
    }

    // Deactivate any existing sessions for this password
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('password_id', passwordRecord.id);

    // Create new session
    const sessionToken = generateSessionToken();
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        password_id: passwordRecord.id,
        device_id: deviceId,
        session_token: sessionToken,
        is_active: true
      });

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Login successful for password ${passwordRecord.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionToken,
        credits: passwordRecord.remaining_credits,
        totalCredits: passwordRecord.total_credits
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});