import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Key, Save, Trash2, Eye, EyeOff, Copy, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useHitSiteSettings } from '@/hooks/useHitSiteSettings';

export default function FastApiKeyManager() {
  const [secretKey, setSecretKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const { settings } = useHitSiteSettings();

  const fastHitAllBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fast-hit-all`;
  const cfWorkerUrl = settings.cloudflareProxyUrl?.trim() || '';

  const fetchKey = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'fast_api_secret_key')
      .single();
    const val = (data?.setting_value as string) || '';
    setSecretKey(val);
    setInputKey(val);
    setLoading(false);
  };

  useEffect(() => { fetchKey(); }, []);

  const handleSave = async () => {
    if (!inputKey.trim()) {
      toast.error('Key khali nahi ho sakti');
      return;
    }
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('setting_key', 'fast_api_secret_key')
      .single();

    if (existing) {
      await supabase
        .from('app_settings')
        .update({ setting_value: inputKey.trim() as any })
        .eq('setting_key', 'fast_api_secret_key');
    } else {
      await supabase
        .from('app_settings')
        .insert({ setting_key: 'fast_api_secret_key', setting_value: inputKey.trim() as any });
    }
    setSecretKey(inputKey.trim());
    toast.success('Secret key saved!');
  };

  const handleDelete = async () => {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('setting_key', 'fast_api_secret_key')
      .single();

    if (existing) {
      await supabase
        .from('app_settings')
        .update({ setting_value: '' as any })
        .eq('setting_key', 'fast_api_secret_key');
    }
    setSecretKey('');
    setInputKey('');
    toast.success('Secret key removed! API ab bina key ke accessible hai.');
  };

  const copyLinkWithKey = () => {
    const fullUrl = secretKey ? `${fastHitAllBaseUrl}?key=${secretKey}` : fastHitAllBaseUrl;
    const info = `POST ${fullUrl}

Content-Type: application/json

{"phone":"9876543210","rounds":5,"batch":5,"delay":2,"timeout":15}

// rounds = kitni baar hit karna hai
// batch = ek baar me kitni APIs simultaneously
// delay = rounds ke beech gap (seconds)
// timeout = per API timeout (seconds)`;
    navigator.clipboard.writeText(info);
    toast.success('POST URL copied!');
  };

  const copyGetLink = () => {
    const base = secretKey ? `${fastHitAllBaseUrl}?key=${secretKey}&` : `${fastHitAllBaseUrl}?`;
    const fullUrl = `${base}phone=9876543210&rounds=5&batch=5&delay=2&timeout=15`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('GET URL copied!');
  };

  const copyCurlLink = () => {
    const keyPart = secretKey ? `?key=${secretKey}` : '';
    const curl = `curl "${fastHitAllBaseUrl}${keyPart}${secretKey ? '&' : '?'}phone=9876543210&rounds=5&batch=5&delay=2&timeout=15"`;
    navigator.clipboard.writeText(curl);
    toast.success('cURL copied!');
  };

  if (loading) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Key className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-medium text-white/80">Fast API Secret Key</span>
        {secretKey && (
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Active</span>
        )}
        {!secretKey && (
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">No Key</span>
        )}
      </div>

      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            placeholder="Enter secret key..."
            className="h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white pr-8"
          />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button onClick={handleSave}
          className="h-8 px-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors">
          <Save className="w-3.5 h-3.5" />
        </button>
        {secretKey && (
          <button onClick={handleDelete}
            className="h-8 px-2.5 rounded-lg bg-red-500/[0.08] border border-red-500/[0.15] text-red-400/70 hover:bg-red-500/[0.15] transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {secretKey && (
        <div className="flex gap-1.5">
          <button onClick={copyLinkWithKey}
            className="flex-1 h-8 rounded-lg bg-amber-500/[0.08] border border-amber-500/[0.15] text-amber-300/70 text-[10px] font-medium hover:bg-amber-500/[0.15] transition-all flex items-center justify-center gap-1.5">
            <Copy className="w-3 h-3" /> POST
          </button>
          <button onClick={copyGetLink}
            className="flex-1 h-8 rounded-lg bg-cyan-500/[0.08] border border-cyan-500/[0.15] text-cyan-300/70 text-[10px] font-medium hover:bg-cyan-500/[0.15] transition-all flex items-center justify-center gap-1.5">
            <Copy className="w-3 h-3" /> GET
          </button>
          <button onClick={copyCurlLink}
            className="flex-1 h-8 rounded-lg bg-purple-500/[0.08] border border-purple-500/[0.15] text-purple-300/70 text-[10px] font-medium hover:bg-purple-500/[0.15] transition-all flex items-center justify-center gap-1.5">
            <Copy className="w-3 h-3" /> cURL
          </button>
        </div>
      )}

      <p className="text-[9px] text-white/20">
        {secretKey ? 'API sirf is key ke saath kaam karega.' : 'Koi key set nahi hai — API publicly accessible hai.'}
      </p>
    </div>
  );
}
