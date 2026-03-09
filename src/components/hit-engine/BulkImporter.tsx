import { useState, useRef } from 'react';
import { Upload, FileJson, CheckCircle } from 'lucide-react';
import type { HitApi } from '@/hooks/useHitApis';
import { toast } from 'sonner';

interface BulkImporterProps {
  onBulkImport: (apis: Omit<HitApi, 'id'>[]) => void;
}

function validateApi(obj: Record<string, unknown>): Omit<HitApi, 'id'> | null {
  if (!obj.url || typeof obj.url !== 'string') return null;
  return {
    name: (obj.name as string) || 'Imported API',
    url: obj.url as string,
    method: (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(String(obj.method).toUpperCase()) 
      ? String(obj.method).toUpperCase() 
      : 'GET') as HitApi['method'],
    headers: (typeof obj.headers === 'object' && obj.headers !== null ? obj.headers : {}) as Record<string, string>,
    body: (typeof obj.body === 'object' && obj.body !== null ? obj.body : {}) as Record<string, unknown>,
    bodyType: (['json', 'form-urlencoded', 'multipart', 'text', 'none'].includes(String(obj.bodyType || obj.body_type))
      ? String(obj.bodyType || obj.body_type)
      : 'none') as HitApi['bodyType'],
    query_params: (typeof obj.query_params === 'object' && obj.query_params !== null ? obj.query_params : {}) as Record<string, string>,
    enabled: obj.enabled !== false,
    proxy_enabled: !!obj.proxy_enabled,
    force_proxy: !!obj.force_proxy,
    rotation_enabled: !!obj.rotation_enabled,
    residential_proxy_enabled: !!obj.residential_proxy_enabled,
    fail_count: 0, // Always reset on import
  };
}

export default function BulkImporter({ onBulkImport }: BulkImporterProps) {
  const [preview, setPreview] = useState<Omit<HitApi, 'id'>[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) {
          toast.error('JSON file must contain an array of APIs');
          return;
        }
        const valid = parsed.map(validateApi).filter(Boolean) as Omit<HitApi, 'id'>[];
        if (valid.length === 0) {
          toast.error('No valid APIs found in file');
          return;
        }
        setPreview(valid);
        toast.success(`${valid.length} APIs parsed from file`);
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportAll = () => {
    if (!preview) return;
    onBulkImport(preview);
    setPreview(null);
  };

  return (
    <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Upload className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/90">Bulk Import</h3>
          <p className="text-[10px] text-white/25">Import exported JSON file</p>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden" />

      <button
        onClick={() => fileRef.current?.click()}
        className="w-full py-8 rounded-xl border-2 border-dashed border-white/[0.08] bg-white/[0.02] text-white/30 text-sm font-medium hover:bg-white/[0.04] hover:border-white/[0.12] hover:text-white/50 transition-all flex flex-col items-center justify-center gap-2"
      >
        <FileJson className="w-6 h-6" />
        Select JSON File
      </button>

      {preview && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-emerald-500/[0.12]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">{preview.length} APIs Ready</span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {preview.map((api, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">{api.method}</span>
                  <span className="text-white/50 truncate">{api.name}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleImportAll}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" /> Import All {preview.length} APIs
          </button>
        </div>
      )}
    </div>
  );
}
