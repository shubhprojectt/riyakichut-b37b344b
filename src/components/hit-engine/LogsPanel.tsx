import { useState } from 'react';
import { HitLog } from '@/hooks/useHitLogs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, Trash2, ChevronDown, ChevronRight, Globe } from 'lucide-react';

interface LogsPanelProps {
  logs: HitLog[];
  onClear: () => void;
}

function getBrowserName(ua: string | null): string {
  if (!ua || ua.length === 0) return '—';
  if (/Brave/i.test(ua)) return 'Brave';
  if (/Vivaldi/i.test(ua)) return 'Vivaldi';
  if (/OPR|Opera/i.test(ua)) return 'Opera';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  return 'Server';
}

function getPlatform(ua: string | null): string {
  if (!ua) return '';
  if (ua.includes('iPhone')) return '📱iPhone';
  if (ua.includes('Android')) return '📱Android';
  if (ua.includes('Windows')) return '💻Win';
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) return '💻Mac';
  if (ua.includes('Linux')) return '💻Linux';
  return '';
}

export default function LogsPanel({ logs, onClear }: LogsPanelProps) {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  return (
    <div className="rounded-2xl bg-black/60 backdrop-blur-sm border border-neon-green/20 overflow-hidden" style={{boxShadow: '0 0 15px hsl(var(--neon-green) / 0.08)'}}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-neon-green/10">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-neon-green/60" style={{filter: 'drop-shadow(0 0 4px hsl(var(--neon-green)))'}} />
          <span className="text-xs font-bold text-neon-green/70 font-mono tracking-wider" style={{textShadow: '0 0 8px hsl(var(--neon-green) / 0.5)'}}>LIVE LOGS</span>
          {logs.length > 0 && (
            <span className="text-[10px] text-neon-cyan/50 font-mono" style={{textShadow: '0 0 6px hsl(var(--neon-cyan) / 0.5)'}}>({logs.length})</span>
          )}
        </div>
        {logs.length > 0 && (
          <button onClick={onClear} className="text-neon-red/40 hover:text-neon-red/80 transition-colors" style={{filter: 'drop-shadow(0 0 3px hsl(var(--neon-red)))'}}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <ScrollArea className="h-64">
        <div className="p-3 space-y-0.5 font-mono">
          {logs.length === 0 ? (
            <div className="text-center py-10">
              <Terminal className="w-8 h-8 text-neon-green/10 mx-auto mb-2" />
              <p className="text-[11px] text-neon-green/20 font-mono" style={{textShadow: '0 0 6px hsl(var(--neon-green) / 0.2)'}}>Waiting for hits...</p>
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id}>
                <div 
                  className="flex items-center gap-2 text-[10px] cursor-pointer hover:bg-neon-green/[0.04] rounded-md px-2 py-1 transition-colors"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  {log.user_agent ? (
                    expandedLog === log.id 
                      ? <ChevronDown className="w-3 h-3 text-neon-cyan/40 flex-shrink-0" /> 
                      : <ChevronRight className="w-3 h-3 text-neon-cyan/40 flex-shrink-0" />
                  ) : <span className="w-3" />}
                  <span className="text-neon-cyan/30 tabular-nums">{new Date(log.created_at).toLocaleTimeString()}</span>
                  <span 
                    className={`font-bold ${log.success ? 'text-neon-green' : 'text-neon-red'}`}
                    style={{textShadow: log.success ? '0 0 8px hsl(var(--neon-green))' : '0 0 8px hsl(var(--neon-red))'}}
                  >
                    [{log.status_code || 'ERR'}]
                  </span>
                  <span className="text-neon-cyan/60 truncate">{log.api_name}</span>
                  {log.user_agent && (
                    <span className="text-neon-purple/60 flex items-center gap-0.5 flex-shrink-0">
                      <Globe className="w-2.5 h-2.5" />
                      {getBrowserName(log.user_agent)} {getPlatform(log.user_agent)}
                    </span>
                  )}
                  {log.response_time != null && (
                    <span className="text-neon-yellow/40 flex-shrink-0">{log.response_time}ms</span>
                  )}
                </div>
                {expandedLog === log.id && log.user_agent && (
                  <div className="ml-7 mt-0.5 mb-1 px-2 py-1.5 rounded-lg bg-black/40 border border-neon-purple/10">
                    <p className="text-[9px] text-neon-purple/40 break-all flex items-start gap-1">
                      <Globe className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {log.user_agent}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
