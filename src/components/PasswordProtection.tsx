import { useState, useEffect, type ReactNode } from "react";
import { Lock, Crown, Sparkles, Shield } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import HackerLoader from "@/components/HackerLoader";

interface PasswordProtectionProps {
  children: ReactNode;
}

const PasswordProtection = ({ children }: PasswordProtectionProps) => {
  const { settings, isLoaded } = useSettings();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleUnlock = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password.trim()) {
      toast({ title: "Error", description: "Please enter a password", variant: "destructive" });
      return;
    }
    if (password === settings.sitePassword) {
      setIsUnlocked(true);
      sessionStorage.setItem("site_unlocked", "true");
      toast({ title: "Welcome Back", description: "Access granted successfully" });
    } else {
      toast({ title: "Access Denied", description: "Wrong password! Try again.", variant: "destructive" });
      setPassword("");
    }
  };

  // Wait for backend settings to load
  if (!isLoaded || showLoader) {
    return <HackerLoader />;
  }

  if (!settings.sitePasswordEnabled) {
    return <>{children}</>;
  }

  if (isUnlocked || sessionStorage.getItem("site_unlocked") === "true") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(255,200,100,0.06) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 80%, rgba(200,100,255,0.05) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,100,150,0.03) 0%, transparent 50%)' }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,200,100,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,200,100,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-[280px]">
        {/* Glow */}
        <div className="absolute -inset-2 rounded-2xl blur-xl opacity-30" style={{ background: 'linear-gradient(135deg, hsl(var(--neon-gold)), hsl(var(--neon-pink)), hsl(var(--neon-purple)))' }} />
        
        {/* Animated border */}
        <div className="absolute -inset-[1.5px] rounded-2xl overflow-hidden">
          <div className="absolute inset-0 animate-gradient-flow" style={{
            background: 'linear-gradient(90deg, hsl(var(--neon-gold)), hsl(var(--neon-pink)), hsl(var(--neon-purple)), hsl(var(--neon-cyan)), hsl(var(--neon-gold)))',
            backgroundSize: '300% 100%'
          }} />
        </div>
        
        <div className="relative rounded-2xl p-5" style={{
          background: 'rgba(8, 6, 18, 0.92)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          {/* Icon */}
          <div className="flex justify-center mb-3">
            <div className="relative">
              <div className="absolute -inset-3 rounded-xl blur-xl" style={{ background: 'hsl(var(--neon-gold) / 0.15)' }} />
              <div className="relative w-12 h-12 rounded-xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, rgba(255,200,100,0.12), rgba(200,100,255,0.08))',
                border: '1.5px solid rgba(255,200,100,0.25)'
              }}>
                <Crown className="w-5 h-5" style={{ color: 'hsl(var(--neon-gold))' }} />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3" style={{ color: 'hsl(var(--neon-pink))' }} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="text-base font-extrabold tracking-wider" style={{ fontFamily: "'Syne', sans-serif" }}>
              <span className="animate-gradient-x" style={{
                background: 'linear-gradient(90deg, hsl(var(--neon-gold)), hsl(var(--neon-pink)), hsl(var(--neon-purple)), hsl(var(--neon-gold)))',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {settings.headerName1 || "NEXUS"} {settings.headerName2 || "PRO"}
              </span>
            </h1>
            <p className="text-[10px] mt-1 font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
              Enter your access key
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-10 text-center text-sm rounded-xl transition-all"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1.5px solid rgba(255,200,100,0.15)',
                color: 'hsl(var(--foreground))'
              }}
              autoFocus
            />

            <Button
              type="submit"
              disabled={!password.trim()}
              className="w-full h-10 rounded-xl text-xs font-bold tracking-wider transition-all duration-300 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--neon-gold)), hsl(var(--neon-orange)))',
                color: 'hsl(var(--background))',
                boxShadow: '0 4px 20px hsl(var(--neon-gold) / 0.3)'
              }}
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              UNLOCK ACCESS
            </Button>
          </form>

          <div className="flex items-center justify-center gap-1.5 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="w-1 h-1 rounded-full" style={{ background: 'hsl(var(--neon-gold))' }} />
            <p className="text-[9px] font-medium tracking-wide" style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}>
              Protected Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordProtection;
