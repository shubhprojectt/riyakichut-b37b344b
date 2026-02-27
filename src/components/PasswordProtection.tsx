import { useState, type ReactNode } from "react";
import { Lock, Shield } from "lucide-react";
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

  const handleUnlock = () => {
    if (password === settings.sitePassword) {
      setIsUnlocked(true);
      sessionStorage.setItem("site_unlocked", "true");
      toast({
        title: "Access Granted",
        description: "Welcome to the platform",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Wrong password! Try again.",
        variant: "destructive",
      });
      setPassword("");
    }
  };

  // Wait for backend settings to load before deciding
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <HackerLoader />
        </div>
      </div>
    );
  }

  if (!settings.sitePasswordEnabled) {
    return <>{children}</>;
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-[20%] left-[10%] w-[200px] h-[200px] bg-pink-500/15 rounded-full blur-[80px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[200px] h-[200px] bg-cyan-400/15 rounded-full blur-[80px]" />
        
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,51,153,0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,51,153,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Lock Card */}
      <div className="relative w-full max-w-sm">
        {/* Animated border glow */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-pink-500 via-cyan-400 to-pink-500 rounded-2xl opacity-60 animate-gradient-shift bg-[length:200%_auto]" />
        
        <div className="relative bg-card/95 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          {/* Lock icon with glow */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute -inset-4 bg-pink-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-cyan-400/20 border-2 border-pink-500/40 flex items-center justify-center">
                <Lock className="w-8 h-8 text-pink-400" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-5">
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-pink-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent mb-1">
              {settings.headerName1 || "SHUBH"} {settings.headerName2 || "OSINT"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter password to continue
            </p>
          </div>

          {/* Password Input */}
          <div className="space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              className="h-12 bg-background/80 border-pink-500/30 text-foreground text-center text-base placeholder:text-muted-foreground/50 focus:border-pink-500 rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            />

            <Button
              onClick={handleUnlock}
              className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-pink-500 to-cyan-400 text-background hover:shadow-[0_0_25px_rgba(255,51,153,0.5)] transition-all active:scale-[0.98]"
            >
              UNLOCK ACCESS
            </Button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-white/5">
            <Shield className="w-3.5 h-3.5 text-pink-400/60" />
            <p className="text-[11px] text-muted-foreground/60">
              Protected Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordProtection;
