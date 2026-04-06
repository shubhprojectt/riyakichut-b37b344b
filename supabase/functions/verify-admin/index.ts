import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "shubh_admin_salt_2024");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

    // Get stored admin password hash
    const { data: stored } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_password_hash')
      .maybeSingle();

    const inputHash = await hashPassword(password);

    // If no password set yet, use default hash
    const defaultHash = await hashPassword('admin123');
    const storedHash = stored?.setting_value || defaultHash;

    if (inputHash !== storedHash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If action is change_password, update it
    if (action === 'change_password' && newPassword) {
      const newHash = await hashPassword(newPassword);
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_key', 'admin_password_hash')
        .maybeSingle();

      if (existing) {
        await supabase.from('app_settings').update({ setting_value: newHash }).eq('setting_key', 'admin_password_hash');
      } else {
        await supabase.from('app_settings').insert({ setting_key: 'admin_password_hash', setting_value: newHash });
      }

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
