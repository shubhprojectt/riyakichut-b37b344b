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
        "group relative flex flex-col items-center gap-1.5 p-2 border transition-all duration-200 bg-transparent",
        curved ? "rounded-2xl" : "rounded-xl",
        disabled && !active ? "opacity-30 grayscale cursor-not-allowed" : "active:scale-[0.96]",
        colors.border
      )}
      style={{
        boxShadow: active
          ? `0 0 8px hsl(var(${colors.neonVar}) / 0.5), inset 0 0 6px hsl(var(${colors.neonVar}) / 0.05)`
          : `0 0 3px hsl(var(${colors.neonVar}) / 0.2)`
      }}
    >
      {/* No background tint - transparent */}

      {/* Icon */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all z-10 bg-transparent">
        <Icon
          className={cn("w-3.5 h-3.5 transition-all", colors.text, active && "animate-glow-breathe")}
          style={active ? { filter: `drop-shadow(0 0 8px currentColor)` } : { filter: `drop-shadow(0 0 4px currentColor)` }}
        />
      </div>

      {/* Label */}
      <span className={cn(
        "text-[7px] font-bold tracking-wider uppercase text-center leading-tight max-w-full truncate z-10",
        colors.text
      )} style={{ textShadow: `0 0 6px currentColor` }}>
        {label}
      </span>

      {/* Active bottom bar */}
      {active && (
        <div
          className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full z-10"
          style={{
            background: `hsl(var(${colors.neonVar}))`,
            boxShadow: `0 0 6px hsl(var(${colors.neonVar})), 0 0 12px hsl(var(${colors.neonVar}))`
          }}
        />
      )}
    </button>
  );
};

export default FeatureCard;
