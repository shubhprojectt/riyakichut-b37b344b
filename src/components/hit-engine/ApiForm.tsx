import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { HitApi } from '@/hooks/useHitApis';

type ApiFormData = Omit<HitApi, 'id'>;

const emptyForm: ApiFormData = {
  name: '', url: '', method: 'POST',
  headers: {}, body: {}, bodyType: 'json',
  query_params: {}, enabled: true,
  proxy_enabled: false, force_proxy: false,
  rotation_enabled: false, residential_proxy_enabled: false,
  fail_count: 0,
};

interface ApiFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ApiFormData) => void;
  editApi?: HitApi | null;
}

export default function ApiForm({ open, onClose, onSubmit, editApi }: ApiFormProps) {
  const [form, setForm] = useState<ApiFormData>(emptyForm);
  const [headersStr, setHeadersStr] = useState('{}');
  const [bodyStr, setBodyStr] = useState('{}');
  const [queryStr, setQueryStr] = useState('{}');

  useEffect(() => {
    if (editApi) {
      setForm({ ...editApi });
      setHeadersStr(JSON.stringify(editApi.headers, null, 2));
      setBodyStr(JSON.stringify(editApi.body, null, 2));
      setQueryStr(JSON.stringify(editApi.query_params, null, 2));
    } else {
      setForm(emptyForm);
      setHeadersStr('{}');
      setBodyStr('{}');
      setQueryStr('{}');
    }
  }, [editApi, open]);

  const handleSubmit = () => {
    try {
      const headers = JSON.parse(headersStr);
      let body = {};
      
      if (form.bodyType === 'form-urlencoded' && bodyStr.includes('=') && !bodyStr.startsWith('{')) {
        const params = new URLSearchParams(bodyStr);
        body = Object.fromEntries(params);
      } else {
        body = JSON.parse(bodyStr || '{}');
      }
      
      const query_params = JSON.parse(queryStr || '{}');
      onSubmit({ ...form, headers, body, query_params });
      onClose();
    } catch (err) {
      alert('Invalid JSON in headers, body, or query params');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0e0e11] border-white/[0.08] text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white/90 font-semibold">{editApi ? 'Edit API' : 'Add API'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-white/40 text-xs">Name</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15 focus:border-violet-500/40" placeholder="API Name" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/40 text-xs">URL</Label>
            <Input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
              className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/15 focus:border-violet-500/40" placeholder="https://api.example.com/{PHONE}" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/40 text-xs">Method</Label>
              <Select value={form.method} onValueChange={v => setForm(p => ({ ...p, method: v as HitApi['method'] }))}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141418] border-white/[0.08]">
                  {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                    <SelectItem key={m} value={m} className="text-white/80">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/40 text-xs">Body Type</Label>
              <Select value={form.bodyType} onValueChange={v => setForm(p => ({ ...p, bodyType: v as HitApi['bodyType'] }))}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141418] border-white/[0.08]">
                  {['json', 'form-urlencoded', 'multipart', 'text', 'none'].map(t => (
                    <SelectItem key={t} value={t} className="text-white/80">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/40 text-xs">Headers (JSON)</Label>
            <Textarea value={headersStr} onChange={e => setHeadersStr(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white/80 text-xs h-20 placeholder:text-white/15 focus:border-violet-500/40" placeholder='{"Content-Type": "application/json"}' />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/40 text-xs">Body (JSON)</Label>
            <Textarea value={bodyStr} onChange={e => setBodyStr(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white/80 text-xs h-20 placeholder:text-white/15 focus:border-violet-500/40" placeholder='{"phone": "{PHONE}"}' />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/40 text-xs">Query Params (JSON)</Label>
            <Textarea value={queryStr} onChange={e => setQueryStr(e.target.value)}
              className="bg-white/[0.04] border-white/[0.08] text-white/80 text-xs h-16 placeholder:text-white/15 focus:border-violet-500/40" placeholder='{"key": "value"}' />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[11px] text-white/40">Enabled</span>
              <Switch checked={form.enabled} onCheckedChange={v => setForm(p => ({ ...p, enabled: v }))} />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[11px] text-white/40">Proxy</span>
              <Switch checked={form.proxy_enabled} onCheckedChange={v => setForm(p => ({ ...p, proxy_enabled: v }))} />
            </div>
          </div>

          <button onClick={handleSubmit}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all">
            {editApi ? 'Update API' : 'Add API'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
