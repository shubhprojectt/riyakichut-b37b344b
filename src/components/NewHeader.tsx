import { useSettings } from "@/contexts/SettingsContext";
import CreditDisplay from "./CreditDisplay";
import AdminSettings from "./AdminSettings";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

const NewHeader = () => {
  const { settings } = useSettings();
  
  const IconComponent = (Icons[settings.headerIcon as keyof typeof Icons] as LucideIcon) || Icons.Zap;

  return (
    <header className="relative px-3 pt-3 pb-1 sticky top-0 z-20">
      <div className="relative rounded-2xl overflow-hidden max-w-xl mx-auto animate-neon-border-rainbow border-2">
        {/* Pure black glass background */}
        <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
        
        {/* Running neon border glow lines */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon-green via-neon-cyan to-neon-pink animate-gradient-shift" style={{backgroundSize: '200% 100%'}} />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-neon-pink via-neon-purple to-neon-green animate-gradient-shift" style={{backgroundSize: '200% 100%', animationDirection: 'reverse'}} />
        <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-neon-green via-neon-cyan to-neon-pink animate-rainbow-border-y" style={{backgroundSize: '100% 400%'}} />
        <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-gradient-to-b from-neon-pink via-neon-purple to-neon-green animate-rainbow-border-y" style={{backgroundSize: '100% 400%', animationDirection: 'reverse'}} />
        
        <div className="relative p-3">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neon-green/10 border border-neon-green/40">
                <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" style={{boxShadow: '0 0 8px hsl(var(--neon-green))'}} />
                <span className="text-[7px] font-bold text-neon-green tracking-wider text-glow-green">ONLINE</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neon-pink/10 border border-neon-pink/40">
                <Icons.Shield className="w-2.5 h-2.5 text-neon-pink" style={{filter: 'drop-shadow(0 0 4px hsl(var(--neon-pink)))'}} />
                <span className="text-[7px] font-bold text-neon-pink tracking-wider text-glow-pink">SECURE</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditDisplay />
              <AdminSettings />
            </div>
          </div>

          {/* Logo + Title */}
          <div className="text-center py-1">
            <div className="inline-flex items-center justify-center mb-1">
              {settings.headerCustomLogo ? (
                <img src={settings.headerCustomLogo} alt="Logo" className="w-8 h-8 rounded-xl object-cover ring-2 ring-neon-cyan/50" style={{boxShadow: '0 0 15px hsl(var(--neon-cyan) / 0.5)'}} />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-black border-2 border-neon-cyan/50 flex items-center justify-center" style={{boxShadow: '0 0 20px hsl(var(--neon-cyan) / 0.4), inset 0 0 10px hsl(var(--neon-cyan) / 0.2)'}}>
                  <IconComponent className="w-4 h-4 text-neon-cyan animate-neon-flicker" style={{filter: 'drop-shadow(0 0 8px hsl(var(--neon-cyan)))'}} />
                </div>
              )}
            </div>
            <h1 
              className="text-sm font-black tracking-[0.2em] uppercase animate-color-cycle"
              style={{ fontFamily: settings.headerFont || "'Orbitron', sans-serif" }}
            >
              <span className="animate-color-cycle" style={{textShadow: '0 0 20px currentColor, 0 0 40px currentColor'}}>
                {settings.headerName1 || "SHUBH"}
              </span>
              <span className="mx-1 text-neon-cyan/40">×</span>
              <span className="animate-color-cycle" style={{animationDelay: '4s', textShadow: '0 0 20px currentColor, 0 0 40px currentColor'}}>
                {settings.headerName2 || "OSINT"}
              </span>
            </h1>
            <p className="text-[7px] text-neon-green/40 tracking-[0.3em] uppercase font-bold mt-0.5 font-mono" style={{textShadow: '0 0 8px hsl(var(--neon-green) / 0.4)'}}>
              Intelligence Dashboard
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default NewHeader;
