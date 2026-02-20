import { useState, useRef, useCallback } from 'react';
import { Zap, Plus, Trash2, Phone, Clock, Timer, Square, Loader2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DirectApi {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body: string;
  bodyType: 'json' | 'form-urlencoded' | 'text' | 'none';
  enabled: boolean;
}

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
  const [expandedApi, setExpandedApi] = useState<string | null>(null);
  const stopRef = useRef(false);
  const logCounter = useRef(0);

  const enabledApis = apis.filter(a => a.enabled);

  const addApi = () => {
    const newApi: DirectApi = {
      id: `api-${Date.now()}`,
      name: `API ${apis.length + 1}`,
      url: '',
      method: 'GET',
      headers: {},
      body: '',
      bodyType: 'none',
      enabled: true,
    };
    setApis(prev => [...prev, newApi]);
    setExpandedApi(newApi.id);
  };

  const updateApi = (id: string, updates: Partial<DirectApi>) => {
    setApis(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteApi = (id: string) => {
    setApis(prev => prev.filter(a => a.id !== id));
    if (expandedApi === id) setExpandedApi(null);
  };

  const toggleApi = (id: string) => {
    setApis(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const hitApi = useCallback(async (api: DirectApi, phoneNumber: string): Promise<HitResult> => {
    const finalUrl = replacePlaceholders(api.url, phoneNumber);
    const finalHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(api.headers)) {
      finalHeaders[replacePlaceholders(k, phoneNumber)] = replacePlaceholders(v, phoneNumber);
    }

    let fetchBody: string | undefined = undefined;
    if (api.bodyType !== 'none' && api.body) {
      fetchBody = replacePlaceholders(api.body, phoneNumber);
      if (api.bodyType === 'json' && !finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/json';
      } else if (api.bodyType === 'form-urlencoded' && !finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (api.bodyType === 'text' && !finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'text/plain';
      }
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
      return {
        id: `log-${Date.now()}-${logCounter.current}`,
        api_name: api.name, success: res.ok,
        status_code: res.status, response_time: time,
        error_message: null, timestamp: new Date().toISOString(),
      };
    } catch (err) {
      logCounter.current++;
      return {
        id: `log-${Date.now()}-${logCounter.current}`,
        api_name: api.name, success: false,
        status_code: null, response_time: Date.now() - start,
        error_message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
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
        setStats(prev => ({
          ...prev, hits: prev.hits + 1,
          success: prev.success + (result.success ? 1 : 0),
          fails: prev.fails + (result.success ? 0 : 1),
        }));
        setLogs(prev => [result, ...prev].slice(0, 100));

        if (delay > 0 && !stopRef.current) {
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    setIsRunning(false);
    setCurrentApi('');
    toast.success('Completed!');
  }, [phone, delay, maxRounds, enabledApis, hitApi]);

  const stop = useCallback(() => { stopRef.current = true; }, []);

  const [headerKey, setHeaderKey] = useState('');
  const [headerVal, setHeaderVal] = useState('');

  const addHeader = (apiId: string) => {
    if (!headerKey.trim()) return;
    const api = apis.find(a => a.id === apiId);
    if (!api) return;
    updateApi(apiId, { headers: { ...api.headers, [headerKey]: headerVal } });
    setHeaderKey('');
    setHeaderVal('');
  };

  const removeHeader = (apiId: string, key: string) => {
    const api = apis.find(a => a.id === apiId);
    if (!api) return;
    const h = { ...api.headers };
    delete h[key];
    updateApi(apiId, { headers: h });
  };

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
        <div>
          <h1 className="text-base font-bold tracking-tight">Direct Hit</h1>
          <p className="text-[10px] text-white/30">Browser-to-API • No backend</p>
        </div>
      </div>

      {/* Warning */}
      <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-[11px] text-yellow-400/70">
        ⚠️ Direct browser hits — CORS errors expected on most APIs. Use for CORS-enabled APIs only.
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

        {/* Start/Stop */}
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

      {/* API List */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white/60">APIs ({apis.length})</h3>
          <Button size="sm" variant="ghost" onClick={addApi} className="h-7 px-2 text-[11px] text-orange-400 hover:text-orange-300 hover:bg-orange-500/10">
            <Plus className="w-3 h-3 mr-1" /> Add API
          </Button>
        </div>

        {apis.length === 0 && (
          <p className="text-[11px] text-white/20 text-center py-6">No APIs added yet. Click "Add API" to start.</p>
        )}

        {apis.map(api => (
          <div key={api.id} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            {/* API Header */}
            <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => setExpandedApi(expandedApi === api.id ? null : api.id)}>
              <button onClick={e => { e.stopPropagation(); toggleApi(api.id); }} className="shrink-0">
                {api.enabled ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-white/20" />}
              </button>
              <span className={`text-xs font-medium truncate flex-1 ${api.enabled ? 'text-white/80' : 'text-white/30'}`}>{api.name || 'Unnamed'}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-mono">{api.method}</span>
              <button onClick={e => { e.stopPropagation(); deleteApi(api.id); }} className="text-red-400/40 hover:text-red-400 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {expandedApi === api.id ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
            </div>

            {/* API Details */}
            {expandedApi === api.id && (
              <div className="p-3 pt-0 space-y-2.5 border-t border-white/[0.04]">
                <Input value={api.name} onChange={e => updateApi(api.id, { name: e.target.value })} placeholder="API Name"
                  className="h-9 bg-white/[0.04] border-white/[0.06] text-white/80 text-xs" />
                <Input value={api.url} onChange={e => updateApi(api.id, { url: e.target.value })} placeholder="https://api.example.com/{PHONE}"
                  className="h-9 bg-white/[0.04] border-white/[0.06] text-white/80 text-xs font-mono" />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={api.method} onValueChange={v => updateApi(api.id, { method: v as DirectApi['method'] })}>
                    <SelectTrigger className="h-9 bg-white/[0.04] border-white/[0.06] text-white/80 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={api.bodyType} onValueChange={v => updateApi(api.id, { bodyType: v as DirectApi['bodyType'] })}>
                    <SelectTrigger className="h-9 bg-white/[0.04] border-white/[0.06] text-white/80 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['none', 'json', 'form-urlencoded', 'text'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {api.bodyType !== 'none' && (
                  <textarea value={api.body} onChange={e => updateApi(api.id, { body: e.target.value })}
                    placeholder='{"phone": "{PHONE}"}' rows={3}
                    className="w-full rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/80 text-xs font-mono p-2 resize-none focus:outline-none focus:border-orange-500/30" />
                )}
                {/* Headers */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-white/30">Headers</p>
                  {Object.entries(api.headers).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-white/40 font-mono truncate">{k}:</span>
                      <span className="text-white/60 font-mono truncate flex-1">{v}</span>
                      <button onClick={() => removeHeader(api.id, k)} className="text-red-400/40 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <div className="flex gap-1.5">
                    <Input value={headerKey} onChange={e => setHeaderKey(e.target.value)} placeholder="Key"
                      className="h-7 bg-white/[0.03] border-white/[0.05] text-white/70 text-[10px] flex-1" />
                    <Input value={headerVal} onChange={e => setHeaderVal(e.target.value)} placeholder="Value"
                      className="h-7 bg-white/[0.03] border-white/[0.05] text-white/70 text-[10px] flex-1" />
                    <Button size="sm" variant="ghost" onClick={() => addHeader(api.id)} className="h-7 px-2 text-[10px] text-orange-400">+</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white/60">Logs ({logs.length})</h3>
            <Button size="sm" variant="ghost" onClick={() => setLogs([])} className="h-6 px-2 text-[10px] text-white/30">Clear</Button>
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
    </div>
  );
}
