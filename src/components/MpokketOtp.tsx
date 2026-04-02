import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Phone, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AnimatedJsonViewer from '@/components/AnimatedJsonViewer';

const SERVICES = [
  { id: 'mpokket', label: 'Mpokket', color: '#ffb400', msgLabel: 'Hash Key', msgDefault: 'OTP_REQUEST' },
  { id: 'milkbasket', label: 'Milkbasket', color: '#4ade80', msgLabel: 'App Hash', msgDefault: 'default' },
  { id: 'digihaat', label: 'Digihaat', color: '#60a5fa', msgLabel: 'Message', msgDefault: 'hello' },
];

export default function MpokketOtp() {
  const [service, setService] = useState('mpokket');
  const [number, setNumber] = useState('');
  const [msg, setMsg] = useState('OTP_REQUEST');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const active = SERVICES.find(s => s.id === service) || SERVICES[0];

  const handleServiceChange = (id: string) => {
    setService(id);
    const svc = SERVICES.find(s => s.id === id)!;
    setMsg(svc.msgDefault);
    setResult(null);
    setError(null);
  };

  const handleSend = async () => {
    if (!number || number.length < 10) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('mpokket-otp', {
        body: { number, msg, service },
      });
      if (fnError) throw fnError;
      if (data) {
        setResult(data);
      } else {
        setError('No response received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-3" style={{ background: 'rgba(8,6,18,0.6)', border: `1px solid ${active.color}22` }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: active.color, boxShadow: `0 0 5px ${active.color}` }} />
          <span className="text-[10px] font-bold tracking-wider uppercase font-mono" style={{ color: active.color, opacity: 0.85 }}>
            CUSTOM SMS
          </span>
        </div>

        {/* Service Selector */}
        <div className="flex gap-1.5 mb-3">
          {SERVICES.map(svc => (
            <button
              key={svc.id}
              onClick={() => handleServiceChange(svc.id)}
              className="flex-1 py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: service === svc.id ? `${svc.color}20` : 'rgba(8,6,18,0.4)',
                border: `1px solid ${service === svc.id ? `${svc.color}50` : 'rgba(255,255,255,0.05)'}`,
                color: service === svc.id ? svc.color : 'rgba(255,255,255,0.3)',
              }}
            >
              {svc.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: `${active.color}99` }} />
            <Input
              value={number}
              onChange={e => setNumber(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="98765432xx"
              className="h-10 text-sm font-mono rounded-xl"
              style={{ background: 'rgba(8,6,18,0.8)', borderColor: `${active.color}25`, color: active.color }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: `${active.color}99` }} />
            <Input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder={active.msgLabel}
              className="h-10 text-sm font-mono rounded-xl"
              style={{ background: 'rgba(8,6,18,0.8)', borderColor: `${active.color}25`, color: active.color }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={loading || number.length < 10}
            className="w-full h-10 rounded-xl font-bold transition-all active:scale-[0.97]"
            style={{ background: `${active.color}15`, border: `1px solid ${active.color}40`, color: active.color, boxShadow: `0 0 10px ${active.color}10` }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> SEND OTP</>}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-center py-4 rounded-xl" style={{ background: 'rgba(220,30,30,0.05)', border: '1px solid rgba(220,30,30,0.12)' }}>
          <p className="text-sm font-medium" style={{ color: 'rgba(255,80,80,0.8)' }}>{error}</p>
        </div>
      )}

      {result && !error && (
        <div className="rounded-xl p-3" style={{ background: 'rgba(0,10,8,0.7)', border: '1px solid rgba(0,255,128,0.1)' }}>
          <AnimatedJsonViewer data={result} title={`📱 ${active.label.toUpperCase()} RESPONSE`} accentColor="yellow" animationSpeed={25} showLineNumbers />
        </div>
      )}
    </div>
  );
}
