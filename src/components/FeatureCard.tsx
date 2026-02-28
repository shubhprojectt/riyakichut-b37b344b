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

const premiumColors = [
  { text: "text-neon-gold", border: "border-neon-gold/40", neonVar: "--neon-gold" },
  { text: "text-neon-pink", border: "border-neon-pink/40", neonVar: "--neon-pink" },
  { text: "text-neon-cyan", border: "border-neon-cyan/40", neonVar: "--neon-cyan" },
  { text: "text-neon-purple", border: "border-neon-purple/40", neonVar: "--neon-purple" },
  { text: "text-neon-green", border: "border-neon-green/40", neonVar: "--neon-green" },
  { text: "text-neon-orange", border: "border-neon-orange/40", neonVar: "--neon-orange" },
  { text: "text-neon-rose", border: "border-neon-rose/40", neonVar: "--neon-rose" },
  { text: "text-neon-blue", border: "border-neon-blue/40", neonVar: "--neon-blue" },
  { text: "text-neon-teal", border: "border-neon-teal/40", neonVar: "--neon-teal" },
  { text: "text-neon-coral", border: "border-neon-coral/40", neonVar: "--neon-coral" },
  { text: "text-neon-emerald", border: "border-neon-emerald/40", neonVar: "--neon-emerald" },
  { text: "text-neon-violet", border: "border-neon-violet/40", neonVar: "--neon-violet" },
];

let tabCounter = 0;
const tabColorCache = new Map<string, number>();

const getTabColor = (label: string) => {
  if (!tabColorCache.has(label)) {
    tabColorCache.set(label, tabCounter % premiumColors.length);
    tabCounter++;
  }
  return premiumColors[tabColorCache.get(label)!];
};

const FeatureCard = ({ icon: Icon, label, active, onClick, curved, disabled }: FeatureCardProps) => {
  const colors = getTabColor(label);

  return (
    <button
      onClick={onClick}
      disabled={disabled && !active}
      className={cn(
        "group relative flex flex-col items-center gap-1.5 p-2.5 border transition-all duration-300",
        curved ? "rounded-2xl" : "rounded-xl",
        disabled && !active ? "opacity-25 grayscale cursor-not-allowed" : "active:scale-[0.96] hover:scale-[1.02]",
        colors.border
      )}
      style={{
        background: active
          ? `linear-gradient(135deg, hsl(var(${colors.neonVar}) / 0.08), hsl(var(${colors.neonVar}) / 0.03))`
          : 'rgba(255,255,255,0.015)',
        boxShadow: active
          ? `0 0 12px hsl(var(${colors.neonVar}) / 0.3)`
          : 'none'
      }}
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all z-10">
        <Icon
          className={cn("w-3.5 h-3.5 transition-all", colors.text, active && "animate-glow-breathe")}
          style={active ? { filter: `drop-shadow(0 0 6px currentColor)` } : { filter: `drop-shadow(0 0 3px currentColor)` }}
        />
      </div>

      {/* Label */}
      <span className={cn(
        "text-[7px] font-semibold tracking-wider uppercase text-center leading-tight max-w-full truncate z-10",
        colors.text
      )} style={{ textShadow: active ? '0 0 6px currentColor' : 'none', opacity: active ? 1 : 0.8 }}>
        {label}
      </span>

      {/* Active indicator */}
      {active && (
        <div
          className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full z-10"
          style={{
            background: `hsl(var(${colors.neonVar}))`,
            boxShadow: `0 0 6px hsl(var(${colors.neonVar})), 0 0 10px hsl(var(${colors.neonVar}))`
          }}
        />
      )}
    </button>
  );
};

export default FeatureCard;
