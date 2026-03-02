import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple hash function
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "shubh_secret_salt_2024");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random password
function generatePassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => chars[b % chars.length]).join('');
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

    const { action, adminPassword, ...params } = await req.json();

    // Verify admin password (from app_settings - stored in main_settings)
    const { data: adminSetting } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'main_settings')
      .single();

    // Extract adminPassword from settings (it's stored in main_settings JSON)
    const settingsValue = adminSetting?.setting_value as any;
    const storedAdminPassword = settingsValue?.adminPassword || 'dark';
    
    if (adminPassword !== storedAdminPassword) {
      console.log('Invalid admin password. Received:', adminPassword, 'Expected:', storedAdminPassword);
      return new Response(
        JSON.stringify({ error: 'Invalid admin password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin action: ${action}`);

    switch (action) {
      case 'list': {
        // List all passwords with usage stats
        const { data: passwords, error } = await supabase
          .from('access_passwords')
          .select(`
            *,
            credit_usage(id, search_type, credits_used, created_at)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify({ passwords }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        const { credits, customPassword } = params;
        if (!credits || credits < 1) {
          return new Response(
            JSON.stringify({ error: 'Credits must be at least 1' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Use custom password if provided, otherwise generate random
        const password = customPassword && customPassword.trim().length >= 4 
          ? customPassword.trim().toUpperCase() 
          : generatePassword(8);
        const passwordHash = await hashPassword(password);

        const { data, error } = await supabase
          .from('access_passwords')
          .insert({
            password_hash: passwordHash,
            password_display: password,
            total_credits: credits,
            remaining_credits: credits
          })
          .select()
          .single();

        if (error) throw error;

        console.log(`Created password with ${credits} credits`);

        return new Response(
          JSON.stringify({ password: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update': {
        const { passwordId, credits, isEnabled, isUnlimited } = params;
        
        if (!passwordId) {
          return new Response(
            JSON.stringify({ error: 'Password ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: any = {};
        if (credits !== undefined) {
          updateData.remaining_credits = credits;
        }
        if (isEnabled !== undefined) {
          updateData.is_enabled = isEnabled;
        }
        if (isUnlimited !== undefined) {
          updateData.is_unlimited = isUnlimited;
        }

        const { data, error } = await supabase
          .from('access_passwords')
          .update(updateData)
          .eq('id', passwordId)
          .select()
          .single();

        if (error) throw error;

        console.log(`Updated password ${passwordId}`);

        return new Response(
          JSON.stringify({ password: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { passwordId } = params;
        
        if (!passwordId) {
          return new Response(
            JSON.stringify({ error: 'Password ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('access_passwords')
          .delete()
          .eq('id', passwordId);

        if (error) throw error;

        console.log(`Deleted password ${passwordId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset': {
        // Reset password to unused state
        const { passwordId } = params;
        
        if (!passwordId) {
          return new Response(
            JSON.stringify({ error: 'Password ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Deactivate all sessions
        await supabase
          .from('user_sessions')
          .delete()
          .eq('password_id', passwordId);

        // Reset password state
        const { data, error } = await supabase
          .from('access_passwords')
          .update({
            is_used: false,
            device_id: null,
            used_at: null
          })
          .eq('id', passwordId)
          .select()
          .single();

        if (error) throw error;

        console.log(`Reset password ${passwordId}`);

        return new Response(
          JSON.stringify({ password: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'usage': {
        const { passwordId } = params;
        
        const query = supabase
          .from('credit_usage')
          .select('*')
          .order('created_at', { ascending: false });

        if (passwordId) {
          query.eq('password_id', passwordId);
        }

        const { data, error } = await query.limit(100);

        if (error) throw error;

        return new Response(
          JSON.stringify({ usage: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Admin error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});