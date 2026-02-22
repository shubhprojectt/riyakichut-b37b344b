import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: 5 requests per IP per minute
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000;
const ipHits = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (hits.length >= RATE_LIMIT) {
    ipHits.set(ip, hits);
    return false;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return true;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6099.144 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

let uaCounter = 0;

function replacePlaceholders(text: string, phone: string): string {
  return text.replace(/\{PHONE\}/gi, phone);
}

function replaceInObj(obj: Record<string, unknown>, phone: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') result[k] = replacePlaceholders(v, phone);
    else if (typeof v === 'object' && v !== null && !Array.isArray(v)) result[k] = replaceInObj(v as Record<string, unknown>, phone);
    else result[k] = v;
  }
  return result;
}

function buildBody(body: Record<string, unknown> | null, bodyType: string): { serialized: string | null; contentType: string | null } {
  if (!body || bodyType === 'none' || Object.keys(body).length === 0) return { serialized: null, contentType: null };
  if (bodyType === 'json') return { serialized: JSON.stringify(body), contentType: 'application/json' };
  if (bodyType === 'form-urlencoded') {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) params.append(k, String(v));
    return { serialized: params.toString(), contentType: 'application/x-www-form-urlencoded' };
  }
  if (bodyType === 'text') return { serialized: JSON.stringify(body), contentType: 'text/plain' };
  return { serialized: null, contentType: null };
}

async function hitOne(url: string, method: string, headers: Record<string, string>, body: string | null): Promise<{ status: number; time: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const start = Date.now();
  try {
    const res = await fetch(url, { method, headers, body, redirect: 'follow', signal: controller.signal });
    const time = Date.now() - start;
    await res.text();
    return { status: res.status, time };
  } catch (e) {
    return { status: 0, time: Date.now() - start, error: e instanceof Error ? e.message : 'Timeout' };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limit check
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Max 5 requests per minute.' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const keyParam = url.searchParams.get('key');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Validate secret key from app_settings
    const { data: keySetting } = await sb
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'fast_api_secret_key')
      .single();

    const storedKey = keySetting?.setting_value as string | null;
    if (storedKey && storedKey !== '' && keyParam !== storedKey) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or missing secret key' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { phone, rounds = 1 } = await req.json();
    if (!phone || phone.length < 10) {
      return new Response(JSON.stringify({ success: false, error: 'Valid phone number required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: apis, error: dbErr } = await sb
      .from('hit_apis')
      .select('*')
      .eq('enabled', true);

    if (dbErr) throw dbErr;
    if (!apis || apis.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No enabled APIs found', results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allResults: Array<{ api: string; round: number; status: number; time: number; success: boolean; error?: string }> = [];

    for (let round = 1; round <= Math.min(rounds, 50); round++) {
      // Hit all APIs in parallel per round
      const promises = apis.map(async (api) => {
        const finalUrl = replacePlaceholders(api.url, phone);
        const finalHeaders: Record<string, string> = {};
        const hdrs = (api.headers || {}) as Record<string, string>;
        for (const [k, v] of Object.entries(hdrs)) {
          finalHeaders[replacePlaceholders(k, phone)] = replacePlaceholders(v, phone);
        }

        // UA rotation
        const ua = USER_AGENTS[uaCounter % USER_AGENTS.length];
        uaCounter++;
        finalHeaders['User-Agent'] = ua;

        // Query params
        let urlWithParams = finalUrl;
        const qp = (api.query_params || {}) as Record<string, string>;
        if (Object.keys(qp).length > 0) {
          const url = new URL(finalUrl);
          for (const [k, v] of Object.entries(qp)) {
            url.searchParams.set(replacePlaceholders(k, phone), replacePlaceholders(v, phone));
          }
          urlWithParams = url.toString();
        }

        // Body
        const bodyObj = (api.body && Object.keys(api.body as object).length > 0)
          ? replaceInObj(api.body as Record<string, unknown>, phone)
          : null;
        const { serialized, contentType } = buildBody(bodyObj, api.body_type || 'none');
        if (contentType && !finalHeaders['Content-Type']) {
          finalHeaders['Content-Type'] = contentType;
        }

        const result = await hitOne(urlWithParams, api.method || 'GET', finalHeaders, serialized);
        return {
          api: api.name,
          round,
          status: result.status,
          time: result.time,
          success: !result.error && result.status >= 200 && result.status < 400,
          error: result.error,
        };
      });

      const roundResults = await Promise.allSettled(promises);
      for (const r of roundResults) {
        if (r.status === 'fulfilled') allResults.push(r.value);
        else allResults.push({ api: 'unknown', round, status: 0, time: 0, success: false, error: r.reason?.message });
      }
    }

    const totalSuccess = allResults.filter(r => r.success).length;
    const totalFail = allResults.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      phone,
      total_apis: apis.length,
      rounds: Math.min(rounds, 50),
      total_hits: allResults.length,
      success_count: totalSuccess,
      fail_count: totalFail,
      results: allResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
