import { useState, useEffect } from 'react';
import { Clock, Phone, Play, Square, Trash2, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ScheduledHitRecord {
  id: string;
  phone_number: string;
  start_time: string;
  interval_seconds: number;
  is_active: boolean;
  last_executed_at: string | null;
  next_execution_at: string | null;
  total_hits: number;
  max_rounds: number;
  created_at: string;
}

export default function ScheduledHit() {
  const [phone, setPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [intervalValue, setIntervalValue] = useState('60');
  const [intervalUnit, setIntervalUnit] = useState<'seconds' | 'minutes'>('seconds');
  const [maxRounds, setMaxRounds] = useState('0');
  const [jobs, setJobs] = useState<ScheduledHitRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Load existing jobs
  useEffect(() => {
    loadJobs();

    // Realtime subscription for live updates
    const channel = supabase
      .channel('scheduled-hits-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scheduled_hits' }, () => {
        loadJobs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from('scheduled_hits')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setJobs(data as ScheduledHitRecord[]);
  };

  const handleSchedule = async () => {
    if (phone.length < 10) {
      toast({ title: 'Error', description: 'Valid phone number enter karo', variant: 'destructive' });
      return;
    }
    if (!startDate || !startTime) {
      toast({ title: 'Error', description: 'Start date aur time set karo', variant: 'destructive' });
      return;
    }

    const intervalSec = intervalUnit === 'minutes' ? parseInt(intervalValue) * 60 : parseInt(intervalValue);
    if (isNaN(intervalSec) || intervalSec < 10) {
      toast({ title: 'Error', description: 'Interval minimum 10 seconds hona chahiye', variant: 'destructive' });
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`).toISOString();

    const maxR = parseInt(maxRounds) || 0;

    setLoading(true);
    const { error } = await supabase.from('scheduled_hits').insert({
      phone_number: phone,
      start_time: startDateTime,
      interval_seconds: intervalSec,
      next_execution_at: startDateTime,
      max_rounds: maxR,
    } as any);

    if (error) {
      toast({ title: 'Error', description: 'Failed to schedule', variant: 'destructive' });
    } else {
      toast({ title: '✅ Scheduled!', description: `API hits for ${phone} scheduled at ${startDate} ${startTime}` });
      setPhone('');
      setStartDate('');
      setStartTime('');
      loadJobs();
    }
    setLoading(false);
  };

  const toggleJob = async (id: string, currentActive: boolean) => {
    await supabase.from('scheduled_hits').update({ is_active: !currentActive }).eq('id', id);
    loadJobs();
    toast({ title: currentActive ? '⏸️ Paused' : '▶️ Resumed', description: currentActive ? 'Scheduled hit paused' : 'Scheduled hit resumed' });
  };

  const deleteJob = async (id: string) => {
    await supabase.from('scheduled_hits').delete().eq('id', id);
    loadJobs();
    toast({ title: '🗑️ Deleted', description: 'Scheduled hit removed' });
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getStatus = (job: ScheduledHitRecord) => {
    if (!job.is_active && job.max_rounds > 0 && job.total_hits >= job.max_rounds) return { text: 'COMPLETED', color: 'text-violet-400', bg: 'bg-violet-500/10' };
    if (!job.is_active) return { text: 'PAUSED', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    const now = new Date();
    if (new Date(job.start_time) > now) return { text: 'WAITING', color: 'text-blue-400', bg: 'bg-blue-500/10' };
    return { text: 'RUNNING', color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  };

  // Set default date/time to now
  useEffect(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    setStartDate(local.toISOString().split('T')[0]);
    setStartTime(local.toISOString().split('T')[1].substring(0, 5));
  }, []);

  return (
    <div className="space-y-4">
      {/* Create Schedule Form */}
      <div className="rounded-2xl bg-black/60 backdrop-blur-sm border border-neon-orange/20 p-4 space-y-3" style={{boxShadow: '0 0 15px hsl(var(--neon-orange) / 0.08)'}}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black border border-neon-orange/30 flex items-center justify-center" style={{boxShadow: '0 0 10px hsl(var(--neon-orange) / 0.3)'}}>
            <Clock className="w-3.5 h-3.5 text-neon-orange animate-neon-flicker" style={{filter: 'drop-shadow(0 0 6px hsl(var(--neon-orange)))'}} />
          </div>
          <h2 className="text-sm font-bold text-neon-orange tracking-tight font-mono" style={{textShadow: '0 0 10px hsl(var(--neon-orange))'}}>TIME SCHEDULED HIT</h2>
        </div>

        <p className="text-[10px] text-neon-orange/30 font-mono" style={{textShadow: '0 0 6px hsl(var(--neon-orange) / 0.3)'}}>⚡ Browser band hone ke baad bhi server-side chalta rahega</p>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-neon-cyan/40 tracking-wider uppercase font-mono">Phone Number</label>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-neon-green/40 flex-shrink-0" style={{filter: 'drop-shadow(0 0 3px hsl(var(--neon-green)))'}} />
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
              placeholder="91XXXXXXXXXX"
              className="h-9 bg-black/80 border-neon-orange/15 text-neon-orange text-xs placeholder:text-neon-orange/15 focus:border-neon-orange/40 font-mono"
              style={{textShadow: '0 0 4px hsl(var(--neon-orange) / 0.3)'}}
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neon-cyan/40 tracking-wider uppercase font-mono">Start Date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-9 bg-black/80 border-neon-orange/15 text-neon-orange text-xs focus:border-neon-orange/40 [color-scheme:dark] font-mono" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neon-cyan/40 tracking-wider uppercase font-mono">Start Time</label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="h-9 bg-black/80 border-neon-orange/15 text-neon-orange text-xs focus:border-neon-orange/40 [color-scheme:dark] font-mono" />
          </div>
        </div>

        {/* Interval & Max Rounds */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neon-cyan/40 tracking-wider uppercase font-mono">Interval</label>
            <div className="flex gap-1">
              <Input type="number" min="10" value={intervalValue} onChange={e => setIntervalValue(e.target.value)} placeholder="60"
                className="h-9 flex-1 bg-black/80 border-neon-orange/15 text-neon-orange text-xs focus:border-neon-orange/40 font-mono" />
              <div className="flex rounded-lg overflow-hidden border border-neon-orange/20">
                <button onClick={() => setIntervalUnit('seconds')}
                  className={`px-2 h-9 text-[9px] font-bold font-mono transition-colors ${intervalUnit === 'seconds' ? 'bg-neon-orange/20 text-neon-orange' : 'bg-black/40 text-white/30'}`}
                  style={intervalUnit === 'seconds' ? {textShadow: '0 0 6px hsl(var(--neon-orange))'} : undefined}
                >S</button>
                <button onClick={() => setIntervalUnit('minutes')}
                  className={`px-2 h-9 text-[9px] font-bold font-mono transition-colors ${intervalUnit === 'minutes' ? 'bg-neon-orange/20 text-neon-orange' : 'bg-black/40 text-white/30'}`}
                  style={intervalUnit === 'minutes' ? {textShadow: '0 0 6px hsl(var(--neon-orange))'} : undefined}
                >M</button>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-neon-cyan/40 tracking-wider uppercase font-mono">Max Rounds (0=∞)</label>
            <Input type="number" min="0" value={maxRounds} onChange={e => setMaxRounds(e.target.value)} placeholder="0"
              className="h-9 bg-black/80 border-neon-orange/15 text-neon-orange text-xs focus:border-neon-orange/40 font-mono" />
          </div>
        </div>

        {/* Schedule Button */}
        <Button onClick={handleSchedule} disabled={loading || phone.length < 10}
          className="w-full h-10 rounded-xl font-bold bg-black border-2 border-neon-orange/50 text-neon-orange hover:bg-neon-orange/10 active:scale-[0.97] transition-all font-mono"
          style={{boxShadow: '0 0 20px hsl(var(--neon-orange) / 0.3)', textShadow: '0 0 10px hsl(var(--neon-orange))'}}>
          <Clock className="w-4 h-4 mr-2" />
          {loading ? 'Scheduling...' : 'SCHEDULE HIT'}
        </Button>
      </div>

      {/* Active Jobs */}
      {jobs.length > 0 && (
        <div className="rounded-2xl bg-black/60 backdrop-blur-sm border border-neon-green/20 p-4 space-y-3" style={{boxShadow: '0 0 15px hsl(var(--neon-green) / 0.08)'}}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-neon-green" style={{filter: 'drop-shadow(0 0 6px hsl(var(--neon-green)))'}} />
            <h3 className="text-xs font-bold text-neon-green/70 uppercase tracking-wider font-mono" style={{textShadow: '0 0 8px hsl(var(--neon-green) / 0.5)'}}>Scheduled Jobs ({jobs.length})</h3>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {jobs.map(job => {
              const status = getStatus(job);
              const statusNeonMap: Record<string, string> = {
                'text-yellow-400': '--neon-yellow', 'text-blue-400': '--neon-blue',
                'text-emerald-400': '--neon-green', 'text-violet-400': '--neon-purple',
              };
              const statusNeon = statusNeonMap[status.color] || '--neon-green';
              return (
                <div key={job.id} className="p-3 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-neon-cyan/40" />
                      <span className="text-xs font-mono text-neon-cyan/80" style={{textShadow: '0 0 6px hsl(var(--neon-cyan) / 0.4)'}}>{job.phone_number}</span>
                    </div>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full font-mono ${status.color}`}
                      style={{textShadow: `0 0 8px hsl(var(${statusNeon}))`, backgroundColor: `hsl(var(${statusNeon}) / 0.1)`, border: `1px solid hsl(var(${statusNeon}) / 0.3)`}}>
                      {status.text}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center">
                    {[
                      { label: 'INTERVAL', value: job.interval_seconds >= 60 ? `${Math.round(job.interval_seconds / 60)}m` : `${job.interval_seconds}s`, neon: '--neon-cyan' },
                      { label: 'HITS', value: job.total_hits, neon: '--neon-green' },
                      { label: 'LIMIT', value: job.max_rounds > 0 ? job.max_rounds : '∞', neon: '--neon-orange' },
                      { label: 'NEXT', value: formatDateTime(job.next_execution_at), neon: '--neon-purple' },
                    ].map(s => (
                      <div key={s.label} className="p-1 rounded bg-black/40">
                        <p className="text-[7px] text-white/20 font-mono">{s.label}</p>
                        <p className="text-[10px] font-mono font-bold" style={{color: `hsl(var(${s.neon}))`, textShadow: `0 0 6px hsl(var(${s.neon}))`}}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    <button onClick={() => toggleJob(job.id, job.is_active)}
                      className={`flex-1 h-7 rounded-lg text-[9px] font-bold font-mono flex items-center justify-center gap-1 transition-colors border ${
                        job.is_active
                          ? 'bg-neon-yellow/5 text-neon-yellow border-neon-yellow/20 hover:bg-neon-yellow/10'
                          : 'bg-neon-green/5 text-neon-green border-neon-green/20 hover:bg-neon-green/10'
                      }`}
                      style={{textShadow: job.is_active ? '0 0 6px hsl(var(--neon-yellow))' : '0 0 6px hsl(var(--neon-green))'}}
                    >
                      {job.is_active ? <><Square className="w-2.5 h-2.5" /> PAUSE</> : <><Play className="w-2.5 h-2.5" /> RESUME</>}
                    </button>
                    <button onClick={() => deleteJob(job.id)}
                      className="h-7 px-3 rounded-lg text-[9px] font-bold font-mono bg-neon-red/5 text-neon-red border border-neon-red/20 hover:bg-neon-red/10 flex items-center gap-1 transition-colors"
                      style={{textShadow: '0 0 6px hsl(var(--neon-red))'}}>
                      <Trash2 className="w-2.5 h-2.5" /> DELETE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-xl bg-black/40 border border-neon-orange/10 p-3 space-y-1">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 text-neon-orange/40" />
          <span className="text-[9px] font-bold text-neon-orange/30 font-mono" style={{textShadow: '0 0 6px hsl(var(--neon-orange) / 0.3)'}}>HOW IT WORKS</span>
        </div>
        <ul className="text-[9px] text-neon-green/25 space-y-0.5 pl-4 list-disc font-mono" style={{textShadow: '0 0 4px hsl(var(--neon-green) / 0.2)'}}>
          <li>Server har minute check karta hai scheduled jobs</li>
          <li>Start time aane pe APIs automatically hit hoti hain</li>
          <li>Browser band hone pe bhi chalta rahega</li>
          <li>Admin me jo APIs enabled hain wohi fire hongi</li>
        </ul>
      </div>
    </div>
  );
}
