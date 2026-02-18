import NewHeader from "@/components/NewHeader";
import SearchPanel from "@/components/SearchPanel";
import { useSettings } from "@/contexts/SettingsContext";

// ─────────────────────────────────────────────
// Theme 1 – CYBER GRID (default – existing)
// ─────────────────────────────────────────────
export const CyberGridTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#050a0a' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--neon-green) / 0.06) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--neon-pink) / 0.06) 0%, transparent 70%)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--neon-cyan) / 0.04) 0%, transparent 70%)' }} />
          </>
        )}
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(hsl(var(--neon-green) / 0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--neon-cyan) / 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <NewHeader />
        <main className="flex-1 pb-4"><SearchPanel /></main>
        <footer className="text-center py-2 px-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(0,255,128,0.04)', border: '1px solid hsl(var(--neon-green) / 0.15)' }}>
            <div className="w-1 h-1 bg-neon-green rounded-full animate-pulse" />
            <p className="text-[8px] text-white/30 font-mono tracking-widest uppercase">System Active • Educational Purpose Only</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 2 – MATRIX RAIN
// ─────────────────────────────────────────────
export const MatrixRainTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#000800' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,255,0,0.04) 0%, transparent 100%)' }} />
            {/* Vertical green lines simulating matrix */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${5 * i}%`, background: `rgba(0,255,0,${0.02 + Math.random() * 0.04})` }} />
            ))}
            <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: 'linear-gradient(0deg, rgba(0,20,0,0.8) 0%, transparent 100%)' }} />
          </>
        )}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <div style={{ filter: 'hue-rotate(120deg) saturate(1.5)' }}>
          <NewHeader />
        </div>
        <main className="flex-1 pb-4" style={{ filter: 'hue-rotate(100deg) saturate(1.3)' }}><SearchPanel /></main>
        <footer className="text-center py-2">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(0,255,0,0.3)' }}>[ MATRIX PROTOCOL ACTIVE ]</span>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 3 – NEON CARDS (pink dominant)
// ─────────────────────────────────────────────
export const NeonCardsTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#0d000d' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <>
            <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--neon-pink) / 0.08) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--neon-purple) / 0.08) 0%, transparent 70%)' }} />
            <div className="absolute top-1/3 left-1/2 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, hsl(var(--neon-cyan) / 0.05) 0%, transparent 70%)' }} />
            {/* Diagonal lines */}
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(255,20,120,0.02) 60px, rgba(255,20,120,0.02) 61px)' }} />
          </>
        )}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <div style={{ filter: 'hue-rotate(290deg) saturate(1.2)' }}>
          <NewHeader />
        </div>
        <main className="flex-1 pb-4" style={{ filter: 'hue-rotate(270deg) saturate(1.1)' }}><SearchPanel /></main>
        <footer className="text-center py-2">
          <span className="text-[8px] font-mono" style={{ color: 'hsl(var(--neon-pink) / 0.3)' }}>◈ NEON CARDS ACTIVE ◈</span>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 4 – MINIMAL DARK (clean, subtle)
// ─────────────────────────────────────────────
export const MinimalDarkTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#0a0a0a' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 60%)' }} />
        )}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col" style={{ filter: 'saturate(0.4) brightness(0.9)' }}>
        <NewHeader />
        <main className="flex-1 pb-4"><SearchPanel /></main>
        <footer className="text-center py-2">
          <span className="text-[8px] font-mono text-white/20">— MINIMAL —</span>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 5 – HOLOGRAM (cyan/teal sci-fi)
// ─────────────────────────────────────────────
export const HologramTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#000d12' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,255,255,0.05) 0%, transparent 70%)' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(0,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.025) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            {/* Horizontal scan lines */}
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.01) 2px, rgba(0,255,255,0.01) 4px)' }} />
          </>
        )}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <div style={{ filter: 'hue-rotate(180deg) saturate(2)' }}>
          <NewHeader />
        </div>
        <main className="flex-1 pb-4" style={{ filter: 'hue-rotate(175deg) saturate(1.8)' }}><SearchPanel /></main>
        <footer className="text-center py-2">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(0,255,255,0.3)' }}>◇ HOLOGRAPHIC DISPLAY ◇</span>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 6 – RETRO TERMINAL (amber on black)
// ─────────────────────────────────────────────
export const RetroTerminalTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#080600' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <>
            {/* CRT scan lines */}
            <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,180,0,0.015) 3px, rgba(255,180,0,0.015) 4px)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,160,0,0.04) 0%, transparent 80%)' }} />
          </>
        )}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <div style={{ filter: 'sepia(1) saturate(3) hue-rotate(5deg) brightness(0.9)' }}>
          <NewHeader />
        </div>
        <main className="flex-1 pb-4" style={{ filter: 'sepia(0.8) saturate(2.5) hue-rotate(5deg)' }}><SearchPanel /></main>
        <footer className="text-center py-2">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(255,180,0,0.3)' }}>C:\TERMINAL&gt; SYSTEM READY_</span>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 7 – GLASSMORPHIC (frosted glass)
// ─────────────────────────────────────────────
export const GlassmorphicTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #0a0015 0%, #000d1a 50%, #001a0a 100%)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <>
            <div className="absolute top-10 left-10 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(100,0,255,0.15)' }} />
            <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(0,255,128,0.1)' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(255,0,128,0.08)' }} />
          </>
        )}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col backdrop-blur-sm">
        <NewHeader />
        <main className="flex-1 pb-4"><SearchPanel /></main>
        <footer className="text-center py-2">
          <span className="text-[8px] font-mono text-white/20">✦ GLASS INTERFACE ✦</span>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 8 – BRUTAL NEON (high contrast, raw)
// ─────────────────────────────────────────────
export const BrutalNeonTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#000000' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <>
            {/* Bold corner glows */}
            <div className="absolute top-0 left-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 0% 0%, rgba(255,255,0,0.12) 0%, transparent 60%)' }} />
            <div className="absolute top-0 right-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 100% 0%, rgba(255,0,255,0.12) 0%, transparent 60%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 0% 100%, rgba(0,255,255,0.12) 0%, transparent 60%)' }} />
            <div className="absolute bottom-0 right-0 w-48 h-48" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(255,0,0,0.12) 0%, transparent 60%)' }} />
          </>
        )}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <div style={{ filter: 'saturate(3) contrast(1.3)' }}>
          <NewHeader />
        </div>
        <main className="flex-1 pb-4" style={{ filter: 'saturate(2.5) contrast(1.2)' }}><SearchPanel /></main>
        <footer className="text-center py-2">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,0,0.4)', textShadow: '0 0 8px yellow' }}>▲ BRUTAL NEON ▲</span>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 9 – COSMIC (deep space purple)
// ─────────────────────────────────────────────
export const CosmicTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#03000f' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <>
            {/* Stars */}
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} className="absolute rounded-full" style={{
                width: Math.random() > 0.8 ? '2px' : '1px',
                height: Math.random() > 0.8 ? '2px' : '1px',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: 'white',
                opacity: 0.1 + Math.random() * 0.4,
              }} />
            ))}
            <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full blur-3xl" style={{ background: 'rgba(80,0,200,0.12)' }} />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-3xl" style={{ background: 'rgba(200,0,150,0.08)' }} />
          </>
        )}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <div style={{ filter: 'hue-rotate(260deg) saturate(1.8)' }}>
          <NewHeader />
        </div>
        <main className="flex-1 pb-4" style={{ filter: 'hue-rotate(250deg) saturate(1.5)' }}><SearchPanel /></main>
        <footer className="text-center py-2">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(180,100,255,0.3)' }}>✦ COSMIC PROTOCOL ✦</span>
        </footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 10 – BLOOD HEX (red hacker)
// ─────────────────────────────────────────────
export const BloodHexTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#080000' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {settings.backgroundImage ? (
          <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
        ) : (
          <>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(200,0,0,0.1) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(150,0,0,0.08) 0%, transparent 70%)' }} />
            <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(200,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(200,0,0,0.025) 1px, transparent 1px)', backgroundSize: '25px 25px' }} />
          </>
        )}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <div style={{ filter: 'hue-rotate(120deg) saturate(2) sepia(0.3)' }}>
          <NewHeader />
        </div>
        <main className="flex-1 pb-4" style={{ filter: 'hue-rotate(110deg) saturate(1.8)' }}><SearchPanel /></main>
        <footer className="text-center py-2">
          <span className="text-[8px] font-mono" style={{ color: 'rgba(200,0,0,0.4)', textShadow: '0 0 6px red' }}>⬡ BLOOD HEX SYSTEM ⬡</span>
        </footer>
      </div>
    </div>
  );
};
