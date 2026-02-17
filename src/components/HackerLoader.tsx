import { useEffect, useState } from "react";
import { Loader2, Shield } from "lucide-react";

interface HackerLoaderProps {
  inline?: boolean;
}

const HackerLoader = ({ inline = false }: HackerLoaderProps) => {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev >= 100 ? 0 : prev + 2));
    }, 40);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Inline compact version
  if (inline) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="relative">
          <div className="absolute -inset-3 bg-gradient-to-r from-neon-green/20 to-neon-cyan/20 rounded-full blur-xl" />
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-neon-green/15 to-neon-cyan/15 border-2 border-neon-green/40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-neon-green animate-spin" />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-sm text-neon-green font-semibold tracking-wide">Searching{dots}</span>
        </div>
        
        <div className="w-40 h-1.5 bg-muted/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Full screen version - Clean neon spinner (no image)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="relative flex flex-col items-center gap-6">
        {/* Neon glow ring spinner */}
        <div className="relative">
          <div className="absolute -inset-6 rounded-full blur-2xl animate-pulse" style={{
            background: 'radial-gradient(circle, hsl(var(--neon-purple) / 0.3), hsl(var(--neon-cyan) / 0.15), transparent)',
          }} />
          <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            border: '2px solid hsl(var(--neon-purple) / 0.4)',
            boxShadow: '0 0 25px hsl(var(--neon-purple) / 0.3), inset 0 0 15px hsl(var(--neon-purple) / 0.1)',
          }}>
            <Shield className="w-10 h-10 text-neon-purple" style={{ filter: 'drop-shadow(0 0 10px hsl(var(--neon-purple)))' }} />
          </div>
          {/* Orbiting ring */}
          <div className="absolute inset-[-8px] rounded-full animate-spin" style={{
            border: '2px solid transparent',
            borderTopColor: 'hsl(var(--neon-cyan))',
            borderRightColor: 'hsl(var(--neon-green) / 0.5)',
            animationDuration: '1.5s',
            filter: 'drop-shadow(0 0 6px hsl(var(--neon-cyan)))',
          }} />
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1 rounded-full overflow-hidden" style={{
          background: 'rgba(255,255,255,0.06)',
        }}>
          <div className="h-full rounded-full transition-all duration-75" style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, hsl(var(--neon-purple)), hsl(var(--neon-cyan)), hsl(var(--neon-green)))',
            boxShadow: '0 0 10px hsl(var(--neon-cyan) / 0.5)',
          }} />
        </div>

        {/* Loading text */}
        <h2 className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-neon-purple" style={{
          textShadow: '0 0 10px hsl(var(--neon-purple))',
        }}>
          SYSTEM LOADING{dots}
        </h2>
      </div>
    </div>
  );
};

export default HackerLoader;
