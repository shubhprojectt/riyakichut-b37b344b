import { useSettings } from "@/contexts/SettingsContext";
import CreditDisplay from "./CreditDisplay";
import AdminSettings from "./AdminSettings";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

const NewHeader = () => {
  const { settings } = useSettings();
  
  const IconComponent = (Icons[settings.headerIcon as keyof typeof Icons] as LucideIcon) || Icons.Crown;

  return (
    <header className="relative px-3 pt-3 pb-2 sticky top-0 z-20">
      <div
        className="relative rounded-2xl overflow-hidden max-w-xl mx-auto"
        style={{
          background: 'rgba(8, 6, 18, 0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 200, 100, 0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)'
        }}
      >
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{background: 'linear-gradient(90deg, transparent, hsl(var(--neon-gold) / 0.6), hsl(var(--neon-pink) / 0.5), hsl(var(--neon-purple) / 0.4), transparent)'}} />

        <div className="relative p-3">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{background: 'rgba(80,200,120,0.08)', border: '1px solid rgba(80,200,120,0.2)'}}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background: 'hsl(var(--neon-green))', boxShadow: '0 0 4px hsl(var(--neon-green))'}} />
                <span className="text-[7px] font-semibold tracking-wider" style={{color: 'hsl(var(--neon-green))', opacity: 0.85}}>ACTIVE</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{background: 'rgba(255,200,100,0.06)', border: '1px solid rgba(255,200,100,0.15)'}}>
                <Icons.Lock className="w-2.5 h-2.5" style={{color: 'hsl(var(--neon-gold))', opacity: 0.8}} />
                <span className="text-[7px] font-semibold tracking-wider" style={{color: 'hsl(var(--neon-gold))', opacity: 0.8}}>VERIFIED</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditDisplay />
              <AdminSettings />
            </div>
          </div>

          {/* Logo + Title */}
          <div className="text-center py-1">
            <div className="inline-flex items-center justify-center mb-1.5">
              {settings.headerCustomLogo ? (
                <img src={settings.headerCustomLogo} alt="Logo" className="w-9 h-9 rounded-xl object-cover" style={{border: '1.5px solid rgba(255,200,100,0.25)', boxShadow: '0 0 16px rgba(255,200,100,0.15)'}} />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, rgba(255,200,100,0.1), rgba(200,100,255,0.08))', border: '1.5px solid rgba(255,200,100,0.2)', boxShadow: '0 0 16px rgba(255,200,100,0.1)'}}>
                  <IconComponent className="w-4.5 h-4.5" style={{color: 'hsl(var(--neon-gold))', filter: 'drop-shadow(0 0 6px hsl(var(--neon-gold) / 0.5))'}} />
                </div>
              )}
            </div>

            <h1
              className="text-[15px] font-extrabold tracking-[0.15em] uppercase"
              style={{ fontFamily: settings.headerFont || "'Syne', sans-serif" }}
            >
              <span style={{
                background: 'linear-gradient(135deg, hsl(var(--neon-gold)), hsl(var(--neon-orange)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 6px hsl(var(--neon-gold) / 0.3))'
              }}>
                {settings.headerName1 || "NEXUS"}
              </span>
              <span className="mx-1.5" style={{color: 'rgba(255,255,255,0.15)'}}>•</span>
              <span style={{
                background: 'linear-gradient(135deg, hsl(var(--neon-pink)), hsl(var(--neon-purple)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 6px hsl(var(--neon-pink) / 0.3))'
              }}>
                {settings.headerName2 || "PRO"}
              </span>
            </h1>

            <p className="text-[7px] tracking-[0.25em] uppercase mt-0.5" style={{color: 'rgba(255,200,100,0.3)', fontFamily: "'Space Grotesk', sans-serif"}}>
              Control Center
            </p>
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{background: 'linear-gradient(90deg, transparent, hsl(var(--neon-pink) / 0.3), hsl(var(--neon-gold) / 0.3), transparent)'}} />
      </div>
    </header>
  );
};

export default NewHeader;
