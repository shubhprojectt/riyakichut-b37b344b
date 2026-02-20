import { useState, useRef, useCallback, useEffect } from 'react';
import { Zap, Phone, Clock, Timer, Square, Loader2, ArrowLeft, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { loadDirectApis } from '@/pages/DirectHitAdmin';
import type { DirectApi } from '@/pages/DirectHitAdmin';

interface HitResult {
  id: string;
  api_name: string;
  success: boolean;
  status_code: number | null;
  response_time: number;
  error_message: string | null;
  timestamp: string;
}

function replacePlaceholders(text: string, phone: string): string {
  return text.replace(/\{PHONE\}/gi, phone);
}

export default function DirectHit() {
  const navigate = useNavigate();
  const [apis, setApis] = useState<DirectApi[]>([]);
  const [phone, setPhone] = useState('');
  const [delay, setDelay] = useState(500);
  const [maxRounds, setMaxRounds] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [currentApi, setCurrentApi] = useState('');
  const [stats, setStats] = useState({ rounds: 0, hits: 0, success: 0, fails: 0 });
  const [logs, setLogs] = useState<HitResult[]>([]);
  const stopRef = useRef(false);
  const logCounter = useRef(0);

  useEffect(() => { setApis(loadDirectApis()); }, []);

  const enabledApis = apis.filter(a => a.enabled);

  const hitApi = useCallback(async (api: DirectApi, phoneNumber: string): Promise<HitResult> => {
    const finalUrl = replacePlaceholders(api.url, phoneNumber);
    const finalHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(api.headers)) {
      finalHeaders[replacePlaceholders(k, phoneNumber)] = replacePlaceholders(v, phoneNumber);
    }

    let fetchBody: string | undefined = undefined;
    if (api.bodyType !== 'none' && api.body) {
      fetchBody = replacePlaceholders(api.body, phoneNumber);
      if (api.bodyType === 'json' && !finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';
      else if (api.bodyType === 'form-urlencoded' && !finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      else if (api.bodyType === 'text' && !finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'text/plain';
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(finalUrl, {
        method: api.method,
        headers: finalHeaders,
        body: ['GET', 'DELETE'].includes(api.method) ? undefined : fetchBody,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const time = Date.now() - start;
      await res.text();
      logCounter.current++;
      return { id: `log-${Date.now()}-${logCounter.current}`, api_name: api.name, success: res.ok, status_code: res.status, response_time: time, error_message: null, timestamp: new Date().toISOString() };
    } catch (err) {
      logCounter.current++;
      return { id: `log-${Date.now()}-${logCounter.current}`, api_name: api.name, success: false, status_code: null, response_time: Date.now() - start, error_message: err instanceof Error ? err.message : 'Unknown error', timestamp: new Date().toISOString() };
    }
  }, []);

  const start = useCallback(async () => {
    if (phone.length < 10 || enabledApis.length === 0) return;
    setIsRunning(true);
    stopRef.current = false;
    setStats({ rounds: 0, hits: 0, success: 0, fails: 0 });
    setLogs([]);

    for (let round = 1; round <= maxRounds; round++) {
      if (stopRef.current) break;
      setStats(prev => ({ ...prev, rounds: round }));
      for (const api of enabledApis) {
        if (stopRef.current) break;
        setCurrentApi(api.name);
        const result = await hitApi(api, phone);
        setStats(prev => ({ ...prev, hits: prev.hits + 1, success: prev.success + (result.success ? 1 : 0), fails: prev.fails + (result.success ? 0 : 1) }));
        setLogs(prev => [result, ...prev].slice(0, 100));
        if (delay > 0 && !stopRef.current) await new Promise(r => setTimeout(r, delay));
      }
    }
    setIsRunning(false);
    setCurrentApi('');
    toast.success('Completed!');
  }, [phone, delay, maxRounds, enabledApis, hitApi]);

  const stop = useCallback(() => { stopRef.current = true; }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-orange-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-bold tracking-tight">Direct Hit</h1>
          <p className="text-[10px] text-white/30">Browser-to-API • No backend</p>
        </div>
        <button onClick={() => navigate('/direct-hit/admin')} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
          <Settings className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* Warning */}
      <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-[11px] text-yellow-400/70">
        ⚠️ CORS errors expected on most APIs. Manage APIs from <button onClick={() => navigate('/direct-hit/admin')} className="underline text-orange-400">Admin Panel</button>.
      </div>

      {/* Phone + Controls */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-white/40 flex items-center gap-1.5">
            <Phone className="w-3 h-3" /> Phone Number
          </label>
          <Input value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} placeholder="9876543210"
            className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15" disabled={isRunning} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-white/40 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Delay (ms)</label>
            <Input type="number" value={delay} onChange={e => setDelay(Number(e.target.value))} min={0} max={5000}
              className="h-10 bg-white/[0.04] border-white/[0.08] text-white/80" disabled={isRunning} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-white/40 flex items-center gap-1.5"><Timer className="w-3 h-3" /> Rounds</label>
            <Input type="number" value={maxRounds} onChange={e => setMaxRounds(Number(e.target.value))} min={1} max={999}
              className="h-10 bg-white/[0.04] border-white/[0.08] text-white/80" disabled={isRunning} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center flex-1">
            <p className="text-[9px] text-white/25">APIs</p>
            <p className="text-sm font-semibold text-blue-400">{enabledApis.length}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-[9px] text-white/25">Mode</p>
            <p className="text-sm font-semibold text-orange-400">DIRECT</p>
          </div>
          {!isRunning ? (
            <button onClick={start} disabled={phone.length < 10 || enabledApis.length === 0}
              className="ml-auto h-10 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-medium disabled:opacity-30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2">
              <Zap className="w-4 h-4" /> START
            </button>
          ) : (
            <button onClick={stop}
              className="ml-auto h-10 px-6 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:scale-[0.98] transition-all flex items-center gap-2">
              <Square className="w-4 h-4" /> STOP
            </button>
          )}
        </div>

        {isRunning && (
          <>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Round', value: `${stats.rounds}/${maxRounds}`, color: 'text-white/80' },
                { label: 'Hits', value: stats.hits, color: 'text-blue-400' },
                { label: 'OK', value: stats.success, color: 'text-emerald-400' },
                { label: 'Fail', value: stats.fails, color: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[9px] text-white/25">{s.label}</p>
                  <p className={`text-sm font-semibold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {currentApi && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/[0.06] border border-orange-500/[0.1]">
                <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                <span className="text-[11px] text-white/50 truncate">{currentApi}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white/60">Logs ({logs.length})</h3>
            <button onClick={() => setLogs([])} className="text-[10px] text-white/30 hover:text-white/50">Clear</button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {logs.map(log => (
              <div key={log.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] ${log.success ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
                <span className={`font-semibold ${log.success ? 'text-emerald-400' : 'text-red-400'}`}>{log.status_code || 'ERR'}</span>
                <span className="text-white/50 truncate flex-1">{log.api_name}</span>
                <span className="text-white/25">{log.response_time}ms</span>
                {log.error_message && <span className="text-red-400/50 truncate max-w-[120px]">{log.error_message}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {apis.length === 0 && !isRunning && (
        <div className="text-center py-8 space-y-2">
          <p className="text-white/20 text-xs">No APIs configured</p>
          <button onClick={() => navigate('/direct-hit/admin')} className="text-orange-400 text-xs underline">Go to Admin Panel to add APIs</button>
        </div>
      )}
    </div>
  );
}
