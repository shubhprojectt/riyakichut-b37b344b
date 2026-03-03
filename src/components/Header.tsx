import { Shield, Cpu, Zap, Radio } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import AdminSettings from "./AdminSettings";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";

const colorClasses: Record<string, { text: string; glow: string; border: string }> = {
  green: { text: "text-neon-green", glow: "text-glow-green", border: "border-neon-green" },
  pink: { text: "text-neon-pink", glow: "text-glow-pink", border: "border-neon-pink" },
  orange: { text: "text-neon-orange", glow: "", border: "border-neon-orange" },
  cyan: { text: "text-neon-cyan", glow: "text-glow-cyan", border: "border-neon-cyan" },
  red: { text: "text-neon-red", glow: "", border: "border-neon-red" },
  purple: { text: "text-neon-purple", glow: "text-glow-purple", border: "border-neon-purple" },
  yellow: { text: "text-neon-yellow", glow: "", border: "border-neon-yellow" },
};

const Header = () => {
  const { settings } = useSettings();
  
  const IconComponent = (Icons[settings.headerIcon as keyof typeof Icons] as LucideIcon) || Icons.Zap;

  const getStyleClasses = () => {
    switch (settings.headerStyle) {
      // Basic transforms
      case "uppercase": return "uppercase";
      case "lowercase": return "lowercase";
      case "capitalize": return "capitalize";
      // Weight
      case "italic": return "italic";
      case "bold": return "font-black";
      case "light": return "font-light";
      case "thin": return "font-thin";
      // Spacing
      case "wide": return "tracking-[0.5em]";
      case "tight": return "tracking-tighter";
      // Animations
      case "glow": return "animate-pulse-glow";
      case "flicker": return "animate-neon-flicker";
      case "bounce": return "animate-bounce";
      case "shake": return "animate-shake";
      case "pulse": return "animate-pulse";
      // Effects
      case "shadow": return "drop-shadow-[0_0_10px_currentColor]";
      case "outline": return "[text-shadow:_-1px_-1px_0_currentColor,_1px_-1px_0_currentColor,_-1px_1px_0_currentColor,_1px_1px_0_currentColor]";
      case "gradient": return "bg-gradient-to-r from-current via-white to-current bg-clip-text";
      case "glitch": return "animate-glitch";
      case "blur": return "hover:blur-[1px] transition-all";
      default: return "";
    }
  };

  const color1 = colorClasses[settings.headerColor1] || colorClasses.green;
  const color2 = colorClasses[settings.headerColor2] || colorClasses.pink;

  return (
    <header className="relative py-2">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between mb-3">
        {/* Left - Status Pills */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neon-green/10 border border-neon-green/40">
            <div className="w-1 h-1 bg-neon-green rounded-full animate-pulse" />
            <span className="text-[7px] font-mono font-bold text-neon-green tracking-wider">ONLINE</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neon-cyan/10 border border-neon-cyan/40">
            <Shield className="w-2 h-2 text-neon-cyan" />
            <span className="text-[7px] font-mono font-bold text-neon-cyan tracking-wider">SECURE</span>
          </div>
        </div>

        {/* Right - Settings */}
        <div className="flex items-center gap-1.5">
          <AdminSettings />
        </div>
      </div>

      {/* Main Logo Section */}
      <div className="flex flex-col items-center">
        {/* Logo with animated ring */}
        <div className="relative mb-2">
          {/* Outer glow ring */}
          <div className={`absolute -inset-1 rounded-full ${color1.border} opacity-30 animate-pulse`} 
               style={{ boxShadow: `0 0 20px hsl(var(--neon-${settings.headerColor1 || 'green'}))` }} />
          
          {/* Logo container */}
          <div className={`relative w-12 h-12 rounded-full border-2 ${color1.border} bg-background/90 backdrop-blur-sm flex items-center justify-center overflow-hidden`}
               style={{ boxShadow: `inset 0 0 15px hsl(var(--neon-${settings.headerColor1 || 'green'}) / 0.2)` }}>
            {settings.headerCustomLogo ? (
              <img 
                src={settings.headerCustomLogo} 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            ) : (
              <IconComponent className={`w-6 h-6 ${color1.text} animate-neon-flicker`} />
            )}
          </div>

          {/* Corner accents */}
          <div className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t border-l border-neon-cyan/60" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t border-r border-neon-cyan/60" />
          <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b border-l border-neon-cyan/60" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b border-r border-neon-cyan/60" />
        </div>
        
        {/* Title */}
        <h1 
          className={`text-xl md:text-2xl font-black tracking-widest ${getStyleClasses()}`}
          style={{ fontFamily: settings.headerFont }}
        >
          <span className={`${color1.text} ${color1.glow}`}>{settings.headerName1}</span>
          <span className="mx-1.5 text-muted-foreground/40">•</span>
          <span className={`${color2.text} ${color2.glow}`}>{settings.headerName2}</span>
        </h1>
        
        {/* Tagline with tech icons */}
        <div className="flex items-center gap-2 mt-1">
          <Cpu className="w-2.5 h-2.5 text-neon-cyan/60" />
          <p className="text-[8px] text-muted-foreground/70 tracking-[0.25em] uppercase font-mono">
            Intelligence • Search • Security
          </p>
          <Radio className="w-2.5 h-2.5 text-neon-pink/60" />
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        <div className="w-8 h-px bg-gradient-to-r from-transparent via-neon-green/50 to-neon-green" />
        <Zap className="w-2.5 h-2.5 text-neon-cyan animate-pulse" />
        <div className="w-12 h-px bg-gradient-to-r from-neon-cyan via-neon-pink to-neon-cyan" />
        <Zap className="w-2.5 h-2.5 text-neon-cyan animate-pulse" />
        <div className="w-8 h-px bg-gradient-to-l from-transparent via-neon-pink/50 to-neon-pink" />
      </div>
    </header>
  );
};

export default Header;