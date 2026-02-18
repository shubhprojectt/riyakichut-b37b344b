import { useSettings } from "@/contexts/SettingsContext";
import CreditDisplay from "./CreditDisplay";
import AdminSettings from "./AdminSettings";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

const NewHeader = () => {
  const { settings } = useSettings();
  
  const IconComponent = (Icons[settings.headerIcon as keyof typeof Icons] as LucideIcon) || Icons.Zap;

  return (
    <header className="relative px-3 pt-3 pb-2 sticky top-0 z-20">
      <div
        className="relative rounded-2xl overflow-hidden max-w-xl mx-auto"
        style={{
          background: 'rgba(5, 15, 12, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 255, 128, 0.12)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)'
        }}
      >
        {/* Top thin neon line */}
        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{background: 'linear-gradient(90deg, transparent, hsl(var(--neon-green) / 0.5), hsl(var(--neon-cyan) / 0.5), hsl(var(--neon-pink) / 0.4), transparent)'}} />

        <div className="relative p-3">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{background: 'rgba(0,255,128,0.07)', border: '1px solid rgba(0,255,128,0.2)'}}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background: 'hsl(var(--neon-green))', boxShadow: '0 0 5px hsl(var(--neon-green))'}} />
                <span className="text-[7px] font-bold tracking-wider" style={{color: 'hsl(var(--neon-green))', opacity: 0.9}}>ONLINE</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{background: 'rgba(255,20,120,0.07)', border: '1px solid rgba(255,20,120,0.2)'}}>
                <Icons.Shield className="w-2.5 h-2.5" style={{color: 'hsl(var(--neon-pink))', opacity: 0.9}} />
                <span className="text-[7px] font-bold tracking-wider" style={{color: 'hsl(var(--neon-pink))', opacity: 0.9}}>SECURE</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditDisplay />
              <AdminSettings />
            </div>
          </div>

          {/* Logo + Title */}
          <div className="text-center py-0.5">
            <div className="inline-flex items-center justify-center mb-1">
              {settings.headerCustomLogo ? (
                <img src={settings.headerCustomLogo} alt="Logo" className="w-8 h-8 rounded-xl object-cover" style={{border: '1px solid rgba(0,255,255,0.3)', boxShadow: '0 0 12px rgba(0,255,255,0.2)'}} />
              ) : (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background: 'rgba(0,255,200,0.07)', border: '1px solid rgba(0,255,200,0.25)', boxShadow: '0 0 12px rgba(0,255,200,0.15)'}}>
                  <IconComponent className="w-4 h-4" style={{color: 'hsl(var(--neon-cyan))', filter: 'drop-shadow(0 0 5px hsl(var(--neon-cyan) / 0.7))'}} />
                </div>
              )}
            </div>

            <h1
              className="text-sm font-black tracking-[0.2em] uppercase"
              style={{ fontFamily: settings.headerFont || "'Orbitron', sans-serif" }}
            >
              <span style={{
                background: 'linear-gradient(90deg, hsl(var(--neon-green)), hsl(var(--neon-cyan)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px hsl(var(--neon-green) / 0.4))'
              }}>
                {settings.headerName1 || "SHUBH"}
              </span>
              <span className="mx-1.5" style={{color: 'rgba(255,255,255,0.2)'}}>×</span>
              <span style={{
                background: 'linear-gradient(90deg, hsl(var(--neon-pink)), hsl(var(--neon-purple)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px hsl(var(--neon-pink) / 0.4))'
              }}>
                {settings.headerName2 || "OSINT"}
              </span>
            </h1>

            <p className="text-[7px] tracking-[0.3em] uppercase font-mono mt-0.5" style={{color: 'rgba(0,255,200,0.35)', letterSpacing: '0.25em'}}>
              Intelligence Dashboard
            </p>
          </div>
        </div>

        {/* Bottom thin neon line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{background: 'linear-gradient(90deg, transparent, hsl(var(--neon-pink) / 0.4), hsl(var(--neon-cyan) / 0.3), transparent)'}} />
      </div>
    </header>
  );
};

export default NewHeader;
