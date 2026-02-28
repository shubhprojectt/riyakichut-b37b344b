import { useEffect, useState } from "react";
import { Loader2, Crown } from "lucide-react";

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

  if (inline) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="relative">
          <div className="absolute -inset-3 rounded-full blur-xl" style={{ background: 'radial-gradient(circle, hsl(var(--neon-gold) / 0.2), transparent)' }} />
          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,200,100,0.08)', border: '1.5px solid rgba(255,200,100,0.2)' }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(var(--neon-gold))' }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'hsl(var(--neon-gold))' }} />
          <span className="text-sm font-semibold tracking-wide" style={{ color: 'hsl(var(--neon-gold))' }}>Processing{dots}</span>
        </div>
        <div className="w-40 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div 
            className="h-full rounded-full transition-all duration-75"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, hsl(var(--neon-gold)), hsl(var(--neon-pink)), hsl(var(--neon-purple)))' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
      <div className="relative flex flex-col items-center gap-6">
        {/* Ambient glow */}
        <div className="absolute -inset-16 rounded-full blur-3xl animate-pulse" style={{
          background: 'radial-gradient(circle, hsl(var(--neon-gold) / 0.15), hsl(var(--neon-purple) / 0.08), transparent)',
        }} />

        {/* Main icon ring */}
        <div className="relative">
          <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(255,200,100,0.08), rgba(200,100,255,0.05))',
            border: '1.5px solid rgba(255,200,100,0.2)',
            boxShadow: '0 0 30px rgba(255,200,100,0.1), inset 0 0 20px rgba(255,200,100,0.03)',
          }}>
            <Crown className="w-8 h-8" style={{ color: 'hsl(var(--neon-gold))', filter: 'drop-shadow(0 0 8px hsl(var(--neon-gold) / 0.5))' }} />
          </div>
          {/* Orbiting ring */}
          <div className="absolute inset-[-6px] rounded-2xl animate-spin-slow" style={{
            border: '1.5px solid transparent',
            borderTopColor: 'hsl(var(--neon-gold) / 0.6)',
            borderRightColor: 'hsl(var(--neon-pink) / 0.3)',
          }} />
        </div>

        {/* Progress */}
        <div className="w-44 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="h-full rounded-full transition-all duration-75" style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, hsl(var(--neon-gold)), hsl(var(--neon-pink)), hsl(var(--neon-purple)))',
            boxShadow: '0 0 8px hsl(var(--neon-gold) / 0.4)',
          }} />
        </div>

        <h2 className="text-xs font-semibold tracking-[0.2em] uppercase" style={{
          color: 'hsl(var(--neon-gold))',
          textShadow: '0 0 8px hsl(var(--neon-gold) / 0.4)',
          fontFamily: "'Syne', sans-serif",
        }}>
          INITIALIZING{dots}
        </h2>
      </div>
    </div>
  );
};

export default HackerLoader;
