import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { password, action, newPassword } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin password from main_settings
    const { data: settingsRow } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'main_settings')
      .maybeSingle();

    const settings = settingsRow?.setting_value as any;
    const storedPassword = settings?.adminPassword || 'admin123';

    // Direct password comparison - no hashing
    if (password !== storedPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If action is change_password, update main_settings
    if (action === 'change_password' && newPassword) {
      const updatedSettings = { ...settings, adminPassword: newPassword };
      
      await supabase
        .from('app_settings')
        .update({ setting_value: updatedSettings })
        .eq('setting_key', 'main_settings');

      return new Response(
        JSON.stringify({ success: true, message: 'Password changed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate session token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const sessionToken = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

    return new Response(
      JSON.stringify({ success: true, sessionToken }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify admin error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
