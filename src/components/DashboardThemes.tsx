import SearchPanel from "@/components/SearchPanel";
import { useSettings } from "@/contexts/SettingsContext";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import AdminSettings from "./AdminSettings";

// Shared bg helper
const BgImage = ({ settings }: { settings: ReturnType<typeof useSettings>["settings"] }) =>
  settings.backgroundImage ? (
    <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center", opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
  ) : null;

// ── Shared Header Builder ──
const PremiumHeader = ({ settings, variant }: { settings: any; variant: { bg: string; border: string; accent1: string; accent2: string; tagline: string; titleGrad1: string; titleGrad2: string; statusColor: string; statusLabel: string } }) => {
  const IconComponent = (Icons[settings.headerIcon as keyof typeof Icons] as LucideIcon) || Icons.Crown;
  return (
    <header className="sticky top-0 z-20 px-3 pt-3 pb-2">
      <div className="max-w-xl mx-auto rounded-2xl overflow-hidden" style={{ background: variant.bg, backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1px solid ${variant.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
        <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: `linear-gradient(90deg, transparent, ${variant.accent1}, ${variant.accent2}, transparent)` }} />
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${variant.statusColor}10`, border: `1px solid ${variant.statusColor}30` }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: variant.statusColor }} />
                <span className="text-[7px] font-semibold tracking-wider" style={{ color: variant.statusColor }}>{variant.statusLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5"><AdminSettings /></div>
          </div>
          <div className="text-center py-0.5">
            <div className="inline-flex items-center justify-center mb-1">
              {settings.headerCustomLogo ? (
                <img src={settings.headerCustomLogo} alt="Logo" className="w-9 h-9 rounded-xl object-cover" style={{ border: `1.5px solid ${variant.border}` }} />
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${variant.accent1}12`, border: `1.5px solid ${variant.border}` }}>
                  <IconComponent className="w-4 h-4" style={{ color: variant.accent1, filter: `drop-shadow(0 0 5px ${variant.accent1})` }} />
                </div>
              )}
            </div>
            <h1 className="text-[15px] font-extrabold tracking-[0.15em] uppercase" style={{ fontFamily: settings.headerFont || "'Syne', sans-serif" }}>
              <span style={{ background: variant.titleGrad1, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{settings.headerName1 || "NEXUS"}</span>
              <span className="mx-1.5" style={{ color: 'rgba(255,255,255,0.12)' }}>•</span>
              <span style={{ background: variant.titleGrad2, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{settings.headerName2 || "PRO"}</span>
            </h1>
            <p className="text-[7px] tracking-[0.25em] uppercase mt-0.5" style={{ color: `${variant.accent1}50`, fontFamily: "'Space Grotesk', sans-serif" }}>{variant.tagline}</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${variant.accent2}60, transparent)` }} />
      </div>
    </header>
  );
};

// ─────── Theme 1: ROYAL GOLD ───────
export const CyberGridTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#060510' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,200,100,0.06) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(200,100,255,0.05) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,200,100,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,200,100,0.4) 1px, transparent 1px)', backgroundSize: '45px 45px' }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(8,6,18,0.82)', border: 'rgba(255,200,100,0.1)', accent1: 'rgba(255,200,100,1)', accent2: 'rgba(200,100,255,0.6)', titleGrad1: 'linear-gradient(135deg, hsl(42 92% 56%), hsl(28 95% 55%))', titleGrad2: 'linear-gradient(135deg, hsl(340 72% 55%), hsl(270 70% 58%))', tagline: 'Control Center', statusColor: '#50c878', statusLabel: 'ACTIVE' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="cyber-grid" /></main>
        <footer className="text-center py-2"><span className="text-[8px] tracking-widest uppercase" style={{ color: 'rgba(255,200,100,0.2)', fontFamily: "'Space Grotesk'" }}>System Active</span></footer>
      </div>
    </div>
  );
};

// ─────── Theme 2: EMERALD MATRIX ───────
export const MatrixRainTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#020d08' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(80,200,120,0.04) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(80,200,120,0.3) 3px, rgba(80,200,120,0.3) 4px)' }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(2,13,8,0.9)', border: 'rgba(80,200,120,0.15)', accent1: 'rgba(80,200,120,1)', accent2: 'rgba(100,255,180,0.5)', titleGrad1: 'linear-gradient(135deg, #50c878, #3dd68c)', titleGrad2: 'linear-gradient(135deg, #80ffc0, #50c878)', tagline: 'Terminal Mode', statusColor: '#50c878', statusLabel: 'ONLINE' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="matrix-rain" /></main>
        <footer className="text-center py-2"><span className="text-[8px] tracking-widest" style={{ color: 'rgba(80,200,120,0.2)', fontFamily: "'Space Grotesk'" }}>[ SESSION ENCRYPTED ]</span></footer>
      </div>
    </div>
  );
};

// ─────── Theme 3: ROSE NEON ───────
export const NeonCardsTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#0d0008' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,60,130,0.06) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(200,60,255,0.05) 0%, transparent 70%)' }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(13,0,8,0.85)', border: 'rgba(255,60,130,0.15)', accent1: 'rgba(255,60,130,1)', accent2: 'rgba(200,60,255,0.6)', titleGrad1: 'linear-gradient(135deg, #ff3c82, #ff6b9d)', titleGrad2: 'linear-gradient(135deg, #c83cff, #a855f7)', tagline: 'Neon Mode', statusColor: '#ff3c82', statusLabel: 'LIVE' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="neon-cards" /></main>
        <footer className="text-center py-2"><span className="text-[8px] tracking-widest" style={{ color: 'rgba(255,60,130,0.2)' }}>◈ NEON ACTIVE ◈</span></footer>
      </div>
    </div>
  );
};

// ─────── Theme 4: MINIMAL SLATE ───────
export const MinimalDarkTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#08080a' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.02) 0%, transparent 60%)' }} />}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(8,8,10,0.95)', border: 'rgba(255,255,255,0.06)', accent1: 'rgba(200,200,220,1)', accent2: 'rgba(150,150,170,0.5)', titleGrad1: 'linear-gradient(135deg, #e0e0e8, #c0c0d0)', titleGrad2: 'linear-gradient(135deg, #a0a0b0, #808090)', tagline: 'Minimal Interface', statusColor: '#808890', statusLabel: 'READY' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="minimal-dark" /></main>
        <footer className="text-center py-2"><span className="text-[8px] tracking-widest" style={{ color: 'rgba(255,255,255,0.1)' }}>— MINIMAL —</span></footer>
      </div>
    </div>
  );
};

// ─────── Theme 5: AZURE HOLOGRAM ───────
export const HologramTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#010810' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,180,220,0.04) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(0,200,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.3) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(1,8,16,0.82)', border: 'rgba(0,200,255,0.12)', accent1: 'rgba(0,200,255,1)', accent2: 'rgba(0,150,255,0.5)', titleGrad1: 'linear-gradient(135deg, #00c8ff, #00a0e0)', titleGrad2: 'linear-gradient(135deg, #00e0ff, #40d0ff)', tagline: 'Holographic Display', statusColor: '#00c8ff', statusLabel: 'SYNCED' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="hologram" /></main>
        <footer className="text-center py-2"><span className="text-[8px] tracking-widest" style={{ color: 'rgba(0,200,255,0.2)' }}>◇ HOLOGRAM ACTIVE ◇</span></footer>
      </div>
    </div>
  );
};

// ─────── Theme 6: AMBER RETRO ───────
export const RetroTerminalTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#060400', fontFamily: "'Space Grotesk', monospace" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(255,180,0,0.03) 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.01]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,180,0,0.3) 3px, rgba(255,180,0,0.3) 4px)' }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(6,4,0,0.92)', border: 'rgba(255,180,0,0.15)', accent1: 'rgba(255,180,0,1)', accent2: 'rgba(255,220,100,0.5)', titleGrad1: 'linear-gradient(135deg, #ffb400, #ff9500)', titleGrad2: 'linear-gradient(135deg, #ffdc64, #ffb400)', tagline: 'Terminal v3.0', statusColor: '#ffb400', statusLabel: 'ONLINE' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="retro-terminal" /></main>
        <footer className="text-center py-2"><span className="text-[8px] tracking-widest" style={{ color: 'rgba(255,180,0,0.2)' }}>SYSTEM READY_</span></footer>
      </div>
    </div>
  );
};

// ─────── Theme 7: PRISM GLASS ───────
export const GlassmorphicTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #060015, #000d18, #001008)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(168,85,247,0.1)' }} />
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(255,200,100,0.06)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(255,60,130,0.05)' }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(255,255,255,0.035)', border: 'rgba(255,255,255,0.08)', accent1: 'rgba(168,85,247,1)', accent2: 'rgba(255,200,100,0.6)', titleGrad1: 'linear-gradient(90deg, #a855f7, #06b6d4)', titleGrad2: 'linear-gradient(90deg, #ffc864, #ff6b9d)', tagline: 'Glass Interface', statusColor: '#22c55e', statusLabel: 'LIVE' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="glassmorphic" /></main>
        <footer className="text-center py-2"><span className="text-[8px] tracking-widest" style={{ color: 'rgba(255,255,255,0.12)' }}>✦ PRISM GLASS ✦</span></footer>
      </div>
    </div>
  );
};

// ─────── Theme 8: ELECTRIC BRUTAL ───────
export const BrutalNeonTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#000' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute top-0 left-0 w-60 h-60" style={{ background: 'radial-gradient(circle at 0% 0%, rgba(255,220,0,0.1) 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 right-0 w-60 h-60" style={{ background: 'radial-gradient(circle at 100% 100%, rgba(255,0,200,0.1) 0%, transparent 60%)' }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(0,0,0,0.95)', border: 'rgba(255,220,0,0.4)', accent1: 'rgba(255,220,0,1)', accent2: 'rgba(255,0,200,0.7)', titleGrad1: 'linear-gradient(135deg, #ffdc00, #ff9500)', titleGrad2: 'linear-gradient(135deg, #ff00c8, #00ffff)', tagline: 'Brutal Mode', statusColor: '#ffdc00', statusLabel: 'ACTIVE' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="brutal-neon" /></main>
        <footer className="text-center py-2"><span className="text-[8px] font-bold tracking-widest" style={{ color: '#ffdc00', textShadow: '0 0 6px #ffdc00' }}>▲ BRUTAL ▲</span></footer>
      </div>
    </div>
  );
};

// ─────── Theme 9: COSMIC VIOLET ───────
export const CosmicTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#030010' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="absolute rounded-full" style={{ width: i % 5 === 0 ? '2px' : '1px', height: i % 5 === 0 ? '2px' : '1px', left: `${(i * 17 + i * 3.7) % 100}%`, top: `${(i * 13 + i * 2.3) % 100}%`, background: 'white', opacity: 0.06 + (i % 4) * 0.04 }} />
          ))}
          <div className="absolute top-0 left-1/4 w-[400px] h-[250px] rounded-full blur-3xl" style={{ background: 'rgba(120,50,220,0.08)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full blur-3xl" style={{ background: 'rgba(255,50,180,0.05)' }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(5,0,18,0.82)', border: 'rgba(120,50,220,0.15)', accent1: 'rgba(168,85,247,1)', accent2: 'rgba(255,50,180,0.5)', titleGrad1: 'linear-gradient(135deg, #a855f7, #8b5cf6)', titleGrad2: 'linear-gradient(135deg, #ff32b4, #ec4899)', tagline: 'Cosmic Hub', statusColor: '#a855f7', statusLabel: 'ONLINE' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="cosmic" /></main>
        <footer className="text-center py-2"><span className="text-[8px] tracking-widest" style={{ color: 'rgba(168,85,247,0.2)' }}>★ COSMIC ★</span></footer>
      </div>
    </div>
  );
};

// ─────── Theme 10: CRIMSON FORGE ───────
export const BloodHexTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: '#0a0000' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(200,30,30,0.04) 0%, transparent 70%)' }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        <PremiumHeader settings={settings} variant={{ bg: 'rgba(10,0,0,0.88)', border: 'rgba(200,50,50,0.15)', accent1: 'rgba(220,50,50,1)', accent2: 'rgba(255,100,60,0.5)', titleGrad1: 'linear-gradient(135deg, #dc3232, #ef4444)', titleGrad2: 'linear-gradient(135deg, #ff6b3c, #f97316)', tagline: 'Forge Mode', statusColor: '#dc3232', statusLabel: 'ARMED' }} />
        <main className="flex-1 pb-4"><SearchPanel theme="blood-hex" /></main>
        <footer className="text-center py-2"><span className="text-[8px] tracking-widest" style={{ color: 'rgba(220,50,50,0.2)' }}>⚔ CRIMSON FORGE ⚔</span></footer>
      </div>
    </div>
  );
};
