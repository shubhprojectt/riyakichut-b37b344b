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
      <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <h2 className="text-sm font-semibold text-white tracking-tight">TIME SCHEDULED HIT</h2>
        </div>

        <p className="text-[10px] text-white/30">⚡ Browser band hone ke baad bhi server-side chalta rahega</p>

        {/* Phone */}
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-white/40 tracking-wider uppercase">Phone Number</label>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3 h-3 text-white/30 flex-shrink-0" />
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9+]/g, ''))}
              placeholder="91XXXXXXXXXX"
              className="h-9 bg-white/[0.04] border-white/[0.08] text-white text-xs placeholder:text-white/15 focus:border-orange-500/40"
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-white/40 tracking-wider uppercase">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="h-9 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:border-orange-500/40 [color-scheme:dark]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-white/40 tracking-wider uppercase">Start Time</label>
            <Input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="h-9 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:border-orange-500/40 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Interval & Max Rounds */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-white/40 tracking-wider uppercase">Interval</label>
            <div className="flex gap-1">
              <Input
                type="number"
                min="10"
                value={intervalValue}
                onChange={e => setIntervalValue(e.target.value)}
                placeholder="60"
                className="h-9 flex-1 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:border-orange-500/40"
              />
              <div className="flex rounded-lg overflow-hidden border border-white/[0.08]">
                <button
                  onClick={() => setIntervalUnit('seconds')}
                  className={`px-2 h-9 text-[9px] font-bold transition-colors ${intervalUnit === 'seconds' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/[0.02] text-white/30'}`}
                >S</button>
                <button
                  onClick={() => setIntervalUnit('minutes')}
                  className={`px-2 h-9 text-[9px] font-bold transition-colors ${intervalUnit === 'minutes' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/[0.02] text-white/30'}`}
                >M</button>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-white/40 tracking-wider uppercase">Max Rounds (0=∞)</label>
            <Input
              type="number"
              min="0"
              value={maxRounds}
              onChange={e => setMaxRounds(e.target.value)}
              placeholder="0"
              className="h-9 bg-white/[0.04] border-white/[0.08] text-white text-xs focus:border-orange-500/40"
            />
          </div>
        </div>

        {/* Schedule Button */}
        <Button
          onClick={handleSchedule}
          disabled={loading || phone.length < 10}
          className="w-full h-10 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90 active:scale-[0.97] transition-all shadow-lg shadow-orange-500/20"
        >
          <Clock className="w-4 h-4 mr-2" />
          {loading ? 'Scheduling...' : 'SCHEDULE HIT'}
        </Button>
      </div>

      {/* Active Jobs */}
      {jobs.length > 0 && (
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">Scheduled Jobs ({jobs.length})</h3>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {jobs.map(job => {
              const status = getStatus(job);
              return (
                <div key={job.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-white/40" />
                      <span className="text-xs font-mono text-white/80">{job.phone_number}</span>
                    </div>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                      {status.text}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="p-1 rounded bg-white/[0.02]">
                      <p className="text-[7px] text-white/25">INTERVAL</p>
                      <p className="text-[10px] text-white/60 font-mono">
                        {job.interval_seconds >= 60 ? `${Math.round(job.interval_seconds / 60)}m` : `${job.interval_seconds}s`}
                      </p>
                    </div>
                    <div className="p-1 rounded bg-white/[0.02]">
                      <p className="text-[7px] text-white/25">HITS</p>
                      <p className="text-[10px] text-emerald-400 font-mono font-bold">{job.total_hits}</p>
                    </div>
                    <div className="p-1 rounded bg-white/[0.02]">
                      <p className="text-[7px] text-white/25">LIMIT</p>
                      <p className="text-[10px] text-orange-400 font-mono font-bold">{job.max_rounds > 0 ? job.max_rounds : '∞'}</p>
                    </div>
                    <div className="p-1 rounded bg-white/[0.02]">
                      <p className="text-[7px] text-white/25">NEXT</p>
                      <p className="text-[8px] text-white/40 font-mono">{formatDateTime(job.next_execution_at)}</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => toggleJob(job.id, job.is_active)}
                      className={`flex-1 h-7 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-colors ${
                        job.is_active
                          ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {job.is_active ? <><Square className="w-2.5 h-2.5" /> PAUSE</> : <><Play className="w-2.5 h-2.5" /> RESUME</>}
                    </button>
                    <button
                      onClick={() => deleteJob(job.id)}
                      className="h-7 px-3 rounded-lg text-[9px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center gap-1 transition-colors"
                    >
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
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 space-y-1">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 text-orange-400/60" />
          <span className="text-[9px] font-bold text-white/30">HOW IT WORKS</span>
        </div>
        <ul className="text-[9px] text-white/25 space-y-0.5 pl-4 list-disc">
          <li>Server har minute check karta hai scheduled jobs</li>
          <li>Start time aane pe APIs automatically hit hoti hain</li>
          <li>Browser band hone pe bhi chalta rahega</li>
          <li>Admin me jo APIs enabled hain wohi fire hongi</li>
        </ul>
      </div>
    </div>
  );
}
