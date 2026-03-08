// ============================================
// CORS Proxy Worker v2.0 - Full Feature Parity with Edge Function
// Deploy: Cloudflare Dashboard → Workers & Pages → Create Worker → Paste & Deploy
// Usage: POST https://your-worker.workers.dev with JSON body
// ============================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6099.144 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Brave/122',
];

let requestCounter = 0;

function getRotatedUA() {
  const idx = requestCounter % USER_AGENTS.length;
  requestCounter++;
  return USER_AGENTS[idx];
}

function buildBody(body, bodyType) {
  if (!body || bodyType === 'none') return { serialized: null, contentType: null };
  if (bodyType === 'json') return { serialized: typeof body === 'string' ? body : JSON.stringify(body), contentType: 'application/json' };
  if (bodyType === 'form-urlencoded') {
    if (typeof body === 'string') return { serialized: body, contentType: 'application/x-www-form-urlencoded' };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) params.append(k, String(v));
    return { serialized: params.toString(), contentType: 'application/x-www-form-urlencoded' };
  }
  if (bodyType === 'text') return { serialized: typeof body === 'string' ? body : JSON.stringify(body), contentType: 'text/plain' };
  return { serialized: null, contentType: null };
}

async function hitWithTimeout(url, method, headers, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, { method, headers, body, redirect: 'follow', signal: controller.signal });
    const time = Date.now() - start;
    // Drain body to release connection
    await res.text();
    return { status: res.status, time };
  } finally {
    clearTimeout(timer);
  }
}

async function hitWithRetry(url, method, headers, body) {
  try {
    return await hitWithTimeout(url, method, headers, body, 10000);
  } catch (e) {
    // Retry once after 1.5s
    await new Promise(r => setTimeout(r, 1500));
    try {
      return await hitWithTimeout(url, method, headers, body, 10000);
    } catch (e2) {
      return { status: 0, time: 0, error: e2 instanceof Error ? e2.message : 'Timeout' };
    }
  }
}

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const corsH = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      const data = await request.json();
      const { url, method = 'GET', headers: customHeaders = {}, body: reqBody, bodyType = 'json', uaRotation = true } = data;

      if (!url) {
        return Response.json({ success: false, status_code: null, response_time: 0, error: 'url is required' }, { status: 400, headers: corsH });
      }

      // UA rotation — same as Edge Function
      const ua = uaRotation !== false ? getRotatedUA() : '';

      const finalHeaders = {
        ...customHeaders,
        ...(ua ? { 'User-Agent': ua } : {}),
      };

      // Build body with proper serialization (form-urlencoded conversion etc.)
      const { serialized, contentType } = buildBody(
        reqBody && ['POST', 'PUT', 'PATCH'].includes((method || 'GET').toUpperCase()) ? reqBody : null,
        ['POST', 'PUT', 'PATCH'].includes((method || 'GET').toUpperCase()) ? (bodyType || 'json') : 'none'
      );

      if (contentType && !finalHeaders['Content-Type'] && !finalHeaders['content-type']) {
        finalHeaders['Content-Type'] = contentType;
      }

      // Hit with retry — same as Edge Function
      const result = await hitWithRetry(url, method || 'GET', finalHeaders, serialized);

      return Response.json({
        success: !result.error && result.status >= 200 && result.status < 400,
        status_code: result.status || null,
        response_time: result.time,
        error: result.error || null,
        user_agent_used: ua || null,
      }, { headers: corsH });

    } catch (err) {
      return Response.json({
        success: false,
        status_code: null,
        response_time: 0,
        error: err.message || 'Unknown error',
      }, { status: 500, headers: corsH });
    }
  },
};
