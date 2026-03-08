import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ===== Telegram Helpers =====
async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function answerCallbackQuery(id: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text }),
  });
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ===== Settings helpers =====
async function getSetting(key: string): Promise<any> {
  const { data } = await supabase.from('app_settings').select('setting_value').eq('setting_key', key).single();
  return data?.setting_value ?? null;
}

async function setSetting(key: string, value: any) {
  const { data: existing } = await supabase.from('app_settings').select('id').eq('setting_key', key).maybeSingle();
  if (existing?.id) {
    await supabase.from('app_settings').update({ setting_value: value }).eq('id', existing.id);
  } else {
    await supabase.from('app_settings').insert({ setting_key: key, setting_value: value });
  }
}

// ===== Bot State =====
async function getBotState(chatId: number): Promise<any> {
  return (await getSetting(`tgbot_state_${chatId}`)) || {};
}

async function setBotState(chatId: number, state: any) {
  await setSetting(`tgbot_state_${chatId}`, state);
}

// ===== Admin Check =====
const OWNER_CHAT_ID = 8086397189;

async function getAdminIds(): Promise<number[]> {
  const val = await getSetting('tgbot_admin_ids');
  const ids = Array.isArray(val) ? val : [];
  // Always include owner
  if (!ids.includes(OWNER_CHAT_ID)) ids.push(OWNER_CHAT_ID);
  return ids;
}

async function isAdmin(chatId: number): Promise<boolean> {
  const admins = await getAdminIds();
  return admins.includes(chatId);
}

// ===== Bot Config =====
async function getBotConfig(): Promise<{
  dailyLimit: number; defaultRounds: number; defaultBatch: number; defaultDelay: number;
}> {
  const val = await getSetting('tgbot_config');
  return {
    dailyLimit: val?.dailyLimit ?? 5,
    defaultRounds: val?.defaultRounds ?? 1,
    defaultBatch: val?.defaultBatch ?? 5,
    defaultDelay: val?.defaultDelay ?? 2,
    ...val,
  };
}

// ===== CF Workers =====
async function getCfWorkers(): Promise<string[]> {
  const val = await getSetting('tgbot_cf_workers');
  if (Array.isArray(val)) return val;
  return [];
}

let workerIndex = 0;
async function getNextWorker(): Promise<string | null> {
  const workers = await getCfWorkers();
  if (workers.length === 0) return null;
  const worker = workers[workerIndex % workers.length];
  workerIndex++;
  return worker;
}

// ===== Hit Proxy Mode (synced with website) =====
async function getHitProxyMode(): Promise<'edge' | 'cloudflare'> {
  // Read from hit_site_settings (same as website)
  const { data } = await supabase.from('app_settings').select('setting_value').eq('setting_key', 'hit_site_settings').maybeSingle();
  const settings = data?.setting_value as any;
  return settings?.hitProxyMode || 'edge';
}

async function setHitProxyMode(mode: 'edge' | 'cloudflare') {
  const { data } = await supabase.from('app_settings').select('id, setting_value').eq('setting_key', 'hit_site_settings').maybeSingle();
  if (data?.id) {
    const current = (data.setting_value as any) || {};
    current.hitProxyMode = mode;
    await supabase.from('app_settings').update({ setting_value: current }).eq('id', data.id);
  } else {
    await supabase.from('app_settings').insert({ setting_key: 'hit_site_settings', setting_value: { hitProxyMode: mode } });
  }
}

// ===== Premium =====
async function getPremiumUsers(): Promise<Record<string, { plan: string; expiresAt: string; userId: number }>> {
  const val = await getSetting('tgbot_premium_users');
  return (val && typeof val === 'object') ? val : {};
}

async function isPremium(chatId: number): Promise<{ isPremium: boolean; plan: string | null }> {
  const users = await getPremiumUsers();
  const entry = users[String(chatId)];
  if (!entry) return { isPremium: false, plan: null };
  if (new Date(entry.expiresAt) < new Date()) {
    // Expired
    delete users[String(chatId)];
    await setSetting('tgbot_premium_users', users);
    return { isPremium: false, plan: null };
  }
  return { isPremium: true, plan: entry.plan };
}

// ===== User Usage Tracking =====
async function getUserUsage(chatId: number): Promise<{ today: number; total: number }> {
  const val = await getSetting(`tgbot_usage_${chatId}`);
  const today = new Date().toISOString().slice(0, 10);
  if (!val || val.date !== today) return { today: 0, total: val?.total || 0 };
  return { today: val.today || 0, total: val.total || 0 };
}

async function incrementUsage(chatId: number) {
  const today = new Date().toISOString().slice(0, 10);
  const val = await getSetting(`tgbot_usage_${chatId}`);
  const current = (val && val.date === today) ? val : { date: today, today: 0, total: val?.total || 0 };
  current.today += 1;
  current.total += 1;
  current.date = today;
  await setSetting(`tgbot_usage_${chatId}`, current);
}

// ===== Stats =====
async function getGlobalStats(): Promise<{ totalHits: number; totalUsers: number }> {
  const val = await getSetting('tgbot_global_stats');
  return { totalHits: val?.totalHits || 0, totalUsers: val?.totalUsers || 0 };
}

async function incrementGlobalHits(count: number) {
  const stats = await getGlobalStats();
  stats.totalHits += count;
  await setSetting('tgbot_global_stats', stats);
}

async function trackUser(chatId: number) {
  const key = 'tgbot_all_users';
  const val = await getSetting(key);
  const users: number[] = Array.isArray(val) ? val : [];
  if (!users.includes(chatId)) {
    users.push(chatId);
    await setSetting(key, users);
    const stats = await getGlobalStats();
    stats.totalUsers = users.length;
    await setSetting('tgbot_global_stats', stats);
  }
}

// ===== Access Keys =====
async function getAccessKeys(): Promise<string[]> {
  const val = await getSetting('tgbot_access_keys');
  return Array.isArray(val) ? val : [];
}

// ===== Hit APIs =====
async function getEnabledApis() {
  const { data } = await supabase.from('hit_apis').select('*').eq('enabled', true);
  return data || [];
}

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

async function hitSingleApi(api: any, phone: string, workerUrl?: string | null): Promise<{ name: string; success: boolean; status: number | null; time: number; error?: string }> {
  const url = replacePlaceholders(api.url, phone);
  const method = api.method || 'GET';
  const headers: Record<string, string> = {};
  if (api.headers && typeof api.headers === 'object') {
    for (const [k, v] of Object.entries(api.headers)) {
      headers[replacePlaceholders(k, phone)] = replacePlaceholders(String(v), phone);
    }
  }

  let body: string | undefined;
  const bodyType = api.body_type || 'none';
  if (bodyType !== 'none' && api.body) {
    const rawBody = typeof api.body === 'string' ? api.body : JSON.stringify(api.body);
    body = replacePlaceholders(rawBody, phone);
    if (bodyType === 'json' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    if (bodyType === 'form-urlencoded' && !headers['Content-Type']) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  // Add query params
  let finalUrl = url;
  const qp = api.query_params || {};
  if (Object.keys(qp).length > 0) {
    try {
      const u = new URL(url);
      for (const [k, v] of Object.entries(qp)) {
        u.searchParams.set(replacePlaceholders(k, phone), replacePlaceholders(String(v), phone));
      }
      finalUrl = u.toString();
    } catch {}
  }

  const start = Date.now();

  // If CF worker is available, use it as proxy
  if (workerUrl) {
    try {
      const proxyBody: any = { url: finalUrl, method, headers };
      if (body && !['GET', 'DELETE'].includes(method)) {
        proxyBody.body = body;
        proxyBody.bodyType = bodyType;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyBody),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data = await res.json();
      return { name: api.name, success: data?.success ?? false, status: data?.status_code ?? null, time: data?.response_time ?? (Date.now() - start) };
    } catch (err) {
      return { name: api.name, success: false, status: null, time: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  // Direct hit
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(finalUrl, {
      method, headers,
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

// ===== Progress Bar Helper =====
function makeProgressBar(success: number, total: number): string {
  const filled = total > 0 ? Math.round((success / total) * 10) : 0;
  const empty = Math.max(0, 10 - filled);
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

function makeStatusMessage(
  phone: string,
  batch: number,
  delay: number,
  modeLabel: string,
  round: number,
  success: number,
  fail: number,
  running: boolean,
): string {
  const total = success + fail;
  const bar = makeProgressBar(success, total);
  const status = running ? '⚡ RUNNING...' : '🛑 STOPPED';

  let text = `🚀 <b>${status}</b>\n\n`;
  text += `📱 Number: <code>${phone}</code>\n`;
  text += `🌐 Mode: ${modeLabel} | 📦 Batch: ${batch} | ⏱️ ${delay}s\n\n`;
  text += `📊 <b>Progress:</b>\n`;
  text += `${bar} ${total > 0 ? Math.round((success / total) * 100) : 0}%\n\n`;
  text += `🔄 Rounds: <b>${round}</b>\n`;
  text += `✅ Success: <b>${success}</b>\n`;
  text += `❌ Failed: <b>${fail}</b>\n`;
  text += `📈 Total Hits: <b>${total}</b>`;
  return text;
}

// Self-invoke to continue hitting (bypasses function timeout)
async function selfContinueHits(
  chatId: number,
  phone: string,
  batch: number,
  delay: number,
  totalRounds: number,
  totalSuccess: number,
  totalFail: number,
  statusMsgId: number,
  nextApiIndex: number,
  runId: string,
) {
  const backendUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    await fetch(`${backendUrl}/functions/v1/telegram-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
      body: JSON.stringify({
        _internal_continue: true,
        chatId,
        phone,
        batch,
        delay,
        totalRounds,
        totalSuccess,
        totalFail,
        statusMsgId,
        nextApiIndex,
        runId,
      }),
    });
  } catch (e) {
    console.error('Self-continue failed:', e);
  }
}

async function runHitsForPhone(
  chatId: number,
  phone: string,
  rounds = 1,
  batch = 5,
  delay = 2,
  isContinuous = false,
  prevRounds = 0,
  prevSuccess = 0,
  prevFail = 0,
  statusMsgId = 0,
  currentApiIndex = 0,
  runId = '',
) {
  const apis = await getEnabledApis();
  if (apis.length === 0) {
    await sendMessage(chatId, '❌ <b>No APIs configured!</b>');
    return;
  }

  const proxyMode = await getHitProxyMode();
  const modeLabel = proxyMode === 'cloudflare' ? '☁️ CF Worker' : '⚡ Edge Fn';

  // First invocation: create one status message only once
  if (!isContinuous) {
    runId = crypto.randomUUID();
    await setBotState(chatId, { running: true, waiting_phone: false, phone, batch, delay, runId });
    const statusText = makeStatusMessage(phone, batch, delay, modeLabel, 0, 0, 0, true);
    const result = await sendMessage(chatId, statusText, {
      inline_keyboard: [[{ text: '🛑 STOP NOW', callback_data: 'stop_hit' }]],
    });
    statusMsgId = result?.result?.message_id || 0;
    currentApiIndex = 0;
  }

  let successCount = prevSuccess;
  let failCount = prevFail;
  let roundsDone = prevRounds;

  // Hard-stop gate before any work
  const stateBefore = await getBotState(chatId);
  if (!stateBefore?.running || !stateBefore?.runId || stateBefore.runId !== runId) {
    if (statusMsgId) {
      try {
        const finalText = makeStatusMessage(phone, batch, delay, modeLabel, roundsDone, successCount, failCount, false);
        await editMessage(chatId, statusMsgId, finalText, {
          inline_keyboard: [[
            { text: '🔄 Start Again', callback_data: `hit_again:${phone}:1:${batch}:${delay}` },
            { text: '🏠 Main Menu', callback_data: 'main_menu' },
          ]],
        });
      } catch {}
    }
    return;
  }

  // Delay only when a NEW round starts (except very first round)
  if (currentApiIndex === 0 && roundsDone > 0) {
    await new Promise((r) => setTimeout(r, delay * 1000));
  }

  // Process only ONE batch per invocation (fast stop responsiveness)
  const batchApis = apis.slice(currentApiIndex, currentApiIndex + batch);
  const workerUrl = proxyMode === 'cloudflare' ? await getNextWorker() : null;

  const batchResults = await Promise.allSettled(batchApis.map((api) => hitSingleApi(api, phone, workerUrl)));
  for (const r of batchResults) {
    if (r.status === 'fulfilled') {
      if (r.value.success) successCount++;
      else failCount++;
    } else {
      failCount++;
    }
  }

  // Advance cursor; when full list finished, increment round
  let nextApiIndex = currentApiIndex + batch;
  if (nextApiIndex >= apis.length) {
    nextApiIndex = 0;
    roundsDone++;
  }

  // Update the same status message
  if (statusMsgId) {
    try {
      const statusText = makeStatusMessage(phone, batch, delay, modeLabel, roundsDone, successCount, failCount, true);
      await editMessage(chatId, statusMsgId, statusText, {
        inline_keyboard: [[{ text: '🛑 STOP NOW', callback_data: 'stop_hit' }]],
      });
    } catch {}
  }

  await incrementUsage(chatId);
  await incrementGlobalHits(successCount - prevSuccess + failCount - prevFail);

  // Hard-stop gate after one batch
  const stateAfter = await getBotState(chatId);
  if (!stateAfter?.running || !stateAfter?.runId || stateAfter.runId !== runId) {
    if (statusMsgId) {
      try {
        const finalText = makeStatusMessage(phone, batch, delay, modeLabel, roundsDone, successCount, failCount, false);
        await editMessage(chatId, statusMsgId, finalText, {
          inline_keyboard: [[
            { text: '🔄 Start Again', callback_data: `hit_again:${phone}:1:${batch}:${delay}` },
            { text: '🏠 Main Menu', callback_data: 'main_menu' },
          ]],
        });
      } catch {}
    }
    return;
  }

  // Continue with next batch
  selfContinueHits(
    chatId,
    phone,
    batch,
    delay,
    roundsDone,
    successCount,
    failCount,
    statusMsgId,
    nextApiIndex,
    runId,
  );
}

// ===== Main Menu Keyboard =====
async function getMainMenuKeyboard(admin: boolean, chatId?: number) {
  const mode = await getHitProxyMode();
  const modeIcon = mode === 'cloudflare' ? '☁️' : '⚡';
  const modeText = mode === 'cloudflare' ? 'CF Worker' : 'Edge Fn';
  
  // Check if hitting is active — show Stop only when running
  let isHitting = false;
  if (chatId) {
    const state = await getBotState(chatId);
    isHitting = !!state?.running;
  }
  
  const topRow: any[] = [{ text: '🚀 Start', callback_data: 'start_hit' }];
  if (isHitting) {
    topRow.push({ text: '🛑 Stop', callback_data: 'stop_hit' });
  }
  
  const keyboard: any[][] = [
    topRow,
    [{ text: `${modeIcon} Mode: ${modeText}`, callback_data: 'toggle_mode' }, { text: '📅 Schedule', callback_data: 'schedule_hit' }],
  ];

  if (admin) {
    keyboard.push(
      [{ text: '💎 Premium', callback_data: 'premium_menu' }],
      [{ text: '📊 Stats', callback_data: 'stats' }, { text: '⚙️ Settings', callback_data: 'settings' }],
      [{ text: '🥉 Give Basic', callback_data: 'give_basic' }, { text: '🥈 Give Pro', callback_data: 'give_pro' }, { text: '🥇 Give Ultimate', callback_data: 'give_ultimate' }],
      [{ text: '🗑️ Remove Premium', callback_data: 'remove_premium_prompt' }],
      [{ text: '📢 Broadcast', callback_data: 'broadcast_prompt' }, { text: '☁️ Workers', callback_data: 'workers' }],
      [{ text: '📊 Set Limit', callback_data: 'set_limit_prompt' }],
      [{ text: '🔐 Admin Panel', callback_data: 'admin_panel' }],
    );
  } else {
    keyboard.push(
      [{ text: '💎 Premium', callback_data: 'premium_menu' }],
      [{ text: '📊 Stats', callback_data: 'stats' }, { text: '⚙️ Settings', callback_data: 'settings' }],
    );
  }

  return { inline_keyboard: keyboard };
}

// ===== MAIN HANDLER =====
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method === 'GET') {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;
    const url = new URL(req.url);
    if (url.searchParams.get('action') === 'setwebhook') {
      const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ webhook_url: webhookUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const update = await req.json();

    // ===== Internal self-continue for non-stop hitting =====
    if (update._internal_continue) {
      const { chatId, phone, batch, delay, totalRounds, totalSuccess, totalFail, statusMsgId, nextApiIndex, runId } = update;
      await runHitsForPhone(chatId, phone, 1, batch, delay, true, totalRounds, totalSuccess, totalFail, statusMsgId || 0, nextApiIndex || 0, runId || '');
      return new Response('OK', { headers: corsHeaders });
    }

    const url = new URL(req.url);
    if (url.searchParams.get('action') === 'setwebhook') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;
      const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      return new Response(JSON.stringify(await res.json()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== CALLBACK QUERIES ==========
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const msgId = cb.message.message_id;
      const data = cb.data;
      const admin = await isAdmin(chatId);

      await answerCallbackQuery(cb.id);
      await trackUser(chatId);

      // --- Main Menu ---
      if (data === 'main_menu') {
        await editMessage(chatId, msgId, '🔥 <b>Hit API Bot</b>\n\nSelect an option:', await getMainMenuKeyboard(admin, chatId));
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Toggle Mode ---
      if (data === 'toggle_mode') {
        if (!admin) { await answerCallbackQuery(cb.id, '❌ Admin only!'); return new Response('OK', { headers: corsHeaders }); }
        const currentMode = await getHitProxyMode();
        const newMode = currentMode === 'edge' ? 'cloudflare' : 'edge';
        await setHitProxyMode(newMode);
        const modeLabel = newMode === 'cloudflare' ? '☁️ CF Worker' : '⚡ Edge Function';
        await editMessage(chatId, msgId, `🔄 <b>Mode Changed!</b>\n\n🌐 Now using: <b>${modeLabel}</b>\n\n<i>Website aur bot dono isi mode se hit karenge.</i>`, await getMainMenuKeyboard(admin, chatId));
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Start Hit ---
      if (data === 'start_hit') {
        await setBotState(chatId, { waiting_phone: true });
        await editMessage(chatId, msgId, '📱 <b>Phone number bhejo</b>\n\nFormat: <code>9876543210</code>\n\nParams ke saath: <code>9876543210 5 10 3</code>\n<i>(number rounds batch delay)</i>');
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Stop ---
      if (data === 'stop_hit') {
        await setBotState(chatId, { running: false, waiting_phone: false });
        await answerCallbackQuery(cb.id, '🛑 Stopped!');
        // Don't edit here - the running loop will detect stop and edit the status message itself
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Schedule Hit ---
      if (data === 'schedule_hit') {
        await editMessage(chatId, msgId, '📅 <b>Schedule Hit</b>\n\nSchedule karne ke liye web panel ka use karo.\nYa /start se manual hit karo.');
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Stats ---
      if (data === 'stats') {
        const usage = await getUserUsage(chatId);
        const config = await getBotConfig();
        const prem = await isPremium(chatId);
        const global = await getGlobalStats();
        const apis = await getEnabledApis();
        const workers = await getCfWorkers();

        let statsText = `📊 <b>Statistics</b>\n\n`;
        statsText += `👤 <b>Your Stats:</b>\n`;
        statsText += `• Today: ${usage.today} hits\n`;
        statsText += `• Total: ${usage.total} hits\n`;
        statsText += `• Plan: ${prem.isPremium ? `💎 ${prem.plan}` : '🆓 Free'}\n`;
        statsText += `• Daily Limit: ${prem.isPremium ? '♾️ Unlimited' : config.dailyLimit}\n\n`;
        statsText += `🌐 <b>Global Stats:</b>\n`;
        statsText += `• Total Hits: ${global.totalHits}\n`;
        statsText += `• Total Users: ${global.totalUsers}\n`;
        statsText += `• Active APIs: ${apis.length}\n`;
        statsText += `• CF Workers: ${workers.length}`;

        await editMessage(chatId, msgId, statsText, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Settings ---
      if (data === 'settings') {
        const config = await getBotConfig();
        let text = `⚙️ <b>Settings</b>\n\n`;
        text += `📊 Default Rounds: ${config.defaultRounds}\n`;
        text += `📦 Default Batch: ${config.defaultBatch}\n`;
        text += `⏱️ Default Delay: ${config.defaultDelay}s\n`;
        text += `📈 Daily Limit (Free): ${config.dailyLimit}\n\n`;
        text += `<b>Change settings:</b>\n`;
        text += `/setsettings R B D - Change defaults\n`;
        text += `Example: <code>/setsettings 5 10 3</code>`;

        await editMessage(chatId, msgId, text, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Premium Menu ---
      if (data === 'premium_menu') {
        const prem = await isPremium(chatId);
        let text = `💎 <b>Premium</b>\n\n`;
        if (prem.isPremium) {
          text += `✅ You have <b>${prem.plan}</b> plan!\n\n`;
        } else {
          text += `You're on the <b>Free</b> plan.\n\n`;
        }
        text += `<b>Plans:</b>\n`;
        text += `🥉 Basic - Extended limits\n`;
        text += `🥈 Pro - Higher limits + priority\n`;
        text += `🥇 Ultimate - Unlimited + all features\n\n`;
        text += `Contact admin for premium access.`;

        await editMessage(chatId, msgId, text, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Workers ---
      if (data === 'workers') {
        const workers = await getCfWorkers();
        let text = `☁️ <b>CF Workers (${workers.length})</b>\n\n`;
        if (workers.length === 0) {
          text += `No custom workers. Default worker active.\n\n`;
        } else {
          workers.forEach((w, i) => { text += `${i + 1}. <code>${w}</code>\n`; });
          text += `\n`;
        }
        text += `📝 <b>Commands:</b>\n`;
        text += `/addworker URL - Add worker\n`;
        text += `/delworker URL - Remove\n`;
        text += `/clearworkers - Reset\n\n`;
        text += `💡 Multiple workers = load balancing!\n`;
        text += `${workers.length || 1} workers = ${(workers.length || 1) * 100}k req/day`;

        await editMessage(chatId, msgId, text, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Admin Panel ---
      if (data === 'admin_panel' && admin) {
        let text = `🔐 <b>Admin Panel</b>\n\n`;
        text += `/apis - List all APIs\n`;
        text += `/addapi NAME|URL - Add GET API\n`;
        text += `/delapi API_ID - Delete API\n`;
        text += `/toggleapi API_ID - Enable/disable\n`;
        text += `/keys - List access keys\n`;
        text += `/addkey PASSWORD - Add key\n`;
        text += `/delkey PASSWORD - Delete key\n`;
        text += `/broadcast MSG - Broadcast to all\n`;
        text += `/setlimit N - Free user daily limit\n`;
        text += `/setsettings R B D - Change defaults`;

        await editMessage(chatId, msgId, text, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Give Premium Prompts ---
      if (data === 'give_basic' || data === 'give_pro' || data === 'give_ultimate') {
        if (!admin) { await editMessage(chatId, msgId, '❌ Admin only.'); return new Response('OK', { headers: corsHeaders }); }
        const plan = data === 'give_basic' ? 'Basic' : data === 'give_pro' ? 'Pro' : 'Ultimate';
        await setBotState(chatId, { waiting_premium: true, premiumPlan: plan });
        await editMessage(chatId, msgId, `🎁 <b>Give ${plan} Premium</b>\n\nUser ka Telegram ID bhejo:\n<code>/givepremium USER_ID ${plan} 30</code>\n<i>(ID plan days)</i>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Remove Premium Prompt ---
      if (data === 'remove_premium_prompt') {
        if (!admin) { await editMessage(chatId, msgId, '❌ Admin only.'); return new Response('OK', { headers: corsHeaders }); }
        await editMessage(chatId, msgId, '🗑️ <b>Remove Premium</b>\n\nUser ka ID bhejo:\n<code>/removepremium USER_ID</code>');
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Broadcast Prompt ---
      if (data === 'broadcast_prompt') {
        if (!admin) { await editMessage(chatId, msgId, '❌ Admin only.'); return new Response('OK', { headers: corsHeaders }); }
        await setBotState(chatId, { waiting_broadcast: true });
        await editMessage(chatId, msgId, '📢 <b>Broadcast</b>\n\nMessage bhejo jo sabko jayega:\n<code>/broadcast Your message here</code>');
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Set Limit Prompt ---
      if (data === 'set_limit_prompt') {
        if (!admin) { await editMessage(chatId, msgId, '❌ Admin only.'); return new Response('OK', { headers: corsHeaders }); }
        await editMessage(chatId, msgId, '📊 <b>Set Daily Limit</b>\n\n<code>/setlimit 10</code>\n<i>(Free users ke liye daily limit)</i>');
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Hit Again ---
      if (data.startsWith('hit_again:')) {
        const parts = data.split(':');
        const phone = parts[1];
        const batch = parseInt(parts[3]) || 5;
        const delay = parseInt(parts[4]) || 2;
        await editMessage(chatId, msgId, `🔄 <b>Re-starting non-stop hitting...</b>`);
        await runHitsForPhone(chatId, phone, 1, batch, delay);
        return new Response('OK', { headers: corsHeaders });
      }

      return new Response('OK', { headers: corsHeaders });
    }

    // ========== TEXT MESSAGES ==========
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = (msg.text || '').trim();
      const admin = await isAdmin(chatId);
      await trackUser(chatId);

      // --- /start ---
      if (text === '/start') {
        await sendMessage(chatId, '🔥 <b>Hit API Bot</b>\n\nSelect an option:', await getMainMenuKeyboard(admin, chatId));
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /help ---
      if (text === '/help') {
        let helpText = `📖 <b>Bot Commands</b>\n\n<b>General:</b>\n`;
        helpText += `/start - Main menu\n`;
        helpText += `/stats - View statistics\n`;
        helpText += `/settings - Hit settings guide\n`;
        helpText += `/help - This help\n\n`;
        helpText += `<b>Hit API:</b>\n`;
        helpText += `Send phone number: <code>1234567890</code>\n`;
        helpText += `With params: <code>1234567890 5 10 3</code>\n`;
        helpText += `(number rounds batch delay)\n`;

        if (admin) {
          helpText += `\n🔐 <b>Admin Commands:</b>\n`;
          helpText += `/setlimit N - Free user daily limit\n`;
          helpText += `/setsettings R B D - Change defaults\n`;
          helpText += `/apis - List all APIs\n`;
          helpText += `/addapi NAME|URL - Add GET API\n`;
          helpText += `/delapi API_ID - Delete API\n`;
          helpText += `/toggleapi API_ID - Enable/disable\n`;
          helpText += `/keys - List access keys\n`;
          helpText += `/addkey PASSWORD - Add key\n`;
          helpText += `/delkey PASSWORD - Delete key\n`;
          helpText += `/givepremium ID PLAN DAYS - Give premium\n`;
          helpText += `/removepremium ID - Remove premium\n`;
          helpText += `/premium - List premium users\n`;
          helpText += `/broadcast MSG - Broadcast to all\n`;
          helpText += `/workers - List CF workers\n`;
          helpText += `/addworker URL - Add CF worker\n`;
          helpText += `/delworker URL - Remove worker\n`;
          helpText += `/clearworkers - Reset workers\n`;
          helpText += `/logout - Logout admin`;
        }

        await sendMessage(chatId, helpText);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /stats ---
      if (text === '/stats') {
        const usage = await getUserUsage(chatId);
        const config = await getBotConfig();
        const prem = await isPremium(chatId);
        const global = await getGlobalStats();
        await sendMessage(chatId, `📊 <b>Stats</b>\n\n👤 Today: ${usage.today} | Total: ${usage.total}\n💎 Plan: ${prem.isPremium ? prem.plan : 'Free'}\n📈 Limit: ${prem.isPremium ? '♾️' : config.dailyLimit}\n\n🌐 Global Hits: ${global.totalHits} | Users: ${global.totalUsers}`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /settings ---
      if (text === '/settings') {
        const config = await getBotConfig();
        await sendMessage(chatId, `⚙️ <b>Settings</b>\n\nRounds: ${config.defaultRounds} | Batch: ${config.defaultBatch} | Delay: ${config.defaultDelay}s\nDaily Limit: ${config.dailyLimit}\n\nChange: <code>/setsettings R B D</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // === ADMIN COMMANDS ===

      // --- /setlimit ---
      if (text.startsWith('/setlimit') && admin) {
        const num = parseInt(text.split(' ')[1]);
        if (isNaN(num) || num < 1) { await sendMessage(chatId, '❌ Usage: <code>/setlimit 10</code>'); return new Response('OK', { headers: corsHeaders }); }
        const config = await getBotConfig();
        config.dailyLimit = num;
        await setSetting('tgbot_config', config);
        await sendMessage(chatId, `✅ Daily limit set to <b>${num}</b>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /setsettings ---
      if (text.startsWith('/setsettings') && admin) {
        const parts = text.split(/\s+/).slice(1);
        if (parts.length < 3) { await sendMessage(chatId, '❌ Usage: <code>/setsettings 5 10 3</code> (rounds batch delay)'); return new Response('OK', { headers: corsHeaders }); }
        const config = await getBotConfig();
        config.defaultRounds = parseInt(parts[0]) || 1;
        config.defaultBatch = parseInt(parts[1]) || 5;
        config.defaultDelay = parseInt(parts[2]) || 2;
        await setSetting('tgbot_config', config);
        await sendMessage(chatId, `✅ Settings updated!\nRounds: ${config.defaultRounds} | Batch: ${config.defaultBatch} | Delay: ${config.defaultDelay}s`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /apis ---
      if (text === '/apis' && admin) {
        const apis = await getEnabledApis();
        const { data: allApis } = await supabase.from('hit_apis').select('id, name, url, enabled');
        if (!allApis || allApis.length === 0) { await sendMessage(chatId, '📝 No APIs found.'); return new Response('OK', { headers: corsHeaders }); }
        let apiText = `📝 <b>APIs (${allApis.length})</b>\n\n`;
        allApis.forEach((a, i) => {
          apiText += `${i + 1}. ${a.enabled ? '✅' : '❌'} <b>${a.name}</b>\nID: <code>${a.id}</code>\n${a.url.slice(0, 50)}...\n\n`;
        });
        await sendMessage(chatId, apiText);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /addapi ---
      if (text.startsWith('/addapi') && admin) {
        const rest = text.slice(7).trim();
        const [name, ...urlParts] = rest.split('|');
        const apiUrl = urlParts.join('|').trim();
        if (!name || !apiUrl) { await sendMessage(chatId, '❌ Usage: <code>/addapi Name|URL</code>'); return new Response('OK', { headers: corsHeaders }); }
        await supabase.from('hit_apis').insert({ name: name.trim(), url: apiUrl, method: 'GET', enabled: true });
        await sendMessage(chatId, `✅ API added: <b>${name.trim()}</b>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /delapi ---
      if (text.startsWith('/delapi') && admin) {
        const id = text.split(' ')[1]?.trim();
        if (!id) { await sendMessage(chatId, '❌ Usage: <code>/delapi API_ID</code>'); return new Response('OK', { headers: corsHeaders }); }
        await supabase.from('hit_apis').delete().eq('id', id);
        await sendMessage(chatId, `✅ API deleted: <code>${id}</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /toggleapi ---
      if (text.startsWith('/toggleapi') && admin) {
        const id = text.split(' ')[1]?.trim();
        if (!id) { await sendMessage(chatId, '❌ Usage: <code>/toggleapi API_ID</code>'); return new Response('OK', { headers: corsHeaders }); }
        const { data: api } = await supabase.from('hit_apis').select('enabled').eq('id', id).single();
        if (!api) { await sendMessage(chatId, '❌ API not found.'); return new Response('OK', { headers: corsHeaders }); }
        await supabase.from('hit_apis').update({ enabled: !api.enabled }).eq('id', id);
        await sendMessage(chatId, `✅ API ${!api.enabled ? 'enabled' : 'disabled'}`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /keys ---
      if (text === '/keys' && admin) {
        const keys = await getAccessKeys();
        if (keys.length === 0) { await sendMessage(chatId, '🔑 No access keys set.'); return new Response('OK', { headers: corsHeaders }); }
        await sendMessage(chatId, `🔑 <b>Access Keys (${keys.length})</b>\n\n` + keys.map((k, i) => `${i + 1}. <code>${k}</code>`).join('\n'));
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /addkey ---
      if (text.startsWith('/addkey') && admin) {
        const key = text.split(' ').slice(1).join(' ').trim();
        if (!key) { await sendMessage(chatId, '❌ Usage: <code>/addkey PASSWORD</code>'); return new Response('OK', { headers: corsHeaders }); }
        const keys = await getAccessKeys();
        if (!keys.includes(key)) keys.push(key);
        await setSetting('tgbot_access_keys', keys);
        await sendMessage(chatId, `✅ Key added: <code>${key}</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /delkey ---
      if (text.startsWith('/delkey') && admin) {
        const key = text.split(' ').slice(1).join(' ').trim();
        if (!key) { await sendMessage(chatId, '❌ Usage: <code>/delkey PASSWORD</code>'); return new Response('OK', { headers: corsHeaders }); }
        const keys = await getAccessKeys();
        const filtered = keys.filter(k => k !== key);
        await setSetting('tgbot_access_keys', filtered);
        await sendMessage(chatId, `✅ Key removed: <code>${key}</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /givepremium ---
      if (text.startsWith('/givepremium') && admin) {
        const parts = text.split(/\s+/).slice(1);
        if (parts.length < 3) { await sendMessage(chatId, '❌ Usage: <code>/givepremium USER_ID PLAN DAYS</code>\nPlans: Basic, Pro, Ultimate'); return new Response('OK', { headers: corsHeaders }); }
        const userId = parseInt(parts[0]);
        const plan = parts[1];
        const days = parseInt(parts[2]) || 30;
        if (isNaN(userId)) { await sendMessage(chatId, '❌ Invalid user ID'); return new Response('OK', { headers: corsHeaders }); }
        const users = await getPremiumUsers();
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        users[String(userId)] = { plan, expiresAt, userId };
        await setSetting('tgbot_premium_users', users);
        await sendMessage(chatId, `✅ Premium <b>${plan}</b> given to <code>${userId}</code> for ${days} days`);
        // Notify user
        try { await sendMessage(userId, `🎉 You've been given <b>${plan}</b> premium for ${days} days!`); } catch {}
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /removepremium ---
      if (text.startsWith('/removepremium') && admin) {
        const userId = text.split(' ')[1]?.trim();
        if (!userId) { await sendMessage(chatId, '❌ Usage: <code>/removepremium USER_ID</code>'); return new Response('OK', { headers: corsHeaders }); }
        const users = await getPremiumUsers();
        delete users[userId];
        await setSetting('tgbot_premium_users', users);
        await sendMessage(chatId, `✅ Premium removed for <code>${userId}</code>`);
        try { await sendMessage(parseInt(userId), '⚠️ Your premium has been removed.'); } catch {}
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /premium ---
      if (text === '/premium' && admin) {
        const users = await getPremiumUsers();
        const entries = Object.entries(users);
        if (entries.length === 0) { await sendMessage(chatId, '💎 No premium users.'); return new Response('OK', { headers: corsHeaders }); }
        let t = `💎 <b>Premium Users (${entries.length})</b>\n\n`;
        entries.forEach(([id, info]: [string, any]) => {
          const exp = new Date(info.expiresAt);
          const remaining = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
          t += `• <code>${id}</code> - ${info.plan} (${remaining}d left)\n`;
        });
        await sendMessage(chatId, t);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /broadcast ---
      if (text.startsWith('/broadcast') && admin) {
        const message = text.slice(10).trim();
        if (!message) { await sendMessage(chatId, '❌ Usage: <code>/broadcast Your message</code>'); return new Response('OK', { headers: corsHeaders }); }
        const allUsers = (await getSetting('tgbot_all_users')) || [];
        let sent = 0, failed = 0;
        for (const uid of allUsers) {
          try {
            await sendMessage(uid, `📢 <b>Broadcast</b>\n\n${message}`);
            sent++;
          } catch { failed++; }
        }
        await sendMessage(chatId, `✅ Broadcast sent!\n✅ Delivered: ${sent}\n❌ Failed: ${failed}`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /workers ---
      if (text === '/workers') {
        const workers = await getCfWorkers();
        let t = `☁️ <b>CF Workers (${workers.length})</b>\n\n`;
        if (workers.length === 0) t += `No custom workers. Default worker active.\n\n`;
        else workers.forEach((w, i) => { t += `${i + 1}. <code>${w}</code>\n`; });
        t += `\n📝 <b>Commands:</b>\n/addworker URL - Add worker\n/delworker URL - Remove\n/clearworkers - Reset\n\n`;
        t += `💡 Multiple workers = load balancing!\n${workers.length || 1} workers = ${(workers.length || 1) * 100}k req/day`;
        await sendMessage(chatId, t);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /addworker ---
      if (text.startsWith('/addworker') && admin) {
        const workerUrl = text.split(' ').slice(1).join(' ').trim();
        if (!workerUrl || !workerUrl.startsWith('http')) { await sendMessage(chatId, '❌ Usage: <code>/addworker https://worker.example.workers.dev</code>'); return new Response('OK', { headers: corsHeaders }); }
        const workers = await getCfWorkers();
        if (!workers.includes(workerUrl)) workers.push(workerUrl);
        await setSetting('tgbot_cf_workers', workers);
        await sendMessage(chatId, `✅ Worker added!\n☁️ Total: ${workers.length} workers = ${workers.length * 100}k req/day`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /delworker ---
      if (text.startsWith('/delworker') && admin) {
        const workerUrl = text.split(' ').slice(1).join(' ').trim();
        if (!workerUrl) { await sendMessage(chatId, '❌ Usage: <code>/delworker URL</code>'); return new Response('OK', { headers: corsHeaders }); }
        const workers = await getCfWorkers();
        const filtered = workers.filter(w => w !== workerUrl);
        await setSetting('tgbot_cf_workers', filtered);
        await sendMessage(chatId, `✅ Worker removed! Remaining: ${filtered.length}`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /clearworkers ---
      if (text === '/clearworkers' && admin) {
        await setSetting('tgbot_cf_workers', []);
        await sendMessage(chatId, '✅ All workers cleared!');
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /setmode ---
      if (text.startsWith('/setmode') && admin) {
        const mode = text.split(' ')[1]?.trim()?.toLowerCase();
        if (mode !== 'edge' && mode !== 'cloudflare' && mode !== 'cf') {
          const currentMode = await getHitProxyMode();
          const modeLabel = currentMode === 'cloudflare' ? '☁️ CF Worker' : '⚡ Edge Function';
          await sendMessage(chatId, `🌐 <b>Current Mode:</b> ${modeLabel}\n\n<b>Change:</b>\n<code>/setmode edge</code> - Edge Function\n<code>/setmode cf</code> - CF Worker`);
          return new Response('OK', { headers: corsHeaders });
        }
        const newMode = (mode === 'cf' || mode === 'cloudflare') ? 'cloudflare' : 'edge';
        await setHitProxyMode(newMode);
        const modeLabel = newMode === 'cloudflare' ? '☁️ CF Worker' : '⚡ Edge Function';
        await sendMessage(chatId, `✅ Mode changed to <b>${modeLabel}</b>\n\n<i>Website aur bot dono sync ho gaye!</i>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /setadmin (first-time setup) ---
      if (text === '/setadmin') {
        const admins = await getAdminIds();
        if (admins.length === 0) {
          await setSetting('tgbot_admin_ids', [chatId]);
          await sendMessage(chatId, `✅ You are now admin! ID: <code>${chatId}</code>`);
        } else if (admin) {
          await sendMessage(chatId, `✅ You're already admin!`);
        } else {
          await sendMessage(chatId, '❌ Admin already set. Contact existing admin.');
        }
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /addadmin ---
      if (text.startsWith('/addadmin') && admin) {
        const newId = parseInt(text.split(' ')[1]);
        if (isNaN(newId)) { await sendMessage(chatId, '❌ Usage: <code>/addadmin USER_ID</code>'); return new Response('OK', { headers: corsHeaders }); }
        const admins = await getAdminIds();
        if (!admins.includes(newId)) admins.push(newId);
        await setSetting('tgbot_admin_ids', admins);
        await sendMessage(chatId, `✅ Admin added: <code>${newId}</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /logout ---
      if (text === '/logout' && admin) {
        const admins = await getAdminIds();
        const filtered = admins.filter((id: number) => id !== chatId);
        await setSetting('tgbot_admin_ids', filtered);
        await sendMessage(chatId, '✅ Logged out from admin!');
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /stop command ---
      if (/^\/stop(@[\w_]+)?$/i.test(text)) {
        await setBotState(chatId, { running: false, waiting_phone: false });
        await sendMessage(chatId, '🛑 <b>Stop request received.</b>\n\nStatus message ab turant STOPPED pe update ho jayega.');
        return new Response('OK', { headers: corsHeaders });
      }

      // ===== Phone Number Handling =====
      const state = await getBotState(chatId);

      if (state?.waiting_phone || /^\+?\d{10,15}(\s+\d+)*$/.test(text)) {
        const parts = text.split(/\s+/);
        const phone = parts[0].replace(/[^0-9+]/g, '');
        const phoneRegex = /^\+?[0-9]{10,15}$/;

        if (!phoneRegex.test(phone)) {
          await sendMessage(chatId, '❌ <b>Invalid number!</b>\n\n<code>9876543210</code> ya <code>+919876543210</code>');
          return new Response('OK', { headers: corsHeaders });
        }

        // Check daily limit
        const prem = await isPremium(chatId);
        if (!prem.isPremium && !admin) {
          const config = await getBotConfig();
          const usage = await getUserUsage(chatId);
          if (usage.today >= config.dailyLimit) {
            await sendMessage(chatId, `❌ <b>Daily limit reached!</b> (${config.dailyLimit}/day)\n\n💎 Premium le lo unlimited access ke liye.`);
            return new Response('OK', { headers: corsHeaders });
          }
        }

        const config = await getBotConfig();
        const batch = parseInt(parts[1]) || config.defaultBatch;
        const delay = parseInt(parts[2]) || config.defaultDelay;

        await runHitsForPhone(chatId, phone, 1, Math.min(batch, 20), Math.min(delay, 60));
        return new Response('OK', { headers: corsHeaders });
      }

      // Default
      await sendMessage(chatId, '👋 /start bhejo ya /help dekho!');
    }

    return new Response('OK', { headers: corsHeaders });
  } catch (error) {
    console.error('Bot error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
