import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// In-memory state for active users (maps chatId -> { waiting: boolean, running: boolean, phone: string })
// Note: Edge functions are stateless per invocation, so we use Supabase for persistence
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ---- Telegram helpers ----
async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---- Hit APIs logic ----
async function getEnabledApis() {
  const { data, error } = await supabase
    .from('hit_apis')
    .select('*')
    .eq('enabled', true);
  
  if (error) {
    console.error('Error fetching APIs:', error);
    return [];
  }
  return data || [];
}

function replacePlaceholders(text: string, phone: string): string {
  return text.replace(/\{PHONE\}/gi, phone);
}

async function hitSingleApi(api: any, phone: string): Promise<{ name: string; success: boolean; status: number | null; time: number; error?: string }> {
  const url = replacePlaceholders(api.url, phone);
  const method = api.method || 'GET';
  
  // Build headers
  const headers: Record<string, string> = {};
  if (api.headers && typeof api.headers === 'object') {
    for (const [k, v] of Object.entries(api.headers)) {
      headers[replacePlaceholders(k, phone)] = replacePlaceholders(String(v), phone);
    }
  }
  
  // Build body
  let body: string | undefined;
  const bodyType = api.body_type || 'none';
  if (bodyType !== 'none' && api.body) {
    const rawBody = typeof api.body === 'string' ? api.body : JSON.stringify(api.body);
    body = replacePlaceholders(rawBody, phone);
    if (bodyType === 'json' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (bodyType === 'form-urlencoded' && !headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method,
      headers,
      body: ['GET', 'DELETE'].includes(method) ? undefined : body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    await res.text();
    return { name: api.name, success: res.ok, status: res.status, time: Date.now() - start };
  } catch (err) {
    return { name: api.name, success: false, status: null, time: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
  }
}

async function runHitsForPhone(chatId: number, phone: string) {
  const apis = await getEnabledApis();
  
  if (apis.length === 0) {
    await sendMessage(chatId, '❌ <b>No APIs configured!</b>\nAdmin panel me APIs add karo pehle.');
    return;
  }

  await sendMessage(chatId, `🚀 <b>Hitting ${apis.length} APIs for:</b> <code>${phone}</code>\n⏳ Please wait...`);

  let successCount = 0;
  let failCount = 0;
  const results: string[] = [];

  for (const api of apis) {
    const result = await hitSingleApi(api, phone);
    if (result.success) {
      successCount++;
      results.push(`✅ ${result.name} → ${result.status} (${result.time}ms)`);
    } else {
      failCount++;
      results.push(`❌ ${result.name} → ${result.status || 'ERR'} (${result.error || ''})`);
    }
  }

  const summary = `📊 <b>Results:</b>\n\n` +
    `✅ Success: <b>${successCount}</b>\n` +
    `❌ Failed: <b>${failCount}</b>\n` +
    `📱 Number: <code>${phone}</code>\n\n` +
    results.slice(0, 30).join('\n') +
    (results.length > 30 ? `\n... and ${results.length - 30} more` : '');

  await sendMessage(chatId, summary, {
    inline_keyboard: [[
      { text: '🔄 Hit Again', callback_data: `hit_again:${phone}` },
      { text: '🏠 Main Menu', callback_data: 'main_menu' },
    ]]
  });
}

// ---- Main handler ----
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET for webhook setup info
  if (req.method === 'GET') {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;
    return new Response(JSON.stringify({ 
      message: 'Telegram Bot webhook endpoint',
      webhook_url: webhookUrl,
      setup: `Set webhook: ${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const update = await req.json();
    console.log('Telegram update:', JSON.stringify(update).slice(0, 500));

    // Handle /setwebhook command via query param
    const url = new URL(req.url);
    if (url.searchParams.get('action') === 'setwebhook') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;
      const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data = cb.data;
      const messageId = cb.message.message_id;

      await answerCallbackQuery(cb.id);

      if (data === 'start_hit') {
        // Save state - waiting for phone
        await supabase.from('app_settings').upsert({
          setting_key: `tgbot_state_${chatId}`,
          setting_value: { waiting_phone: true },
        }, { onConflict: 'setting_key' });

        await editMessage(chatId, messageId, '📱 <b>Please send phone number</b>\n\nExample: <code>9876543210</code>\n\nNumber bhejo with or without country code.');
      } 
      else if (data === 'stop_hit') {
        await supabase.from('app_settings').upsert({
          setting_key: `tgbot_state_${chatId}`,
          setting_value: { waiting_phone: false },
        }, { onConflict: 'setting_key' });

        await editMessage(chatId, messageId, '🛑 <b>Stopped!</b>\n\nDobara start karne ke liye /start bhejo.');
      }
      else if (data === 'main_menu') {
        await editMessage(chatId, messageId, 
          '🔥 <b>Hit API Bot</b>\n\nSelect an option:', {
          inline_keyboard: [[
            { text: '▶️ Start', callback_data: 'start_hit' },
            { text: '⏹️ Stop', callback_data: 'stop_hit' },
          ]]
        });
      }
      else if (data.startsWith('hit_again:')) {
        const phone = data.split(':')[1];
        await editMessage(chatId, messageId, `🔄 <b>Re-hitting for:</b> <code>${phone}</code>...`);
        await runHitsForPhone(chatId, phone);
      }

      return new Response('OK', { headers: corsHeaders });
    }

    // Handle regular messages
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = (msg.text || '').trim();

      // /start command
      if (text === '/start') {
        await sendMessage(chatId, 
          '🔥 <b>Hit API Bot</b>\n\n' +
          'Ye bot enabled APIs ko phone number pe hit karega.\n\n' +
          'Select an option:', {
          inline_keyboard: [[
            { text: '▶️ Start', callback_data: 'start_hit' },
            { text: '⏹️ Stop', callback_data: 'stop_hit' },
          ]]
        });
        return new Response('OK', { headers: corsHeaders });
      }

      // Check if bot is waiting for phone number
      const { data: stateData } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', `tgbot_state_${chatId}`)
        .single();

      const state = stateData?.setting_value as any;

      if (state?.waiting_phone) {
        // Validate phone number
        const cleanPhone = text.replace(/[\s\-\(\)]/g, '');
        const phoneRegex = /^\+?[0-9]{10,15}$/;

        if (!phoneRegex.test(cleanPhone)) {
          await sendMessage(chatId, '❌ <b>Invalid phone number!</b>\n\nSahi format me bhejo:\n<code>9876543210</code> ya <code>+919876543210</code>');
          return new Response('OK', { headers: corsHeaders });
        }

        // Clear waiting state
        await supabase.from('app_settings').upsert({
          setting_key: `tgbot_state_${chatId}`,
          setting_value: { waiting_phone: false },
        }, { onConflict: 'setting_key' });

        // Run hits
        await runHitsForPhone(chatId, cleanPhone);
        return new Response('OK', { headers: corsHeaders });
      }

      // Default response
      await sendMessage(chatId, '👋 <b>/start</b> bhejo shuru karne ke liye!');
    }

    return new Response('OK', { headers: corsHeaders });
  } catch (error) {
    console.error('Bot error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
