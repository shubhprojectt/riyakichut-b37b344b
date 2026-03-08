// ============================================
// CORS Proxy Worker - Full Code
// Deploy: Cloudflare Dashboard → Workers & Pages → Create Worker → Paste & Deploy
// Usage: POST https://your-worker.workers.dev with JSON body
// ============================================

export default {
  async fetch(request, env) {
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

    try {
      const body = await request.json();
      const { url, method, headers, body: reqBody, bodyType } = body;

      if (!url) {
        return Response.json({ error: 'url is required' }, { status: 400 });
      }

      const fetchOptions = {
        method: method || 'GET',
        headers: headers || {},
      };

      if (reqBody && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method)) {
        if (bodyType === 'form-urlencoded') {
          fetchOptions.body = reqBody;
          fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else {
          fetchOptions.body = typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody);
        }
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      fetchOptions.signal = controller.signal;

      const startTime = Date.now();
      const response = await fetch(url, fetchOptions);
      const responseTime = Date.now() - startTime;
      clearTimeout(timeout);

      let responseBody;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      return Response.json({
        success: response.ok,
        status_code: response.status,
        response_time: responseTime,
        body: responseBody,
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });

    } catch (err) {
      const errorMessage = err.name === 'AbortError' ? 'Request timeout (15s)' : err.message;
      return Response.json({
        success: false,
        status_code: null,
        response_time: 0,
        error: errorMessage,
      }, {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
    }
  },
};
