import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SECRET_KEY = '8I1Gpemb.iy,.)0oIyFd';
const API_URL = 'https://api.mpokket.com/onboarding-mobile-bff/user-registration-service/registry/v1/otp/send';

async function sha512(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { number, msg } = await req.json();

    if (!number) {
      return new Response(JSON.stringify({ status: 'ERROR', message: 'Missing number' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hashKey = msg || 'OTP_REQUEST';

    const jsonBody = `{"appsflyerAdvertisingId":"1770282869593-3447693864921281146","googleAdvertisingId":"ccdc6909-4cd2-4c7d-a24f-ee0c31ce6453","hashKey":"${hashKey}","mobileNumber":"${number}"}`;

    const signature = await sha512(SECRET_KEY + jsonBody);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Host': 'api.mpokket.com',
        'x-signature': signature,
        'app-version': '4.3.1',
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept-Encoding': 'gzip',
        'User-Agent': 'okhttp/4.12.0',
      },
      body: jsonBody,
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return new Response(JSON.stringify({
      success: response.ok,
      status_code: response.status,
      data,
      api_name: 'mpokket',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false, status_code: 500,
      error_message: err instanceof Error ? err.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
