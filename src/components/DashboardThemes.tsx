import SearchPanel from "@/components/SearchPanel";
import { useSettings } from "@/contexts/SettingsContext";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import CreditDisplay from "./CreditDisplay";
import AdminSettings from "./AdminSettings";

// ─────────────────────────────────────────────
// Shared bg helper
// ─────────────────────────────────────────────
const BgImage = ({ settings }: { settings: ReturnType<typeof useSettings>["settings"] }) =>
  settings.backgroundImage ? (
    <div className="absolute inset-0" style={{ backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center", opacity: parseInt(settings.backgroundOpacity || "30") / 100 }} />
  ) : null;

// ─────────────────────────────────────────────
// Theme 1 – CYBER GRID (current design)
// ─────────────────────────────────────────────
export const CyberGridTheme = () => {
  const { settings } = useSettings();
  const IconComponent = (Icons[settings.headerIcon as keyof typeof Icons] as LucideIcon) || Icons.Zap;
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "#050a0a" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && (<>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--neon-green)/0.06) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--neon-pink)/0.06) 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, hsl(var(--neon-cyan)/0.04) 0%, transparent 70%)" }} />
        </>)}
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(hsl(var(--neon-green)/0.03) 1px, transparent 1px), linear-gradient(90deg,hsl(var(--neon-cyan)/0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* Header */}
        <header className="px-3 pt-3 pb-2 sticky top-0 z-20">
          <div className="relative rounded-2xl overflow-hidden max-w-xl mx-auto" style={{ background: "rgba(5,15,12,0.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(0,255,128,0.12)", boxShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg,transparent,hsl(var(--neon-green)/0.5),hsl(var(--neon-cyan)/0.5),hsl(var(--neon-pink)/0.4),transparent)" }} />
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: "rgba(0,255,128,0.07)", border: "1px solid rgba(0,255,128,0.2)" }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(var(--neon-green))", boxShadow: "0 0 5px hsl(var(--neon-green))" }} />
                    <span className="text-[7px] font-bold tracking-wider" style={{ color: "hsl(var(--neon-green))" }}>ONLINE</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md" style={{ background: "rgba(255,20,120,0.07)", border: "1px solid rgba(255,20,120,0.2)" }}>
                    <Icons.Shield className="w-2.5 h-2.5" style={{ color: "hsl(var(--neon-pink))" }} />
                    <span className="text-[7px] font-bold tracking-wider" style={{ color: "hsl(var(--neon-pink))" }}>SECURE</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5"><CreditDisplay /><AdminSettings /></div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center mb-1">
                  {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-8 h-8 rounded-xl object-cover" /> : (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,255,200,0.07)", border: "1px solid rgba(0,255,200,0.25)" }}>
                      <IconComponent className="w-4 h-4" style={{ color: "hsl(var(--neon-cyan))", filter: "drop-shadow(0 0 5px hsl(var(--neon-cyan)/0.7))" }} />
                    </div>
                  )}
                </div>
                <h1 className="text-sm font-black tracking-[0.2em] uppercase" style={{ fontFamily: settings.headerFont || "'Orbitron',sans-serif" }}>
                  <span style={{ background: "linear-gradient(90deg,hsl(var(--neon-green)),hsl(var(--neon-cyan)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{settings.headerName1 || "SHUBH"}</span>
                  <span className="mx-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>×</span>
                  <span style={{ background: "linear-gradient(90deg,hsl(var(--neon-pink)),hsl(var(--neon-purple)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{settings.headerName2 || "OSINT"}</span>
                </h1>
                <p className="text-[7px] tracking-[0.3em] uppercase font-mono mt-0.5" style={{ color: "rgba(0,255,200,0.35)" }}>Intelligence Dashboard</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg,transparent,hsl(var(--neon-pink)/0.4),hsl(var(--neon-cyan)/0.3),transparent)" }} />
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="cyber-grid" /></main>
        <footer className="text-center py-2"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "rgba(0,255,128,0.04)", border: "1px solid hsl(var(--neon-green)/0.15)" }}><div className="w-1 h-1 bg-neon-green rounded-full animate-pulse" /><p className="text-[8px] text-white/30 font-mono tracking-widest uppercase">System Active</p></div></footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 2 – MATRIX RAIN
// ─────────────────────────────────────────────
export const MatrixRainTheme = () => {
  const { settings } = useSettings();
  const G = "rgba(0,255,0,";
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "#000800", fontFamily: "monospace" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,255,0,0.03) 0%,transparent 100%)" }} />
          {Array.from({ length: 18 }).map((_, i) => (<div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${5.5 * i + 1}%`, background: `rgba(0,200,0,${0.015 + (i % 3) * 0.01})` }} />))}
        </>}
        <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,255,0,0.008) 3px,rgba(0,255,0,0.008) 4px)" }} />
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* MATRIX HEADER – terminal prompt bar */}
        <header className="sticky top-0 z-20 px-3 pt-2 pb-2">
          <div className="max-w-xl mx-auto" style={{ background: "rgba(0,12,0,0.92)", border: `1px solid ${G}0.3)`, borderLeft: `3px solid ${G}0.8)` }}>
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: `${G}0.12)` }}>
              <div className="flex items-center gap-2">
                <span style={{ color: `${G}0.5)` }} className="text-[8px]">root@{(settings.headerName1 || "SHUBH").toLowerCase()}:</span>
                <span style={{ color: `${G}0.9)` }} className="text-[8px] font-bold">~/{(settings.headerName2 || "OSINT").toLowerCase()}</span>
                <span style={{ color: `${G}0.6)`, animation: "pulse 1s infinite" }} className="text-[10px]">█</span>
              </div>
              <div className="flex items-center gap-2"><CreditDisplay /><AdminSettings /></div>
            </div>
            <div className="px-3 py-2 flex items-center justify-between">
              <div>
                <div style={{ color: `${G}0.4)` }} className="text-[7px]">[SYS] OSINT TERMINAL v2.4 — ALL SYSTEMS NOMINAL</div>
                <div className="flex gap-3 mt-1">
                  <span style={{ color: `${G}0.7)` }} className="text-[9px] font-bold">● ONLINE</span>
                  <span style={{ color: `${G}0.5)` }} className="text-[9px]">● ENCRYPTED</span>
                  <span style={{ color: `${G}0.4)` }} className="text-[9px]">● PROXY ACTIVE</span>
                </div>
              </div>
              {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-7 h-7 object-cover" style={{ filter: "hue-rotate(120deg) saturate(2)" }} /> : (
                <div style={{ color: `${G}0.7)`, fontFamily: "monospace" }} className="text-xs font-bold">[{(settings.headerName1 || "SH")[0]}{(settings.headerName2 || "OS")[0]}]</div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="matrix-rain" /></main>
        <footer className="text-center py-2"><span style={{ color: `${G}0.25)` }} className="text-[8px] font-mono">[ MATRIX PROTOCOL ACTIVE • SESSION ENCRYPTED ]</span></footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 3 – NEON CARDS (pink/purple)
// ─────────────────────────────────────────────
export const NeonCardsTheme = () => {
  const { settings } = useSettings();
  const P = "rgba(255,0,200,";
  const V = "rgba(140,0,255,";
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "#0d000d" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full" style={{ background: `radial-gradient(circle, ${P}0.07) 0%, transparent 70%)` }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full" style={{ background: `radial-gradient(circle, ${V}0.07) 0%, transparent 70%)` }} />
          <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(45deg,transparent,transparent 60px,${P}0.018) 60px,${P}0.018) 61px)` }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* NEON SIGN STYLE HEADER */}
        <header className="sticky top-0 z-20 px-3 pt-3 pb-2">
          <div className="max-w-xl mx-auto rounded-lg overflow-hidden" style={{ background: "rgba(15,0,18,0.85)", backdropFilter: "blur(16px)", border: `2px solid ${P}0.25)`, boxShadow: `0 0 30px ${P}0.1), inset 0 0 20px ${P}0.04)` }}>
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${P}0.1)` }}>
              <div className="flex gap-2">
                <div className="px-2 py-0.5 text-[7px] font-bold tracking-wider rounded" style={{ background: `${P}0.1)`, border: `1px solid ${P}0.3)`, color: `${P}1)`, textShadow: `0 0 8px ${P}0.8)` }}>◈ LIVE</div>
                <div className="px-2 py-0.5 text-[7px] font-bold tracking-wider rounded" style={{ background: `${V}0.1)`, border: `1px solid ${V}0.3)`, color: `${V}1)` }}>SECURE</div>
              </div>
              <div className="flex items-center gap-1.5"><CreditDisplay /><AdminSettings /></div>
            </div>
            <div className="py-3 text-center">
              <div className="flex items-center justify-center gap-3 mb-1">
                {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-9 h-9 rounded-lg object-cover" style={{ boxShadow: `0 0 12px ${P}0.5)` }} /> : (
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${P}0.08)`, border: `2px solid ${P}0.3)`, boxShadow: `0 0 15px ${P}0.2)` }}>
                    <Icons.Sparkles className="w-4 h-4" style={{ color: `${P}1)`, filter: `drop-shadow(0 0 6px ${P}0.8))` }} />
                  </div>
                )}
                <div>
                  <h1 className="font-black tracking-widest uppercase" style={{ fontSize: "1rem", fontFamily: settings.headerFont || "'Orbitron',sans-serif" }}>
                    <span style={{ color: `${P}1)`, textShadow: `0 0 10px ${P}0.7), 0 0 20px ${P}0.4)` }}>{settings.headerName1 || "SHUBH"}</span>
                    <span style={{ color: "rgba(255,255,255,0.15)", margin: "0 6px" }}>✦</span>
                    <span style={{ color: `${V}1)`, textShadow: `0 0 10px ${V}0.7), 0 0 20px ${V}0.4)` }}>{settings.headerName2 || "OSINT"}</span>
                  </h1>
                  <p className="text-[7px] tracking-[0.4em] uppercase font-mono" style={{ color: `${P}0.35)` }}>Intelligence Platform</p>
                </div>
              </div>
            </div>
            <div className="h-[1px]" style={{ background: `linear-gradient(90deg,transparent,${P}0.6),${V}0.6),transparent)` }} />
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="neon-cards" /></main>
        <footer className="text-center py-2"><span style={{ color: `${P}0.25)`, textShadow: `0 0 6px ${P}0.3)` }} className="text-[8px] font-mono">◈ NEON CARDS ACTIVE ◈</span></footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 4 – MINIMAL DARK
// ─────────────────────────────────────────────
export const MinimalDarkTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "#0a0a0a" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.025) 0%, transparent 60%)" }} />}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* MINIMAL HEADER – just a thin bar */}
        <header className="sticky top-0 z-20 px-4 py-3 border-b border-white/[0.06]" style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)" }}>
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-7 h-7 rounded object-cover" /> : (
                <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Icons.Terminal className="w-3.5 h-3.5 text-white/60" />
                </div>
              )}
              <div>
                <h1 className="text-sm font-semibold text-white/90 tracking-wide" style={{ fontFamily: settings.headerFont || "inherit" }}>
                  {settings.headerName1 || "SHUBH"} <span className="text-white/30">·</span> {settings.headerName2 || "OSINT"}
                </h1>
                <p className="text-[8px] text-white/30 tracking-widest uppercase">Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[8px] text-white/30 font-mono"><span className="w-1.5 h-1.5 rounded-full bg-white/20 inline-block" />SECURE</div>
              <CreditDisplay /><AdminSettings />
            </div>
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="minimal-dark" /></main>
        <footer className="text-center py-2 border-t border-white/[0.04]"><span className="text-[8px] text-white/15 font-mono tracking-widest">— MINIMAL INTERFACE —</span></footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 5 – HOLOGRAM (cyan sci-fi)
// ─────────────────────────────────────────────
export const HologramTheme = () => {
  const { settings } = useSettings();
  const C = "rgba(0,255,255,";
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "#000d12" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 50%, ${C}0.05) 0%, transparent 70%)` }} />
          <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${C}0.02) 1px,transparent 1px),linear-gradient(90deg,${C}0.02) 1px,transparent 1px)`, backgroundSize: "30px 30px" }} />
          <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 2px,${C}0.008) 2px,${C}0.008) 4px)` }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* HOLOGRAM HEADER */}
        <header className="sticky top-0 z-20 px-3 pt-3 pb-2">
          <div className="max-w-xl mx-auto rounded-xl overflow-hidden" style={{ background: "rgba(0,20,25,0.6)", backdropFilter: "blur(20px)", border: `1px solid ${C}0.2)`, boxShadow: `0 0 40px ${C}0.06), inset 0 0 30px ${C}0.03)` }}>
            {/* Scan line */}
            <div className="h-[1px]" style={{ background: `linear-gradient(90deg,transparent,${C}0.8),transparent)` }} />
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${C}0.08)` }}>
              <div className="flex gap-2">
                <span style={{ color: `${C}0.8)`, fontSize: "7px", fontFamily: "monospace" }}>◇ SYS:ONLINE</span>
                <span style={{ color: `${C}0.5)`, fontSize: "7px", fontFamily: "monospace" }}>◇ ENCRYPTED</span>
              </div>
              <div className="flex items-center gap-1.5"><CreditDisplay /><AdminSettings /></div>
            </div>
            <div className="py-3 text-center">
              {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-10 h-10 mx-auto rounded-xl mb-2 object-cover" style={{ boxShadow: `0 0 20px ${C}0.4)`, border: `1px solid ${C}0.3)` }} /> : (
                <div className="w-10 h-10 mx-auto rounded-full mb-2 flex items-center justify-center" style={{ background: `${C}0.05)`, border: `1px solid ${C}0.3)`, boxShadow: `0 0 20px ${C}0.15), inset 0 0 10px ${C}0.05)` }}>
                  <Icons.Radar className="w-5 h-5" style={{ color: `${C}0.9)`, filter: `drop-shadow(0 0 8px ${C}0.8))` }} />
                </div>
              )}
              <h1 className="font-black tracking-[0.25em] uppercase" style={{ fontSize: "0.9rem", fontFamily: settings.headerFont || "'Orbitron',sans-serif", color: `${C}0.9)`, textShadow: `0 0 15px ${C}0.6), 0 0 30px ${C}0.3)` }}>
                {settings.headerName1 || "SHUBH"} <span style={{ color: `${C}0.25)` }}>◇</span> {settings.headerName2 || "OSINT"}
              </h1>
              <p className="text-[7px] font-mono tracking-[0.5em] uppercase mt-0.5" style={{ color: `${C}0.3)` }}>HOLOGRAPHIC DISPLAY</p>
            </div>
            <div className="h-[1px]" style={{ background: `linear-gradient(90deg,transparent,${C}0.5),transparent)` }} />
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="hologram" /></main>
        <footer className="text-center py-2"><span style={{ color: `${C}0.25)` }} className="text-[8px] font-mono">◇ HOLOGRAPHIC DISPLAY ACTIVE ◇</span></footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 6 – RETRO TERMINAL (amber CRT)
// ─────────────────────────────────────────────
export const RetroTerminalTheme = () => {
  const { settings } = useSettings();
  const A = "rgba(255,180,0,";
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "#060400", fontFamily: "monospace" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 3px,${A}0.012) 3px,${A}0.012) 4px)` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 50%, ${A}0.035) 0%, transparent 80%)` }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* RETRO TERMINAL HEADER */}
        <header className="sticky top-0 z-20 px-3 pt-2 pb-2">
          <div className="max-w-xl mx-auto" style={{ background: "rgba(6,4,0,0.96)", border: `2px solid ${A}0.3)`, boxShadow: `0 0 20px ${A}0.08), inset 0 0 20px ${A}0.03)` }}>
            {/* Title bar */}
            <div className="flex items-center justify-between px-3 py-1.5" style={{ background: `${A}0.08)`, borderBottom: `1px solid ${A}0.2)` }}>
              <div className="flex items-center gap-2">
                <span style={{ color: `${A}0.8)` }} className="text-[8px]">[ {settings.headerName1?.toUpperCase() || "SHUBH"} OSINT TERMINAL v3.0 ]</span>
              </div>
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: `${A}0.4)`, border: `1px solid ${A}0.6)` }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: `${A}0.25)`, border: `1px solid ${A}0.4)` }} />
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <div style={{ color: `${A}0.6)` }} className="text-[7px] mb-1">Microsoft(C) DOS {settings.headerName1?.toUpperCase() || "SHUBH"} Edition</div>
                  <div style={{ color: `${A}0.9)` }} className="text-[10px] font-bold">C:\{settings.headerName1?.toUpperCase() || "SHUBH"}\{settings.headerName2?.toUpperCase() || "OSINT"}&gt; <span style={{ animation: "pulse 1s infinite" }}>_</span></div>
                  <div className="flex gap-3 mt-1">
                    <span style={{ color: `${A}0.5)` }} className="text-[7px]">[ONLINE]</span>
                    <span style={{ color: `${A}0.4)` }} className="text-[7px]">[SECURE]</span>
                    <span style={{ color: `${A}0.35)` }} className="text-[7px]">[ENCRYPTED]</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-7 h-7 object-cover" style={{ filter: "sepia(1) saturate(3) hue-rotate(5deg)", border: `1px solid ${A}0.3)` }} /> : (
                    <div style={{ color: `${A}0.7)`, border: `1px solid ${A}0.3)`, padding: "4px 8px", fontSize: "10px" }}>{(settings.headerName1 || "SH")[0]}{(settings.headerName2 || "OS")[0]}</div>
                  )}
                  <CreditDisplay /><AdminSettings />
                </div>
              </div>
            </div>
            <div className="h-[1px]" style={{ background: `${A}0.25)` }} />
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="retro-terminal" /></main>
        <footer className="text-center py-2"><span style={{ color: `${A}0.25)` }} className="text-[8px] font-mono">C:\&gt; SYSTEM READY_</span></footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 7 – GLASSMORPHIC (premium blur)
// ─────────────────────────────────────────────
export const GlassmorphicTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "linear-gradient(135deg,#0a0015 0%,#000d1a 50%,#001a0a 100%)" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full blur-3xl" style={{ background: "rgba(100,0,255,0.15)" }} />
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full blur-3xl" style={{ background: "rgba(0,255,128,0.08)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(255,0,128,0.07)" }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* GLASSMORPHIC HEADER */}
        <header className="sticky top-0 z-20 px-3 pt-3 pb-2">
          <div className="max-w-xl mx-auto rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(0,255,128,0.08)", border: "1px solid rgba(0,255,128,0.15)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[7px] text-green-400/80 font-medium">Live</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Icons.Lock className="w-2.5 h-2.5 text-white/40" />
                  <span className="text-[7px] text-white/40">Secure</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5"><CreditDisplay /><AdminSettings /></div>
            </div>
            <div className="px-4 py-3 text-center">
              {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-10 h-10 mx-auto rounded-2xl mb-2 object-cover" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }} /> : (
                <div className="w-10 h-10 mx-auto rounded-2xl mb-2 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Icons.Sparkles className="w-5 h-5" style={{ background: "linear-gradient(135deg,#a855f7,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }} />
                </div>
              )}
              <h1 className="font-black uppercase tracking-[0.15em]" style={{ fontSize: "1rem", fontFamily: settings.headerFont || "inherit", background: "linear-gradient(90deg,#a855f7,#06b6d4,#22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {settings.headerName1 || "SHUBH"} · {settings.headerName2 || "OSINT"}
              </h1>
              <p className="text-[7px] text-white/20 tracking-[0.4em] uppercase mt-0.5">Intelligence Platform</p>
            </div>
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="glassmorphic" /></main>
        <footer className="text-center py-2"><span className="text-[8px] text-white/15 font-mono tracking-wider">✦ GLASS INTERFACE ✦</span></footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 8 – BRUTAL NEON (max contrast raw)
// ─────────────────────────────────────────────
export const BrutalNeonTheme = () => {
  const { settings } = useSettings();
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "#000" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute top-0 left-0 w-48 h-48" style={{ background: "radial-gradient(circle at 0% 0%,rgba(255,255,0,0.12) 0%,transparent 60%)" }} />
          <div className="absolute top-0 right-0 w-48 h-48" style={{ background: "radial-gradient(circle at 100% 0%,rgba(255,0,255,0.12) 0%,transparent 60%)" }} />
          <div className="absolute bottom-0 left-0 w-48 h-48" style={{ background: "radial-gradient(circle at 0% 100%,rgba(0,255,255,0.12) 0%,transparent 60%)" }} />
          <div className="absolute bottom-0 right-0 w-48 h-48" style={{ background: "radial-gradient(circle at 100% 100%,rgba(255,0,0,0.12) 0%,transparent 60%)" }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* BRUTAL HEADER – thick borders, loud colors */}
        <header className="sticky top-0 z-20 px-3 pt-3 pb-2">
          <div className="max-w-xl mx-auto" style={{ background: "#000", border: "3px solid rgba(255,255,0,0.7)", boxShadow: "6px 6px 0 rgba(255,0,255,0.5), -2px -2px 0 rgba(0,255,255,0.3)" }}>
            {/* Top stripe */}
            <div className="h-1.5" style={{ background: "linear-gradient(90deg,#ff0,#f0f,#0ff,#ff0)" }} />
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "2px solid rgba(255,255,0,0.3)" }}>
              <div className="flex gap-1.5">
                <div className="px-2 py-0.5 text-[7px] font-black" style={{ background: "#ff0", color: "#000" }}>● ONLINE</div>
                <div className="px-2 py-0.5 text-[7px] font-black" style={{ background: "#f0f", color: "#000" }}>SECURE</div>
              </div>
              <div className="flex items-center gap-1.5"><CreditDisplay /><AdminSettings /></div>
            </div>
            <div className="px-3 py-3 flex items-center gap-3">
              {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-10 h-10 object-cover" style={{ border: "2px solid #ff0" }} /> : (
                <div className="w-10 h-10 flex items-center justify-center" style={{ background: "#ff0", color: "#000" }}>
                  <Icons.Zap className="w-5 h-5" />
                </div>
              )}
              <div>
                <h1 className="font-black tracking-tighter uppercase leading-none" style={{ fontSize: "1.25rem", fontFamily: settings.headerFont || "Impact,sans-serif" }}>
                  <span style={{ color: "#ff0", textShadow: "0 0 10px #ff0, 2px 2px 0 #f0f" }}>{settings.headerName1 || "SHUBH"}</span>
                  <span style={{ color: "#fff", margin: "0 4px" }}>×</span>
                  <span style={{ color: "#0ff", textShadow: "0 0 10px #0ff, -2px -2px 0 #f0f" }}>{settings.headerName2 || "OSINT"}</span>
                </h1>
                <p className="text-[7px] font-bold tracking-widest uppercase" style={{ color: "#f0f", textShadow: "0 0 5px #f0f" }}>INTELLIGENCE SYSTEM</p>
              </div>
            </div>
            <div className="h-1" style={{ background: "linear-gradient(90deg,#0ff,#f0f,#ff0)" }} />
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="brutal-neon" /></main>
        <footer className="text-center py-2"><span className="text-[8px] font-black" style={{ color: "#ff0", textShadow: "0 0 8px #ff0" }}>▲ BRUTAL NEON ACTIVE ▲</span></footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 9 – COSMIC (deep space purple)
// ─────────────────────────────────────────────
export const CosmicTheme = () => {
  const { settings } = useSettings();
  const PU = "rgba(150,50,255,";
  const RO = "rgba(255,50,200,";
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "#03000f" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="absolute rounded-full" style={{ width: i % 5 === 0 ? "2px" : "1px", height: i % 5 === 0 ? "2px" : "1px", left: `${(i * 17 + i * 3.7) % 100}%`, top: `${(i * 13 + i * 2.3) % 100}%`, background: "white", opacity: 0.08 + (i % 4) * 0.06 }} />
          ))}
          <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full blur-3xl" style={{ background: `${PU}0.1)` }} />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-3xl" style={{ background: `${RO}0.07)` }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* COSMIC HEADER */}
        <header className="sticky top-0 z-20 px-3 pt-3 pb-2">
          <div className="max-w-xl mx-auto rounded-2xl overflow-hidden" style={{ background: "rgba(5,0,18,0.8)", backdropFilter: "blur(20px)", border: `1px solid ${PU}0.25)`, boxShadow: `0 0 40px ${PU}0.08), inset 0 1px 0 ${PU}0.1)` }}>
            <div className="h-[1px]" style={{ background: `linear-gradient(90deg,transparent,${PU}0.8),${RO}0.6),transparent)` }} />
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${PU}0.1)` }}>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${PU}0.1)`, border: `1px solid ${PU}0.25)` }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: `${PU}1)` }} />
                  <span style={{ color: `${PU}0.9)` }} className="text-[7px] font-bold">ONLINE</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${RO}0.08)`, border: `1px solid ${RO}0.2)` }}>
                  <Icons.Star className="w-2 h-2" style={{ color: `${RO}0.8)` }} />
                  <span style={{ color: `${RO}0.8)` }} className="text-[7px]">SECURE</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5"><CreditDisplay /><AdminSettings /></div>
            </div>
            <div className="py-3 text-center">
              {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-10 h-10 mx-auto rounded-full mb-2 object-cover" style={{ boxShadow: `0 0 20px ${PU}0.5)`, border: `1px solid ${PU}0.4)` }} /> : (
                <div className="w-10 h-10 mx-auto rounded-full mb-2 flex items-center justify-center" style={{ background: `${PU}0.08)`, border: `1px solid ${PU}0.3)`, boxShadow: `0 0 20px ${PU}0.15)` }}>
                  <Icons.Sparkles className="w-5 h-5" style={{ color: `${PU}0.9)`, filter: `drop-shadow(0 0 8px ${PU}0.7))` }} />
                </div>
              )}
              <h1 className="font-black tracking-[0.2em] uppercase" style={{ fontSize: "1rem", fontFamily: settings.headerFont || "'Orbitron',sans-serif", background: `linear-gradient(90deg,${PU}1),white,${RO}1))`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {settings.headerName1 || "SHUBH"} <span style={{ WebkitTextFillColor: `${PU}0.3)` }}>✦</span> {settings.headerName2 || "OSINT"}
              </h1>
              <p className="text-[7px] tracking-[0.5em] uppercase font-mono mt-0.5" style={{ color: `${PU}0.3)` }}>COSMIC PROTOCOL</p>
            </div>
            <div className="h-[1px]" style={{ background: `linear-gradient(90deg,transparent,${RO}0.5),${PU}0.5),transparent)` }} />
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="cosmic" /></main>
        <footer className="text-center py-2"><span style={{ color: `${PU}0.25)` }} className="text-[8px] font-mono">✦ COSMIC INTELLIGENCE ACTIVE ✦</span></footer>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Theme 10 – BLOOD HEX (red dark hacker)
// ─────────────────────────────────────────────
export const BloodHexTheme = () => {
  const { settings } = useSettings();
  const R = "rgba(200,0,0,";
  const DR = "rgba(150,0,0,";
  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden" style={{ background: "#060000" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <BgImage settings={settings} />
        {!settings.backgroundImage && <>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full" style={{ background: `radial-gradient(circle, ${R}0.09) 0%, transparent 70%)` }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full" style={{ background: `radial-gradient(circle, ${DR}0.07) 0%, transparent 70%)` }} />
          <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${R}0.025) 1px,transparent 1px),linear-gradient(90deg,${R}0.025) 1px,transparent 1px)`, backgroundSize: "25px 25px" }} />
        </>}
      </div>
      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* BLOOD HEX HEADER */}
        <header className="sticky top-0 z-20 px-3 pt-3 pb-2">
          <div className="max-w-xl mx-auto rounded-xl overflow-hidden" style={{ background: "rgba(10,0,0,0.88)", backdropFilter: "blur(16px)", border: `1px solid ${R}0.3)`, boxShadow: `0 0 30px ${R}0.08), inset 0 0 20px ${R}0.03)` }}>
            <div className="h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${R}0.9),${DR}0.9),transparent)` }} />
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${R}0.12)` }}>
              <div className="flex gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5" style={{ border: `1px solid ${R}0.3)` }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: `${R}1)`, boxShadow: `0 0 6px ${R}0.8)` }} />
                  <span style={{ color: `${R}0.9)`, fontFamily: "monospace" }} className="text-[7px] font-bold">ONLINE</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5" style={{ border: `1px solid ${DR}0.3)` }}>
                  <Icons.Skull className="w-2.5 h-2.5" style={{ color: `${DR}0.8)` }} />
                  <span style={{ color: `${DR}0.7)`, fontFamily: "monospace" }} className="text-[7px]">ARMED</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5"><CreditDisplay /><AdminSettings /></div>
            </div>
            <div className="px-3 py-3 flex items-center gap-3">
              {settings.headerCustomLogo ? <img src={settings.headerCustomLogo} alt="Logo" className="w-10 h-10 object-cover rounded" style={{ border: `2px solid ${R}0.4)`, boxShadow: `0 0 15px ${R}0.3)` }} /> : (
                <div className="w-10 h-10 flex items-center justify-center rounded" style={{ background: `${R}0.06)`, border: `2px solid ${R}0.3)`, boxShadow: `0 0 12px ${R}0.15)` }}>
                  <Icons.Skull className="w-5 h-5" style={{ color: `${R}0.9)`, filter: `drop-shadow(0 0 6px ${R}0.7))` }} />
                </div>
              )}
              <div>
                <h1 className="font-black tracking-wider uppercase" style={{ fontSize: "1rem", fontFamily: settings.headerFont || "'Orbitron',sans-serif", color: `${R}0.9)`, textShadow: `0 0 12px ${R}0.5), 0 0 25px ${R}0.25)` }}>
                  {settings.headerName1 || "SHUBH"} <span style={{ color: `${DR}0.5)` }}>⬡</span> {settings.headerName2 || "OSINT"}
                </h1>
                <p style={{ color: `${DR}0.5)`, fontFamily: "monospace" }} className="text-[7px] tracking-[0.4em] uppercase">CLASSIFIED SYSTEM</p>
              </div>
            </div>
            <div className="h-[1px]" style={{ background: `linear-gradient(90deg,transparent,${R}0.4),${DR}0.4),transparent)` }} />
          </div>
        </header>
        <main className="flex-1 pb-4"><SearchPanel theme="blood-hex" /></main>
        <footer className="text-center py-2"><span style={{ color: `${R}0.3)`, textShadow: `0 0 6px ${R}0.3)` }} className="text-[8px] font-mono">⬡ BLOOD HEX SYSTEM ACTIVE ⬡</span></footer>
      </div>
    </div>
  );
};
