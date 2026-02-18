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

const neonColors = [
  { text: "text-neon-green", border: "border-neon-green/50", activeBg: "bg-neon-green/20", neonVar: "--neon-green" },
  { text: "text-neon-cyan", border: "border-neon-cyan/50", activeBg: "bg-neon-cyan/20", neonVar: "--neon-cyan" },
  { text: "text-neon-pink", border: "border-neon-pink/50", activeBg: "bg-neon-pink/20", neonVar: "--neon-pink" },
  { text: "text-neon-purple", border: "border-neon-purple/50", activeBg: "bg-neon-purple/20", neonVar: "--neon-purple" },
  { text: "text-neon-orange", border: "border-neon-orange/50", activeBg: "bg-neon-orange/20", neonVar: "--neon-orange" },
  { text: "text-neon-yellow", border: "border-neon-yellow/50", activeBg: "bg-neon-yellow/20", neonVar: "--neon-yellow" },
  { text: "text-neon-red", border: "border-neon-red/50", activeBg: "bg-neon-red/20", neonVar: "--neon-red" },
  { text: "text-neon-blue", border: "border-neon-blue/50", activeBg: "bg-neon-blue/20", neonVar: "--neon-blue" },
  { text: "text-neon-teal", border: "border-neon-teal/50", activeBg: "bg-neon-teal/20", neonVar: "--neon-teal" },
  { text: "text-neon-lime", border: "border-neon-lime/50", activeBg: "bg-neon-lime/20", neonVar: "--neon-lime" },
  { text: "text-neon-emerald", border: "border-neon-emerald/50", activeBg: "bg-neon-emerald/20", neonVar: "--neon-emerald" },
  { text: "text-neon-coral", border: "border-neon-coral/50", activeBg: "bg-neon-coral/20", neonVar: "--neon-coral" },
];

// Get a unique neon color for each tab based on its index in the grid
let tabCounter = 0;
const tabColorCache = new Map<string, number>();

const getTabColor = (label: string) => {
  if (!tabColorCache.has(label)) {
    tabColorCache.set(label, tabCounter % neonColors.length);
    tabCounter++;
  }
  return neonColors[tabColorCache.get(label)!];
};

const FeatureCard = ({ icon: Icon, label, active, onClick, curved, disabled }: FeatureCardProps) => {
  const colors = getTabColor(label);

  return (
    <button
      onClick={onClick}
      disabled={disabled && !active}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200 aspect-square",
        disabled && !active ? "opacity-30 grayscale cursor-not-allowed" : "active:scale-[0.94]",
        active
          ? `${colors.activeBg} ${colors.border}`
          : `bg-black/70 border-white/[0.07] hover:${colors.border} hover:${colors.activeBg}`
      )}
      style={active ? {
        boxShadow: `0 0 18px hsl(var(${colors.neonVar}) / 0.6), 0 0 35px hsl(var(${colors.neonVar}) / 0.2), inset 0 0 15px hsl(var(${colors.neonVar}) / 0.1)`
      } : {
        boxShadow: `inset 0 0 20px rgba(0,0,0,0.4)`
      }}
    >
      {/* Gradient bg tint */}
      <div
        className="absolute inset-0 rounded-2xl opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 40%, hsl(var(${colors.neonVar}) / 0.4), transparent 70%)` }}
      />

      {/* Icon */}
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center transition-all z-10",
        active ? "bg-black/50" : "bg-black/40"
      )}>
        <Icon
          className={cn("w-5 h-5 transition-all", colors.text, active && "animate-glow-breathe")}
          style={{ filter: active ? `drop-shadow(0 0 10px currentColor)` : `drop-shadow(0 0 4px currentColor)` }}
        />
      </div>

      {/* Label */}
      <span className={cn(
        "text-[8px] font-extrabold tracking-widest uppercase text-center leading-tight z-10 w-full px-0.5",
        colors.text
      )} style={{ textShadow: `0 0 8px currentColor` }}>
        {label}
      </span>

      {/* Active bottom glow bar */}
      {active && (
        <div
          className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full"
          style={{
            background: `hsl(var(${colors.neonVar}))`,
            boxShadow: `0 0 8px hsl(var(${colors.neonVar})), 0 0 16px hsl(var(${colors.neonVar}))`
          }}
        />
      )}
    </button>
  );
};

export default FeatureCard;
