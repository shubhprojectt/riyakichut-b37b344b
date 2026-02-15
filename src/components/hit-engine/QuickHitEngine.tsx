import { useState, useRef, useCallback } from 'react';
import { Zap, Phone, Square, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { HitApi } from '@/hooks/useHitApis';
import { HitLog } from '@/hooks/useHitLogs';

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

  const renderStats = (stats: { rounds: number; hits: number; success: number; fails: number }, isRunning: boolean) => {
    if (!isRunning) return null;
    return (
      <div className="grid grid-cols-4 gap-1.5 text-center">
        {[
          { label: 'Round', value: stats.rounds, color: 'text-neon-cyan', neon: '--neon-cyan' },
          { label: 'Hits', value: stats.hits, color: 'text-neon-blue', neon: '--neon-blue' },
          { label: 'OK', value: stats.success, color: 'text-neon-green', neon: '--neon-green' },
          { label: 'Fail', value: stats.fails, color: 'text-neon-red', neon: '--neon-red' },
        ].map(s => (
          <div key={s.label} className="p-1.5 rounded-lg bg-black/60 border border-white/[0.06]">
            <p className="text-[8px] text-white/25 font-mono">{s.label}</p>
            <p className={`text-xs font-bold ${s.color} font-mono`} style={{textShadow: `0 0 8px hsl(var(${s.neon}))`}}>{s.value}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderInput = (
    label: string, dotColor: string, phone: string, setPhone: (v: string) => void,
    isRunning: boolean, onStart: () => void, onStop: () => void,
    stats: { rounds: number; hits: number; success: number; fails: number },
    stopRef: React.MutableRefObject<boolean>
  ) => (
    <div className="space-y-2 p-3 rounded-xl bg-black/40 border border-white/[0.06]">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} style={{boxShadow: '0 0 6px currentColor'}} />
        <span className="text-[9px] font-bold text-neon-cyan/40 tracking-wider font-mono" style={{textShadow: '0 0 6px hsl(var(--neon-cyan) / 0.3)'}}>{label}</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-neon-green/40 flex-shrink-0" style={{filter: 'drop-shadow(0 0 3px hsl(var(--neon-green)))'}} />
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
            placeholder={phonePlaceholder}
            className="h-9 bg-black/80 border-neon-green/15 text-neon-green text-xs placeholder:text-neon-green/15 focus:border-neon-green/40 font-mono"
            style={{textShadow: '0 0 4px hsl(var(--neon-green) / 0.3)'}}
            disabled={isRunning}
          />
        </div>
        {!isRunning ? (
          <button
            onClick={onStart}
            disabled={phone.length < 10 || enabledApis.length === 0}
            className="h-9 px-4 rounded-lg text-[10px] font-bold bg-black border-2 border-neon-green/50 text-neon-green hover:bg-neon-green/10 disabled:opacity-30 transition-all flex items-center gap-1.5 font-mono"
            style={{boxShadow: '0 0 10px hsl(var(--neon-green) / 0.3)', textShadow: '0 0 8px hsl(var(--neon-green))'}}
          >
            <Zap className="w-3 h-3" /> {hitButtonText}
          </button>
        ) : (
          <button
            onClick={() => { stopRef.current = true; }}
            className="h-9 px-4 rounded-lg text-[10px] font-bold bg-black border-2 border-neon-red/50 text-neon-red hover:bg-neon-red/10 transition-all flex items-center gap-1.5 font-mono"
            style={{boxShadow: '0 0 10px hsl(var(--neon-red) / 0.3)', textShadow: '0 0 8px hsl(var(--neon-red))'}}
          >
            <Square className="w-3 h-3" /> {stopButtonText}
          </button>
        )}
      </div>
      {renderStats(stats, isRunning)}
    </div>
  );

  return (
    <div className="rounded-2xl bg-black/60 backdrop-blur-sm border border-neon-purple/20 p-4 space-y-4" style={{boxShadow: '0 0 20px hsl(var(--neon-purple) / 0.08)'}}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black border border-neon-purple/30 flex items-center justify-center" style={{boxShadow: '0 0 10px hsl(var(--neon-purple) / 0.3)'}}>
            <Zap className="w-3.5 h-3.5 text-neon-purple animate-neon-flicker" style={{filter: 'drop-shadow(0 0 6px hsl(var(--neon-purple)))'}} />
          </div>
          <h2 className="text-sm font-bold text-neon-purple tracking-tight font-mono" style={{textShadow: '0 0 10px hsl(var(--neon-purple))'}}>{title}</h2>
        </div>
        {enabledApis.length > 0 && (
          <span className="h-5 px-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-[9px] font-bold flex items-center font-mono" style={{textShadow: '0 0 6px hsl(var(--neon-cyan))'}}>
            {enabledApis.length} APIs
          </span>
        )}
      </div>

      {enabledApis.length === 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neon-orange/[0.06] border border-neon-orange/20">
          <AlertCircle className="w-3.5 h-3.5 text-neon-orange/70" />
          <p className="text-[10px] text-neon-orange/50 font-mono">{noApisWarning}</p>
        </div>
      )}

      {renderInput('INPUT 1 — SEQUENTIAL', 'bg-neon-green', phone1, setPhone1, isRunning1, runSequential, () => { stopRef1.current = true; }, stats1, stopRef1)}
      {renderInput('INPUT 2 — PARALLEL', 'bg-neon-cyan', phone2, setPhone2, isRunning2, runParallel, () => { stopRef2.current = true; }, stats2, stopRef2)}
    </div>
  );
}
