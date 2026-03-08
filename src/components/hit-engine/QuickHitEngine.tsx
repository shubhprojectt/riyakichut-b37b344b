import { useState, useRef, useCallback } from 'react';
import { Zap, Phone, Square, AlertCircle, Loader2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { HitApi } from '@/hooks/useHitApis';
import { HitLog } from '@/hooks/useHitLogs';
import ScheduledHit from '@/components/ScheduledHit';
import { toast } from 'sonner';

// Track consecutive fails per API to auto-disable
const failCountMap = new Map<string, number>();
const FAIL_THRESHOLD = 3;

async function markApiFailed(apiId: string, apiName: string) {
  const count = (failCountMap.get(apiId) || 0) + 1;
  failCountMap.set(apiId, count);
  if (count >= FAIL_THRESHOLD) {
    try {
      await supabase.from('hit_apis').update({ enabled: false }).eq('id', apiId);
      toast.error(`❌ "${apiName}" auto-disabled (${FAIL_THRESHOLD} fails)`);
      failCountMap.delete(apiId);
    } catch {}
  }
}

function markApiSuccess(apiId: string) {
  failCountMap.delete(apiId);
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

interface QuickHitEngineProps {
  apis: HitApi[];
  onLog: (log: Omit<HitLog, 'id' | 'created_at'>) => void;
  onPhoneUsed?: (phone: string) => void;
  title?: string;
  phoneLabel?: string;
  phonePlaceholder?: string;
  hitButtonText?: string;
  stopButtonText?: string;
  noApisWarning?: string;
  uaRotation?: boolean;
  cloudflareProxyUrl?: string;
  hitProxyMode?: 'edge' | 'cloudflare';
  onProxyModeChange?: (mode: 'edge' | 'cloudflare') => void;
  enterNumberLabel?: string;
  apisActiveText?: string;
  sequentialLabel?: string;
  parallelLabel?: string;
  scheduleLabel?: string;
  hittingApisText?: string;
  copyrightText?: string;
  roundLabel?: string;
  hitsLabel?: string;
  okLabel?: string;
  failLabel?: string;
}

async function hitSingleApi(api: HitApi, phone: string, uaRotation: boolean, cloudflareProxyUrl?: string): Promise<{
  api_name: string; success: boolean; status_code: number | null;
  response_time: number | null; error_message: string | null; user_agent: string | null;
}> {
  const finalUrl = replacePlaceholders(api.url, phone);
  const finalHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(api.headers)) {
    finalHeaders[replacePlaceholders(k, phone)] = replacePlaceholders(v, phone);
  }
  const finalBody = api.body && Object.keys(api.body).length > 0 ? replaceInObj(api.body, phone) : undefined;

  let urlWithParams = finalUrl;
  if (api.query_params && Object.keys(api.query_params).length > 0) {
    try {
      const url = new URL(finalUrl);
      for (const [k, v] of Object.entries(api.query_params)) {
        url.searchParams.set(replacePlaceholders(k, phone), replacePlaceholders(v, phone));
      }
      urlWithParams = url.toString();
    } catch {}
  }

  try {
    // If Cloudflare proxy URL is set, use it instead of Supabase edge function
    if (cloudflareProxyUrl && cloudflareProxyUrl.trim()) {
      const proxyBody: any = {
        url: urlWithParams,
        method: api.method,
        headers: finalHeaders,
      };
      if (finalBody && api.bodyType !== 'none') {
        proxyBody.body = finalBody;
        proxyBody.bodyType = api.bodyType;
      }

      const res = await fetch(cloudflareProxyUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyBody),
      });
      const data = await res.json();
      return {
        api_name: api.name, success: data?.success ?? false,
        status_code: data?.status_code ?? null, response_time: data?.response_time ?? 0,
        error_message: data?.error ?? null, user_agent: null,
      };
    }

    // Default: use Supabase edge function
    const { data, error } = await supabase.functions.invoke('hit-api', {
      body: { url: urlWithParams, method: api.method, headers: finalHeaders, body: finalBody, bodyType: api.bodyType, uaRotation },
    });
    if (error) throw error;
    return {
      api_name: api.name, success: data?.success ?? false,
      status_code: data?.status_code ?? null, response_time: data?.response_time ?? 0,
      error_message: data?.error_message ?? null, user_agent: data?.user_agent_used ?? null,
    };
  } catch (err) {
    return {
      api_name: api.name, success: false, status_code: null, response_time: 0,
      error_message: err instanceof Error ? err.message : 'Unknown error', user_agent: null,
    };
  }
}

export default function QuickHitEngine({
  apis, onLog, onPhoneUsed, title = 'HIT ENGINE',
  phonePlaceholder = '91XXXXXXXXXX', hitButtonText = 'START',
  stopButtonText = 'STOP', noApisWarning = 'Admin me APIs add karo.',
  uaRotation = true,
  cloudflareProxyUrl = '',
  hitProxyMode = 'edge',
  onProxyModeChange,
  enterNumberLabel = 'Enter Number:',
  apisActiveText = 'APIs Active',
  sequentialLabel = 'Sequential',
  parallelLabel = 'Parallel',
  scheduleLabel = 'Schedule',
  hittingApisText = 'Hitting APIs...',
  copyrightText = '© 2026 {TITLE} | All Rights Reserved',
  roundLabel = 'Round',
  hitsLabel = 'Hits',
  okLabel = 'OK',
  failLabel = 'Fail',
}: QuickHitEngineProps) {
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [isRunning1, setIsRunning1] = useState(false);
  const [isRunning2, setIsRunning2] = useState(false);
  const [stats1, setStats1] = useState({ rounds: 0, hits: 0, success: 0, fails: 0 });
  const [stats2, setStats2] = useState({ rounds: 0, hits: 0, success: 0, fails: 0 });
  const [activeMode, setActiveMode] = useState<'sequential' | 'parallel' | 'schedule'>('sequential');
  const stopRef1 = useRef(false);
  const stopRef2 = useRef(false);

  const activeProxyUrl = hitProxyMode === 'cloudflare' ? cloudflareProxyUrl : '';

  const enabledApis = apis.filter(a => a.enabled);

  const runSequential = useCallback(async () => {
    if (phone1.length < 10 || enabledApis.length === 0) return;
    setIsRunning1(true); stopRef1.current = false;
    setStats1({ rounds: 0, hits: 0, success: 0, fails: 0 });
    onPhoneUsed?.(phone1);
    let round = 0;
    while (!stopRef1.current) {
      round++; setStats1(prev => ({ ...prev, rounds: round }));
      for (const api of enabledApis) {
        if (stopRef1.current) break;
        const r = await hitSingleApi(api, phone1, uaRotation, activeProxyUrl);
        if (stopRef1.current) break;
        // Auto-disable tracking
        if (r.success) { markApiSuccess(api.id); } else { markApiFailed(api.id, api.name); }
        onLog({ api_name: r.api_name, mode: 'SERVER', status_code: r.status_code, success: r.success, response_time: r.response_time, error_message: r.error_message, user_agent: r.user_agent });
        setStats1(prev => ({ ...prev, hits: prev.hits + 1, success: prev.success + (r.success ? 1 : 0), fails: prev.fails + (r.success ? 0 : 1) }));
      }
    }
    setIsRunning1(false);
  }, [enabledApis, onLog, uaRotation, activeProxyUrl, phone1]);

  const runParallel = useCallback(async () => {
    if (phone2.length < 10 || enabledApis.length === 0) return;
    setIsRunning2(true); stopRef2.current = false;
    setStats2({ rounds: 0, hits: 0, success: 0, fails: 0 });
    onPhoneUsed?.(phone2);
    let round = 0;
    while (!stopRef2.current) {
      round++; setStats2(prev => ({ ...prev, rounds: round }));
      await Promise.allSettled(
        enabledApis.map(async (api) => {
          if (stopRef2.current) return null;
          const r = await hitSingleApi(api, phone2, uaRotation, activeProxyUrl);
          if (stopRef2.current) return null;
          // Auto-disable tracking
          if (r.success) { markApiSuccess(api.id); } else { markApiFailed(api.id, api.name); }
          onLog({ api_name: r.api_name, mode: 'SERVER', status_code: r.status_code, success: r.success, response_time: r.response_time, error_message: r.error_message, user_agent: r.user_agent });
          setStats2(prev => ({ ...prev, hits: prev.hits + 1, success: prev.success + (r.success ? 1 : 0), fails: prev.fails + (r.success ? 0 : 1) }));
          return r;
        })
      );
      if (stopRef2.current) break;
    }
    setIsRunning2(false);
  }, [enabledApis, onLog, uaRotation, activeProxyUrl, phone2]);

  const currentPhone = activeMode === 'sequential' ? phone1 : phone2;
  const setCurrentPhone = activeMode === 'sequential' ? setPhone1 : setPhone2;
  const currentIsRunning = activeMode === 'sequential' ? isRunning1 : isRunning2;
  const currentStats = activeMode === 'sequential' ? stats1 : stats2;
  const currentStart = activeMode === 'sequential' ? runSequential : runParallel;
  const currentStopRef = activeMode === 'sequential' ? stopRef1 : stopRef2;

  return (
    <div className={`glass-card rounded-3xl overflow-hidden relative transition-all duration-700 ${
      currentIsRunning ? 'ring-1 ring-primary/30 shadow-[0_0_30px_rgba(var(--primary-rgb,200,170,50),0.15)]' : ''
    }`}>
      {/* Scanning line animation when running */}
      {currentIsRunning && (
        <>
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-3xl">
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-[scanLine_2s_ease-in-out_infinite]" />
          </div>
          <div className="absolute inset-0 pointer-events-none z-10 rounded-3xl animate-[borderPulse_2s_ease-in-out_infinite]" 
            style={{ boxShadow: '0 0 20px rgba(var(--primary-rgb,200,170,50),0.1), inset 0 0 20px rgba(var(--primary-rgb,200,170,50),0.03)' }} />
        </>
      )}

      <div className="p-5 space-y-5 relative z-10">
        {/* Title */}
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 transition-all duration-500 ${currentIsRunning ? 'scale-110' : ''}`}>
            <Zap className={`w-5 h-5 text-primary transition-all duration-300 ${currentIsRunning ? 'animate-[zapping_0.5s_ease-in-out_infinite]' : ''}`} style={{filter: 'drop-shadow(0 0 8px hsl(var(--primary)))'}} />
            <h2 className="text-base font-bold tracking-widest uppercase font-mono text-primary text-glow-gold">
              {title}
            </h2>
          </div>
          {enabledApis.length > 0 && (
            <p className={`text-[10px] mt-1 font-mono transition-colors duration-500 ${currentIsRunning ? 'text-primary/70' : 'text-muted-foreground'}`}>
              {currentIsRunning ? hittingApisText : `${enabledApis.length} ${apisActiveText}`}
            </p>
          )}
        </div>

        {/* Mode Tabs - Premium Glassmorphic Pills */}
        <div className="flex gap-2">
          {([
            { key: 'sequential' as const, label: sequentialLabel, icon: <Zap className="w-3.5 h-3.5" />, color: 'primary' },
            { key: 'parallel' as const, label: parallelLabel, icon: <Zap className="w-3.5 h-3.5" />, color: 'accent' },
            { key: 'schedule' as const, label: scheduleLabel, icon: <Clock className="w-3.5 h-3.5" />, color: 'secondary' },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveMode(tab.key)}
              disabled={currentIsRunning}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                activeMode === tab.key
                  ? `glass-card-warm border-${tab.color}/30 text-${tab.color === 'primary' ? 'primary' : tab.color === 'accent' ? 'accent' : 'secondary'}`
                  : 'glass-card text-muted-foreground'
              }`}
              style={activeMode === tab.key ? {
                boxShadow: `0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)`,
              } : {}}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>


        {/* Schedule Mode */}
        {activeMode === 'schedule' ? (
          <ScheduledHit />
        ) : (
          <>
            {enabledApis.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-2xl glass-card border-neon-orange/15">
                <AlertCircle className="w-4 h-4 text-neon-orange/70" />
                <p className="text-[11px] text-neon-orange/60 font-mono">{noApisWarning}</p>
              </div>
            )}

            <div className={`transition-all duration-500 ${currentIsRunning ? 'opacity-50 pointer-events-none scale-[0.98]' : ''}`}>
              <label className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-2 block flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> {enterNumberLabel}
              </label>
              <Input
                value={currentPhone}
                onChange={e => setCurrentPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                placeholder={phonePlaceholder}
                disabled={currentIsRunning}
                className="h-14 rounded-2xl text-center text-lg font-mono tracking-[0.2em] border-primary/15 bg-background/30 text-foreground placeholder:text-muted-foreground/20 focus:border-primary/40 focus:ring-0"
              />
            </div>

            {/* Action Button */}
            {!currentIsRunning ? (
              <button onClick={currentStart}
                disabled={currentPhone.length < 10 || enabledApis.length === 0}
                className="w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-20 active:scale-[0.98] bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20 text-primary glow-gold hover:from-primary/30 hover:to-accent/30">
                <Zap className="w-5 h-5" style={{filter: 'drop-shadow(0 0 6px currentColor)'}} /> {hitButtonText}
              </button>
            ) : (
              <button onClick={() => { currentStopRef.current = true; }}
                className="w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98] bg-destructive/15 border border-destructive/20 text-destructive glow-red animate-[buttonPulse_1.5s_ease-in-out_infinite]">
                <Square className="w-5 h-5 animate-pulse" /> {stopButtonText}
              </button>
            )}

            {/* Stats when running - animated entry */}
            {currentIsRunning && (
              <div className="space-y-3 animate-[statsSlideIn_0.5s_ease-out]">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: roundLabel, value: currentStats.rounds, color: 'text-accent' },
                    { label: hitsLabel, value: currentStats.hits, color: 'text-neon-blue' },
                    { label: okLabel, value: currentStats.success, color: 'text-neon-green' },
                    { label: failLabel, value: currentStats.fails, color: 'text-destructive' },
                  ].map((s, i) => (
                    <div key={s.label} className="py-2 rounded-xl glass-card animate-[statPop_0.4s_ease-out_both]" style={{ animationDelay: `${i * 100}ms` }}>
                      <p className="text-[8px] text-muted-foreground font-mono uppercase">{s.label}</p>
                      <p className={`text-sm font-bold font-mono ${s.color} transition-all duration-200`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  <span className="text-[10px] text-muted-foreground font-mono">{hittingApisText}</span>
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-[9px] text-muted-foreground/30 font-mono tracking-wider uppercase">
          {copyrightText.replace(/\{TITLE\}/gi, title)}
        </p>
      </div>
    </div>
  );
}
