import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useHitSiteSettings } from '@/hooks/useHitSiteSettings';

const Page3Admin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const navigate = useNavigate();
  const { settings } = useHitSiteSettings();

  const handleLogin = () => {
    if (password === settings.adminPassword) {
      sessionStorage.setItem('hitAdminAuth', 'true');
      navigate('/page3/dashboard');
    } else {
      setError('Incorrect password');
      setShake(true);
      setTimeout(() => { setError(''); setShake(false); }, 1500);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-primary/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-secondary/[0.04] rounded-full blur-[100px]" />
      </div>

      <div className={`relative z-10 w-full max-w-sm space-y-6 transition-transform ${shake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}>
        {/* Login Card - Glassmorphic Premium */}
        <div className="glass-card rounded-3xl p-8 space-y-8">
          {/* Lock Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/25 to-secondary/25 border border-primary/20 flex items-center justify-center glow-gold">
              <Lock className="w-7 h-7 text-primary/80" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Admin Access</h1>
            <p className="text-xs text-muted-foreground">Enter password to continue</p>
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="h-12 bg-background/30 border-primary/15 text-foreground text-center text-base tracking-[0.3em] placeholder:text-muted-foreground/30 placeholder:tracking-normal focus:border-primary/40 focus:ring-primary/20"
              placeholder="••••••••"
            />
            {error && (
              <p className="text-destructive/80 text-[11px] text-center">{error}</p>
            )}
          </div>

          {/* Login Button */}
          <button onClick={handleLogin}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 glow-gold">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-muted-foreground/30 text-[11px]">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
};

export default Page3Admin;
