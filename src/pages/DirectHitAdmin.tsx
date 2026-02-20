import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Code, Zap, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Download, Upload, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export interface DirectApi {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body: string;
  bodyType: 'json' | 'form-urlencoded' | 'text' | 'none';
  enabled: boolean;
}

const STORAGE_KEY = 'direct-hit-apis';

export function loadDirectApis(): DirectApi[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveDirectApis(apis: DirectApi[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apis));
}

// --- Code Parser (same logic as ApiImporter but adapted for DirectApi) ---
const HEADERS_TO_REMOVE = [
  'user-agent', 'cookie', 'accept-encoding', 'content-length',
  'priority', 'accept-language', 'host', 'connection',
  'upgrade-insecure-requests', 'cache-control', 'pragma',
];
const SEC_HEADER_PATTERN = /^sec-/i;

function parseBody(code: string): { body: string; bodyType: DirectApi['bodyType']; warnings: string[] } {
  const warnings: string[] = [];

  // JSON.stringify
  const jsonMatch = code.match(/JSON\.stringify\s*\(\s*([\[{][\s\S]*?[}\]])\s*\)/);
  if (jsonMatch) {
    try {
      const cleaned = jsonMatch[1].replace(/'/g, '"').replace(/(\w+)\s*:/g, '"$1":').replace(/,\s*([}\]])/g, '$1').replace(/`([^`]*)`/g, '"$1"').replace(/\$\{[^}]+\}/g, '{DYNAMIC}');
      JSON.parse(cleaned);
      return { body: cleaned, bodyType: 'json', warnings };
    } catch {
      return { body: jsonMatch[1], bodyType: 'json', warnings: ['JSON body may need manual cleanup'] };
    }
  }

  // URLSearchParams
  if (code.includes('URLSearchParams')) {
    const pairs: string[] = [];
    const appends = code.matchAll(/(\w+)\.append\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*["'`]([^"'`]*)["'`]\s*\)/g);
    for (const m of appends) pairs.push(`${encodeURIComponent(m[2])}=${encodeURIComponent(m[3])}`);
    const inline = code.match(/new\s+URLSearchParams\s*\(\s*\{([^}]+)\}\s*\)/s);
    if (inline) {
      const kvs = inline[1].matchAll(/["'`]?(\w+)["'`]?\s*:\s*["'`]([^"'`]*)["'`]/g);
      for (const p of kvs) pairs.push(`${encodeURIComponent(p[1])}=${encodeURIComponent(p[2])}`);
    }
    if (pairs.length > 0) return { body: pairs.join('&'), bodyType: 'form-urlencoded', warnings };
    return { body: '', bodyType: 'form-urlencoded', warnings: ['URLSearchParams detected but no params found'] };
  }

  // Template literal
  const tplMatch = code.match(/body\s*:\s*`([^`]+)`/);
  if (tplMatch) {
    const raw = tplMatch[1].replace(/\$\{[^}]+\}/g, '{DYNAMIC}');
    return { body: raw, bodyType: 'json', warnings };
  }

  // Raw string
  const rawMatch = code.match(/body\s*:\s*["']([^"']+)["']/);
  if (rawMatch) {
    if (rawMatch[1].includes('=') && !rawMatch[1].includes('{')) {
      return { body: rawMatch[1], bodyType: 'form-urlencoded', warnings };
    }
    return { body: rawMatch[1], bodyType: 'text', warnings };
  }

  // Inline object
  const inlineMatch = code.match(/body\s*:\s*(\{[\s\S]*?\})\s*[,\n\r}]/);
  if (inlineMatch && !/^\{?\s*\w+\s*\}?$/.test(inlineMatch[1].trim())) {
    try {
      const cleaned = inlineMatch[1].replace(/'/g, '"').replace(/(\w+)\s*:/g, '"$1":').replace(/,\s*}/g, '}');
      JSON.parse(cleaned);
      return { body: cleaned, bodyType: 'json', warnings };
    } catch {
      return { body: inlineMatch[1], bodyType: 'json', warnings: ['Inline body needs manual cleanup'] };
    }
  }

  return { body: '', bodyType: 'none', warnings };
}

function parseFetchCode(code: string): { api?: Partial<DirectApi>; error?: string; warnings: string[] } {
  const warnings: string[] = [];
  const urlMatch = code.match(/fetch\s*\(\s*["'`]([^"'`]+)["'`]/);
  if (!urlMatch) return { error: 'Could not find fetch() URL', warnings };

  let url = urlMatch[1];
  try { const u = new URL(url); u.search = ''; url = u.toString(); } catch {}

  const methodMatch = code.match(/method\s*:\s*["'`](\w+)["'`]/i);
  const method = (methodMatch ? methodMatch[1].toUpperCase() : 'GET') as DirectApi['method'];

  const headers: Record<string, string> = {};
  const headerObj = code.match(/headers\s*:\s*\{([^}]+)\}/s);
  if (headerObj) {
    const pairs = headerObj[1].matchAll(/["'`]([^"'`]+)["'`]\s*:\s*["'`]([^"'`]+)["'`]/g);
    for (const p of pairs) headers[p[1]] = p[2];
  }
  const newHeaders = code.match(/new\s+Headers\s*\(\s*\{([^}]+)\}\s*\)/s);
  if (newHeaders) {
    const pairs = newHeaders[1].matchAll(/["'`]([^"'`]+)["'`]\s*:\s*["'`]([^"'`]+)["'`]/g);
    for (const p of pairs) headers[p[1]] = p[2];
  }
  for (const key of Object.keys(headers)) {
    if (HEADERS_TO_REMOVE.includes(key.toLowerCase()) || SEC_HEADER_PATTERN.test(key)) delete headers[key];
  }

  const { body, bodyType, warnings: bw } = parseBody(code);
  warnings.push(...bw);

  let name: string = method;
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(p => p && !/^[0-9a-f-]{8,}$/i.test(p));
    if (parts.length > 0) name = `${method} ${parts.slice(-2).join(' ')}`;
    else name = `${method} ${u.hostname.split('.')[0]}`;
  } catch {}

  return { api: { name, url, method, headers, body, bodyType, enabled: true }, warnings };
}

// --- Tabs ---
type Tab = 'apis' | 'import' | 'bulk';

export default function DirectHitAdmin() {
  const navigate = useNavigate();
  const [apis, setApis] = useState<DirectApi[]>([]);
  const [tab, setTab] = useState<Tab>('apis');
  const [expandedApi, setExpandedApi] = useState<string | null>(null);
  const [fetchCode, setFetchCode] = useState('');
  const [parseResult, setParseResult] = useState<{ api?: Partial<DirectApi>; error?: string; warnings: string[] } | null>(null);
  const [importName, setImportName] = useState('');
  const [bulkJson, setBulkJson] = useState('');

  useEffect(() => { setApis(loadDirectApis()); }, []);

  const save = (updated: DirectApi[]) => { setApis(updated); saveDirectApis(updated); };

  const addApi = () => {
    const newApi: DirectApi = {
      id: `api-${Date.now()}`, name: `API ${apis.length + 1}`, url: '', method: 'GET',
      headers: {}, body: '', bodyType: 'none', enabled: true,
    };
    save([...apis, newApi]);
    setExpandedApi(newApi.id);
  };

  const updateApi = (id: string, updates: Partial<DirectApi>) => {
    save(apis.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteApi = (id: string) => {
    save(apis.filter(a => a.id !== id));
    if (expandedApi === id) setExpandedApi(null);
  };

  const toggleApi = (id: string) => {
    save(apis.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const toggleAll = (enabled: boolean) => {
    save(apis.map(a => ({ ...a, enabled })));
  };

  const updateHeaders = (apiId: string, jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      updateApi(apiId, { headers: parsed });
    } catch { /* user still typing */ }
  };

  // Import
  const handleParse = () => {
    const res = parseFetchCode(fetchCode);
    setParseResult(res);
    if (res.api?.name) setImportName(res.api.name);
  };

  const handleImport = () => {
    if (!parseResult?.api) return;
    const newApi: DirectApi = {
      id: `api-${Date.now()}`,
      name: importName || parseResult.api.name || 'Imported',
      url: parseResult.api.url || '',
      method: (parseResult.api.method as DirectApi['method']) || 'GET',
      headers: parseResult.api.headers || {},
      body: parseResult.api.body || '',
      bodyType: (parseResult.api.bodyType as DirectApi['bodyType']) || 'none',
      enabled: true,
    };
    save([...apis, newApi]);
    setFetchCode(''); setParseResult(null); setImportName('');
    setTab('apis');
    toast.success('API imported!');
  };

  // Bulk
  const handleBulkExport = () => {
    setBulkJson(JSON.stringify(apis, null, 2));
    toast.success('Exported to text area');
  };

  const handleBulkImport = () => {
    try {
      const imported = JSON.parse(bulkJson) as DirectApi[];
      if (!Array.isArray(imported)) throw new Error('Must be array');
      const withIds = imported.map((a, i) => ({ ...a, id: a.id || `api-${Date.now()}-${i}` }));
      save(withIds);
      setBulkJson('');
      setTab('apis');
      toast.success(`${withIds.length} APIs imported`);
    } catch (e) {
      toast.error('Invalid JSON');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'apis', label: 'APIs', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'import', label: 'Code Import', icon: <Code className="w-3.5 h-3.5" /> },
    { id: 'bulk', label: 'Bulk', icon: <Download className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/direct-hit')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight">Direct Hit Admin</h1>
          <p className="text-[10px] text-white/30">Manage APIs • No backend • localStorage</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[11px] font-medium transition-all ${
              tab === t.id ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* APIs Tab */}
      {tab === 'apis' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">{apis.length} APIs • {apis.filter(a => a.enabled).length} enabled</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => toggleAll(true)} className="h-7 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10">All ON</Button>
              <Button size="sm" variant="ghost" onClick={() => toggleAll(false)} className="h-7 px-2 text-[10px] text-red-400 hover:bg-red-500/10">All OFF</Button>
              <Button size="sm" variant="ghost" onClick={addApi} className="h-7 px-2 text-[10px] text-orange-400 hover:bg-orange-500/10">
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
          </div>

          {apis.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <p className="text-white/20 text-xs">No APIs yet</p>
              <Button size="sm" onClick={addApi} className="bg-orange-600 hover:bg-orange-700 text-xs">
                <Plus className="w-3 h-3 mr-1" /> Add First API
              </Button>
            </div>
          )}

          {apis.map(api => (
            <div key={api.id} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
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

              {expandedApi === api.id && (
                <div className="p-3 pt-0 space-y-3 border-t border-white/[0.04]">
                  <div className="space-y-1.5">
                    <Label className="text-white/40 text-xs">Name</Label>
                    <Input value={api.name} onChange={e => updateApi(api.id, { name: e.target.value })} placeholder="API Name"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15 focus:border-orange-500/40" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/40 text-xs">URL</Label>
                    <Input value={api.url} onChange={e => updateApi(api.id, { url: e.target.value })} placeholder="https://api.example.com/{PHONE}"
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15 focus:border-orange-500/40 font-mono text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-white/40 text-xs">Method</Label>
                      <Select value={api.method} onValueChange={v => updateApi(api.id, { method: v as DirectApi['method'] })}>
                        <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#141418] border-white/[0.08]">
                          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                            <SelectItem key={m} value={m} className="text-white/80">{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white/40 text-xs">Body Type</Label>
                      <Select value={api.bodyType} onValueChange={v => updateApi(api.id, { bodyType: v as DirectApi['bodyType'] })}>
                        <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#141418] border-white/[0.08]">
                          {['none', 'json', 'form-urlencoded', 'text'].map(t => (
                            <SelectItem key={t} value={t} className="text-white/80">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/40 text-xs">Headers (JSON)</Label>
                    <Textarea
                      defaultValue={JSON.stringify(api.headers, null, 2)}
                      onBlur={e => updateHeaders(api.id, e.target.value)}
                      className="bg-white/[0.04] border-white/[0.08] text-white/80 text-xs h-20 font-mono placeholder:text-white/15 focus:border-orange-500/40"
                      placeholder='{"Content-Type": "application/json"}' />
                  </div>
                  {api.bodyType !== 'none' && (
                    <div className="space-y-1.5">
                      <Label className="text-white/40 text-xs">Body</Label>
                      <Textarea value={api.body} onChange={e => updateApi(api.id, { body: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.08] text-white/80 text-xs h-20 font-mono placeholder:text-white/15 focus:border-orange-500/40"
                        placeholder='{"phone": "{PHONE}"}' />
                    </div>
                  )}
                  <button
                    onClick={() => { saveDirectApis(apis); toast.success('API saved!'); }}
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2">
                    💾 Save API
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Code Import Tab */}
      {tab === 'import' && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Code className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-sm font-semibold text-white/90">Paste Node.js Fetch Code</h3>
          </div>

          <Textarea value={fetchCode} onChange={e => setFetchCode(e.target.value)}
            placeholder={`fetch("https://api.example.com/send", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ phone: "{PHONE}" })\n});`}
            className="bg-white/[0.04] border-white/[0.08] text-emerald-400/80 text-xs h-40 placeholder:text-white/15" />

          <button onClick={handleParse}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <Code className="w-4 h-4" /> Parse & Preview
          </button>

          {parseResult?.error && (
            <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/[0.15] text-red-400/80 text-xs">❌ {parseResult.error}</div>
          )}

          {parseResult?.warnings.map((w, i) => (
            <div key={i} className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/[0.12] text-amber-400/70 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {w}
            </div>
          ))}

          {parseResult?.api && (
            <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <Input value={importName} onChange={e => setImportName(e.target.value)} placeholder="API Name"
                className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15" />
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-white/30">Method:</span> <span className="text-blue-400">{parseResult.api.method}</span>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-white/30">Body:</span> <span className="text-violet-400">{parseResult.api.bodyType}</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] text-[10px] text-white/30 break-all font-mono">{parseResult.api.url}</div>
              {parseResult.api.headers && Object.keys(parseResult.api.headers).length > 0 && (
                <div className="p-2 rounded-lg bg-white/[0.03] text-[10px] text-white/30">
                  <p className="text-white/50 mb-1">Headers:</p>
                  {Object.entries(parseResult.api.headers).map(([k, v]) => (
                    <p key={k} className="truncate"><span className="text-emerald-400/60">{k}:</span> {v}</p>
                  ))}
                </div>
              )}
              {parseResult.api.body && (
                <div className="p-2 rounded-lg bg-white/[0.03] text-[10px] text-white/30">
                  <p className="text-white/50 mb-1">Body:</p>
                  <pre className="whitespace-pre-wrap font-mono">{parseResult.api.body}</pre>
                </div>
              )}
              <button onClick={handleImport}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> Import API
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Tab */}
      {tab === 'bulk' && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Download className="w-4 h-4 text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-white/90">Bulk Export / Import</h3>
          </div>

          <div className="flex gap-2">
            <button onClick={handleBulkExport}
              className="flex-1 h-9 rounded-lg bg-violet-500/10 text-violet-400 text-xs font-medium hover:bg-violet-500/20 flex items-center justify-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export All
            </button>
            <button onClick={handleBulkImport} disabled={!bulkJson.trim()}
              className="flex-1 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 disabled:opacity-30 flex items-center justify-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Import JSON
            </button>
          </div>

          <Textarea value={bulkJson} onChange={e => setBulkJson(e.target.value)}
            placeholder="Paste JSON array of APIs here, or click Export to fill..."
            className="bg-white/[0.04] border-white/[0.08] text-white/70 text-xs h-60 font-mono placeholder:text-white/15" />
        </div>
      )}
    </div>
  );
}
