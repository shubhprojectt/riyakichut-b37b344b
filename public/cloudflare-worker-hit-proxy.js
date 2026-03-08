/* ============================================================
   Cloudflare Worker — Hit API CORS Proxy + Fast Hit All
   ============================================================
   Deploy steps:
   1. https://dash.cloudflare.com → Workers & Pages → Create Worker
   2. Paste this code → Save & Deploy
   3. Worker URL milega like: https://your-worker.your-name.workers.dev
   4. App settings me ye URL daalo (niche instructions hain)
   
   Environment Variables (Cloudflare Worker Settings > Variables):
   - SUPABASE_URL        = https://qetbvgvdsgetkkupbbse.supabase.co
   - SUPABASE_SERVICE_KEY = (tumhara service role key)
   
   Routes:
   POST /hit-api          → Single API hit (same as edge function)
   POST|GET /fast-hit-all → All enabled APIs hit (same as edge function)
   ============================================================ */

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6099.144 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
];

let uaCounter = 0;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function replacePlaceholders(text, phone) {
  return text.replace(/\{PHONE\}/gi, phone);
}

function replaceInObj(obj, phone) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') result[k] = replacePlaceholders(v, phone);
    else if (typeof v === 'object' && v !== null && !Array.isArray(v)) result[k] = replaceInObj(v, phone);
    else result[k] = v;
  }
  return result;
}

function buildBody(body, bodyType) {
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

async function hitOne(url, method, headers, body, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, { method, headers, body, redirect: 'follow', signal: controller.signal });
    const time = Date.now() - start;
    // Drain body
    await res.text();
    return { status: res.status, time };
  } catch (e) {
    const time = Date.now() - start;
    if (e.name === 'AbortError') return { status: 0, time, error: `Timeout after ${timeoutMs}ms` };
    return { status: 0, time, error: e.message || 'Unknown' };
  } finally {
    clearTimeout(timer);
  }
}

async function hitWithRetry(url, method, headers, body, timeoutMs = 15000) {
  const result = await hitOne(url, method, headers, body, timeoutMs);
  if (result.error || (result.status >= 500 && result.status < 600)) {
    await new Promise(r => setTimeout(r, 500));
    return await hitOne(url, method, headers, body, timeoutMs);
  }
  return result;
}

// Fetch enabled APIs from Supabase
async function getEnabledApis(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/hit_apis?enabled=eq.true&select=*`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  return await res.json();
}

// Fetch secret key from app_settings
async function getSecretKey(env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/app_settings?setting_key=eq.fast_api_secret_key&select=setting_value`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.length === 0) return null;
  let key = data[0].setting_value;
  if (typeof key === 'string') key = key.replace(/^"|"$/g, '').trim();
  return key || null;
}

// ============ ROUTE: /hit-api ============
async function handleHitApi(request) {
  const data = await request.json();
  const { url, method = 'GET', headers: customHeaders = {}, body, bodyType = 'none', uaRotation = true } = data;

  if (!url) return jsonResponse({ success: false, error_message: 'URL is required' }, 400);

  const ua = uaRotation ? USER_AGENTS[uaCounter++ % USER_AGENTS.length] : '';
  const finalHeaders = { ...customHeaders, ...(ua ? { 'User-Agent': ua } : {}) };

  const { serialized, contentType } = buildBody(
    typeof body === 'string' ? (() => { try { return JSON.parse(body); } catch { return {}; } })() : body,
    bodyType
  );
  if (contentType && !finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
    finalHeaders['Content-Type'] = contentType;
  }

  const result = await hitWithRetry(url, method, finalHeaders, serialized);

  return jsonResponse({
    success: !result.error && result.status >= 200 && result.status < 400,
    status_code: result.status || null,
    response_time: result.time,
    error_message: result.error || null,
    user_agent_used: ua || null,
  });
}

// ============ ROUTE: /fast-hit-all ============
async function handleFastHitAll(request, env) {
  const url = new URL(request.url);
  const keyParam = url.searchParams.get('key');

  // Validate key
  const storedKey = await getSecretKey(env);
  if (storedKey && keyParam !== storedKey) {
    return jsonResponse({ success: false, error: 'Invalid or missing secret key' }, 403);
  }

  let phone = null, rounds = 1, batchSize = 5, delaySec = 2, timeoutSec = 15;

  if (request.method === 'GET') {
    phone = url.searchParams.get('phone');
    rounds = parseInt(url.searchParams.get('rounds') || '1', 10);
    batchSize = parseInt(url.searchParams.get('batch') || '5', 10);
    delaySec = parseFloat(url.searchParams.get('delay') || '2');
    timeoutSec = parseFloat(url.searchParams.get('timeout') || '15');
  } else {
    const body = await request.json();
    phone = body.phone;
    rounds = body.rounds || 1;
    batchSize = body.batch || 5;
    delaySec = body.delay || 2;
    timeoutSec = body.timeout || 15;
  }

  rounds = Math.max(1, Math.min(rounds, 50));
  batchSize = Math.max(1, Math.min(batchSize, 20));
  delaySec = Math.max(0, Math.min(delaySec, 60));
  timeoutSec = Math.max(3, Math.min(timeoutSec, 30));
  const timeoutMs = timeoutSec * 1000;
  const delayMs = delaySec * 1000;

  if (!phone || phone.length < 10) {
    return jsonResponse({ success: false, error: 'Valid phone number required' }, 400);
  }

  const apis = await getEnabledApis(env);
  if (!apis || apis.length === 0) {
    return jsonResponse({ success: true, message: 'No enabled APIs found', results: [] });
  }

  const allResults = [];

  for (let round = 1; round <= rounds; round++) {
    if (round > 1 && delayMs > 0) await new Promise(r => setTimeout(r, delayMs));

    for (let i = 0; i < apis.length; i += batchSize) {
      if (i > 0) await new Promise(r => setTimeout(r, 1000));
      const batch = apis.slice(i, i + batchSize);

      const promises = batch.map(async (api) => {
        const finalUrl = replacePlaceholders(api.url, phone);
        const finalHeaders = {};
        const hdrs = api.headers || {};
        for (const [k, v] of Object.entries(hdrs)) {
          finalHeaders[replacePlaceholders(k, phone)] = replacePlaceholders(String(v), phone);
        }

        const ua = USER_AGENTS[uaCounter++ % USER_AGENTS.length];
        finalHeaders['User-Agent'] = ua;
        finalHeaders['Accept'] = 'application/json, text/plain, */*';
        finalHeaders['Accept-Language'] = 'en-US,en;q=0.9';
        finalHeaders['Cache-Control'] = 'no-cache';
        try {
          const parsed = new URL(finalUrl);
          finalHeaders['Origin'] = parsed.origin;
          finalHeaders['Referer'] = parsed.origin + '/';
        } catch {}

        let urlWithParams = finalUrl;
        const qp = api.query_params || {};
        if (Object.keys(qp).length > 0) {
          const u = new URL(finalUrl);
          for (const [k, v] of Object.entries(qp)) {
            u.searchParams.set(replacePlaceholders(k, phone), replacePlaceholders(String(v), phone));
          }
          urlWithParams = u.toString();
        }

        const bodyObj = (api.body && Object.keys(api.body).length > 0) ? replaceInObj(api.body, phone) : null;
        const { serialized, contentType } = buildBody(bodyObj, api.body_type || 'none');
        if (contentType && !finalHeaders['Content-Type']) finalHeaders['Content-Type'] = contentType;

        const result = await hitWithRetry(urlWithParams, api.method || 'GET', finalHeaders, serialized, timeoutMs);
        return {
          api: api.name, round, status: result.status, time: result.time,
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

  return jsonResponse({
    success: true, phone, total_apis: apis.length, rounds, batch: batchSize,
    delay: delaySec, timeout: timeoutSec, total_hits: allResults.length,
    success_count: allResults.filter(r => r.success).length,
    fail_count: allResults.filter(r => !r.success).length,
    results: allResults,
  });
}

// ============ MAIN HANDLER ============
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/hit-api' && request.method === 'POST') {
        return await handleHitApi(request);
      }
      if (path === '/fast-hit-all') {
        return await handleFastHitAll(request, env);
      }

      return jsonResponse({
        message: 'Cloudflare CORS Proxy for Hit APIs',
        routes: {
          'POST /hit-api': 'Single API hit',
          'GET|POST /fast-hit-all': 'All enabled APIs hit',
        },
      });
    } catch (err) {
      return jsonResponse({ success: false, error: err.message || 'Internal error' }, 500);
    }
  },
};
