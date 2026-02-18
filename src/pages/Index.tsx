import NewHeader from "@/components/NewHeader";
import SearchPanel from "@/components/SearchPanel";
import PasswordProtection from "@/components/PasswordProtection";
import { useSettings } from "@/contexts/SettingsContext";

const Index = () => {
  const { settings } = useSettings();

  return (
    <PasswordProtection>
        <div className="min-h-[100dvh] relative overflow-x-hidden" style={{background: '#050a0a'}}>
        {/* Subtle background glow orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {settings.backgroundImage ? (
            <div 
              className="absolute inset-0 bg-fixed-stable"
              style={{ 
                backgroundImage: `url(${settings.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: (parseInt(settings.backgroundOpacity || "30") / 100),
                willChange: 'transform',
                transform: 'translate3d(0,0,0)'
              }}
            />
          ) : (
            <>
              {/* Very subtle, soft glow orbs */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full" style={{background: 'radial-gradient(circle, hsl(var(--neon-green) / 0.06) 0%, transparent 70%)'}} />
              <div className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full" style={{background: 'radial-gradient(circle, hsl(var(--neon-pink) / 0.06) 0%, transparent 70%)'}} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{background: 'radial-gradient(circle, hsl(var(--neon-cyan) / 0.04) 0%, transparent 70%)'}} />
            </>
          )}
          {/* Subtle grid overlay */}
          <div className="absolute inset-0" style={{backgroundImage: 'linear-gradient(hsl(var(--neon-green) / 0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon-cyan) / 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px'}} />
        </div>
        
        {/* Content */}
        <div className="relative z-10 min-h-[100dvh] flex flex-col">
          <NewHeader />
          
          <main className="flex-1 pb-4">
            <SearchPanel />
          </main>
          
          {/* Footer */}
          <footer className="text-center py-2 px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{background: 'rgba(0,255,128,0.04)', border: '1px solid hsl(var(--neon-green) / 0.15)'}}>
              <div className="w-1 h-1 bg-neon-green rounded-full animate-pulse" />
              <p className="text-[8px] text-white/30 font-mono tracking-widest uppercase">
                System Active • Educational Purpose Only
              </p>
            </div>
          </footer>
        </div>
      </div>
    </PasswordProtection>
  );
};

export default Index;
