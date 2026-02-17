import { useState, useRef, useCallback } from 'react';
import { Zap, Phone, Square, AlertCircle, Loader2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { HitApi } from '@/hooks/useHitApis';
import { HitLog } from '@/hooks/useHitLogs';
import ScheduledHit from '@/components/ScheduledHit';

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
}

async function hitSingleApi(api: HitApi, phone: string, uaRotation: boolean): Promise<{
  api_name: string;
  success: boolean;
  status_code: number | null;
  response_time: number | null;
  error_message: string | null;
  user_agent: string | null;
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
    const { data, error } = await supabase.functions.invoke('hit-api', {
      body: {
        url: urlWithParams,
        method: api.method,
        headers: finalHeaders,
        body: finalBody,
        bodyType: api.bodyType,
        uaRotation,
      },
    });
    if (error) throw error;
    return {
      api_name: api.name,
      success: data?.success ?? false,
      status_code: data?.status_code ?? null,
      response_time: data?.response_time ?? 0,
      error_message: data?.error_message ?? null,
      user_agent: data?.user_agent_used ?? null,
    };
  } catch (err) {
    return {
      api_name: api.name,
      success: false,
      status_code: null,
      response_time: 0,
      error_message: err instanceof Error ? err.message : 'Unknown error',
      user_agent: null,
    };
  }
}

export default function QuickHitEngine({
  apis,
  onLog,
  onPhoneUsed,
  title = 'HIT ENGINE',
  phonePlaceholder = '91XXXXXXXXXX',
  hitButtonText = 'START',
  stopButtonText = 'STOP',
  noApisWarning = 'Admin me APIs add karo.',
  uaRotation = true,
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

  const enabledApis = apis.filter(a => a.enabled);

  const runSequential = useCallback(async () => {
    if (phone1.length < 10 || enabledApis.length === 0) return;
    setIsRunning1(true);
    stopRef1.current = false;
    setStats1({ rounds: 0, hits: 0, success: 0, fails: 0 });
    onPhoneUsed?.(phone1);

    let round = 0;
    while (!stopRef1.current) {
      round++;
      setStats1(prev => ({ ...prev, rounds: round }));
      for (const api of enabledApis) {
        if (stopRef1.current) break;
        const r = await hitSingleApi(api, phone1, uaRotation);
        if (stopRef1.current) break;
        onLog({ api_name: r.api_name, mode: 'SERVER', status_code: r.status_code, success: r.success, response_time: r.response_time, error_message: r.error_message, user_agent: r.user_agent });
        setStats1(prev => ({ ...prev, hits: prev.hits + 1, success: prev.success + (r.success ? 1 : 0), fails: prev.fails + (r.success ? 0 : 1) }));
      }
    }
    setIsRunning1(false);
  }, [enabledApis, onLog, uaRotation, phone1]);

  const runParallel = useCallback(async () => {
    if (phone2.length < 10 || enabledApis.length === 0) return;
    setIsRunning2(true);
    stopRef2.current = false;
    setStats2({ rounds: 0, hits: 0, success: 0, fails: 0 });
    onPhoneUsed?.(phone2);

    let round = 0;
    while (!stopRef2.current) {
      round++;
      setStats2(prev => ({ ...prev, rounds: round }));
      await Promise.allSettled(
        enabledApis.map(async (api) => {
          if (stopRef2.current) return null;
          const r = await hitSingleApi(api, phone2, uaRotation);
          if (stopRef2.current) return null;
          onLog({ api_name: r.api_name, mode: 'SERVER', status_code: r.status_code, success: r.success, response_time: r.response_time, error_message: r.error_message, user_agent: r.user_agent });
          setStats2(prev => ({ ...prev, hits: prev.hits + 1, success: prev.success + (r.success ? 1 : 0), fails: prev.fails + (r.success ? 0 : 1) }));
          return r;
        })
      );
      if (stopRef2.current) break;
    }
    setIsRunning2(false);
  }, [enabledApis, onLog, uaRotation, phone2]);

  const currentPhone = activeMode === 'sequential' ? phone1 : phone2;
  const setCurrentPhone = activeMode === 'sequential' ? setPhone1 : setPhone2;
  const currentIsRunning = activeMode === 'sequential' ? isRunning1 : isRunning2;
  const currentStats = activeMode === 'sequential' ? stats1 : stats2;
  const currentStart = activeMode === 'sequential' ? runSequential : runParallel;
  const currentStopRef = activeMode === 'sequential' ? stopRef1 : stopRef2;

  return (
    <div className="relative rounded-3xl overflow-hidden" style={{
      background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.06) 100%)',
      backdropFilter: 'blur(40px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.05)',
    }}>
      {/* Inner content */}
      <div className="p-5 space-y-5">
        {/* Title */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2">
            <Zap className="w-5 h-5 text-neon-purple" style={{filter: 'drop-shadow(0 0 8px hsl(var(--neon-purple)))'}} />
            <h2 className="text-base font-bold tracking-widest uppercase font-mono animate-color-cycle">
              {title}
            </h2>
          </div>
          {enabledApis.length > 0 && (
            <p className="text-[10px] text-white/30 mt-1 font-mono">{enabledApis.length} APIs Active</p>
          )}
        </div>

        {/* Mode Tabs - Pill Style */}
        <div className="flex gap-2">
          {([
            { key: 'sequential' as const, label: 'Sequential', icon: <Zap className="w-3.5 h-3.5" />, neon: '--neon-green' },
            { key: 'parallel' as const, label: 'Parallel', icon: <Zap className="w-3.5 h-3.5" />, neon: '--neon-cyan' },
            { key: 'schedule' as const, label: 'Schedule', icon: <Clock className="w-3.5 h-3.5" />, neon: '--neon-orange' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveMode(tab.key)}
              className="flex-1 py-3 rounded-2xl text-[10px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-1.5"
              style={activeMode === tab.key ? {
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
                boxShadow: `0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 20px hsl(var(${tab.neon}) / 0.2)`,
                border: '1px solid rgba(255,255,255,0.15)',
                color: `hsl(var(${tab.neon}))`,
                textShadow: `0 0 10px hsl(var(${tab.neon}))`,
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Schedule Mode */}
        {activeMode === 'schedule' ? (
          <ScheduledHit />
        ) : (
          <>
            {/* No APIs warning */}
            {enabledApis.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-2xl" style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,165,0,0.15)',
              }}>
                <AlertCircle className="w-4 h-4 text-neon-orange/70" />
                <p className="text-[11px] text-neon-orange/60 font-mono">{noApisWarning}</p>
              </div>
            )}

            {/* Enter Number Label */}
            <div>
              <label className="text-xs font-bold text-white/50 tracking-wider uppercase mb-2 block flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Enter Number:
              </label>
              <Input
                value={currentPhone}
                onChange={e => setCurrentPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                placeholder={phonePlaceholder}
                disabled={currentIsRunning}
                className="h-14 rounded-2xl text-center text-lg font-mono tracking-[0.2em] border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/15 focus:border-neon-green/40 focus:ring-0"
                style={{
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)',
                }}
              />
            </div>

            {/* Action Button */}
            {!currentIsRunning ? (
              <button
                onClick={currentStart}
                disabled={currentPhone.length < 10 || enabledApis.length === 0}
                className="w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-20 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 30px hsl(var(--neon-green) / 0.15)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'hsl(var(--neon-green))',
                  textShadow: '0 0 15px hsl(var(--neon-green))',
                }}
              >
                <Zap className="w-5 h-5" style={{filter: 'drop-shadow(0 0 6px currentColor)'}} /> {hitButtonText}
              </button>
            ) : (
              <button
                onClick={() => { currentStopRef.current = true; }}
                className="w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,50,50,0.15) 0%, rgba(255,50,50,0.05) 100%)',
                  boxShadow: '0 4px 20px rgba(255,50,50,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,50,50,0.2)',
                  color: 'hsl(var(--neon-red))',
                  textShadow: '0 0 15px hsl(var(--neon-red))',
                }}
              >
                <Square className="w-5 h-5" /> {stopButtonText}
              </button>
            )}

            {/* Stats when running */}
            {currentIsRunning && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Round', value: currentStats.rounds, neon: '--neon-cyan' },
                    { label: 'Hits', value: currentStats.hits, neon: '--neon-blue' },
                    { label: 'OK', value: currentStats.success, neon: '--neon-green' },
                    { label: 'Fail', value: currentStats.fails, neon: '--neon-red' },
                  ].map(s => (
                    <div key={s.label} className="py-2 rounded-xl" style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <p className="text-[8px] text-white/30 font-mono uppercase">{s.label}</p>
                      <p className="text-sm font-bold font-mono" style={{
                        color: `hsl(var(${s.neon}))`,
                        textShadow: `0 0 10px hsl(var(${s.neon}))`,
                      }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="w-3.5 h-3.5 text-neon-purple animate-spin" />
                  <span className="text-[10px] text-white/40 font-mono">Hitting APIs...</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <p className="text-center text-[9px] text-white/15 font-mono tracking-wider uppercase">
          © 2026 {title} | All Rights Reserved
        </p>
      </div>
    </div>
  );
}
