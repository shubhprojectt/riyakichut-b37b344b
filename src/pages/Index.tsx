import NewHeader from "@/components/NewHeader";
import SearchPanel from "@/components/SearchPanel";
import PasswordProtection from "@/components/PasswordProtection";
import { useSettings } from "@/contexts/SettingsContext";

const Index = () => {
  const { settings } = useSettings();

  return (
    <PasswordProtection>
      <div className="min-h-[100dvh] relative overflow-x-hidden bg-black">
        {/* Background - pure black with neon glow orbs */}
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
              <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-neon-green/[0.08] blur-[150px]" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-neon-pink/[0.08] blur-[130px]" />
              <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-neon-cyan/[0.06] blur-[120px]" />
              <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] rounded-full bg-neon-purple/[0.06] blur-[100px]" />
            </>
          )}
        </div>
        
        {/* Content */}
        <div className="relative z-10 min-h-[100dvh] flex flex-col">
          <NewHeader />
          
          <main className="flex-1 pb-4">
            <SearchPanel />
          </main>
          
          {/* Footer */}
          <footer className="text-center py-3 px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-green/[0.05] border border-neon-green/20">
              <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse" style={{boxShadow: '0 0 8px hsl(var(--neon-green))'}} />
              <p className="text-[9px] text-neon-green/60 font-bold tracking-widest uppercase font-mono" style={{textShadow: '0 0 10px hsl(var(--neon-green) / 0.5)'}}>
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
