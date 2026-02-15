import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  label: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
  curved?: boolean;
  disabled?: boolean;
}

export type { FeatureCardProps };

const colorMap: Record<string, { text: string; glow: string; border: string; activeBg: string; activeShadow: string; neonVar: string }> = {
  green: { text: "text-neon-green", glow: "glow-green", border: "border-neon-green/50", activeBg: "bg-neon-green/20", activeShadow: "shadow-neon-green/40", neonVar: "--neon-green" },
  pink: { text: "text-neon-pink", glow: "glow-pink", border: "border-neon-pink/50", activeBg: "bg-neon-pink/20", activeShadow: "shadow-neon-pink/40", neonVar: "--neon-pink" },
  orange: { text: "text-neon-orange", glow: "glow-orange", border: "border-neon-orange/50", activeBg: "bg-neon-orange/20", activeShadow: "shadow-neon-orange/40", neonVar: "--neon-orange" },
  cyan: { text: "text-neon-cyan", glow: "glow-cyan", border: "border-neon-cyan/50", activeBg: "bg-neon-cyan/20", activeShadow: "shadow-neon-cyan/40", neonVar: "--neon-cyan" },
  red: { text: "text-neon-red", glow: "glow-red", border: "border-neon-red/50", activeBg: "bg-neon-red/20", activeShadow: "shadow-neon-red/40", neonVar: "--neon-red" },
  purple: { text: "text-neon-purple", glow: "glow-purple", border: "border-neon-purple/50", activeBg: "bg-neon-purple/20", activeShadow: "shadow-neon-purple/40", neonVar: "--neon-purple" },
  yellow: { text: "text-neon-yellow", glow: "glow-yellow", border: "border-neon-yellow/50", activeBg: "bg-neon-yellow/20", activeShadow: "shadow-neon-yellow/40", neonVar: "--neon-yellow" },
  blue: { text: "text-neon-blue", glow: "", border: "border-neon-blue/50", activeBg: "bg-neon-blue/20", activeShadow: "shadow-neon-blue/40", neonVar: "--neon-blue" },
  white: { text: "text-white/90", glow: "", border: "border-white/30", activeBg: "bg-white/10", activeShadow: "shadow-white/20", neonVar: "--foreground" },
  teal: { text: "text-neon-teal", glow: "", border: "border-neon-teal/50", activeBg: "bg-neon-teal/20", activeShadow: "shadow-neon-teal/40", neonVar: "--neon-teal" },
  lime: { text: "text-neon-lime", glow: "", border: "border-neon-lime/50", activeBg: "bg-neon-lime/20", activeShadow: "shadow-neon-lime/40", neonVar: "--neon-lime" },
  emerald: { text: "text-neon-emerald", glow: "glow-green", border: "border-neon-emerald/50", activeBg: "bg-neon-emerald/20", activeShadow: "shadow-neon-emerald/40", neonVar: "--neon-emerald" },
};

const FeatureCard = ({ icon: Icon, label, color, active, onClick, curved, disabled }: FeatureCardProps) => {
  const colors = colorMap[color] || colorMap.pink;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center gap-1.5 p-2 border transition-all duration-200",
        curved ? "rounded-2xl" : "rounded-xl",
        disabled && !active ? "opacity-30 grayscale" : "",
        active
          ? `${colors.activeBg} ${colors.border} border-2 ${colors.activeShadow} shadow-lg`
          : "bg-black/60 border-white/[0.08] hover:border-white/20",
        "active:scale-[0.96]"
      )}
      style={active ? {
        boxShadow: `0 0 15px hsl(var(${colors.neonVar}) / 0.5), 0 0 30px hsl(var(${colors.neonVar}) / 0.2), inset 0 0 10px hsl(var(${colors.neonVar}) / 0.1)`
      } : undefined}
    >
      {/* Icon */}
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
        active ? "bg-black/40" : "bg-white/[0.04]"
      )}>
        <Icon 
          className={cn("w-3.5 h-3.5 transition-all", colors.text, active && "animate-glow-breathe")} 
          style={active ? { filter: `drop-shadow(0 0 8px currentColor)` } : { filter: `drop-shadow(0 0 3px currentColor)` }}
        />
      </div>
      
      {/* Label */}
      <span className={cn(
        "text-[7px] font-bold tracking-wider uppercase text-center leading-tight max-w-full truncate",
        colors.text
      )} style={{ textShadow: `0 0 6px currentColor` }}>
        {label}
      </span>

      {/* Active neon dot */}
      {active && (
        <div 
          className={cn("absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full", colors.text.replace('text-', 'bg-'))}
          style={{ boxShadow: `0 0 6px currentColor, 0 0 12px currentColor` }}
        />
      )}
    </button>
  );
};

export default FeatureCard;
