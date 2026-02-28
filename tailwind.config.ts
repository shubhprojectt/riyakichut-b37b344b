import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['Syne', 'Rajdhani', 'sans-serif'],
        mono: ['Space Grotesk', 'monospace'],
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        neon: {
          green: "hsl(var(--neon-green))",
          pink: "hsl(var(--neon-pink))",
          orange: "hsl(var(--neon-orange))",
          cyan: "hsl(var(--neon-cyan))",
          red: "hsl(var(--neon-red))",
          purple: "hsl(var(--neon-purple))",
          yellow: "hsl(var(--neon-yellow))",
          blue: "hsl(var(--neon-blue))",
           lime: "hsl(var(--neon-lime))",
           magenta: "hsl(var(--neon-magenta))",
           teal: "hsl(var(--neon-teal))",
           coral: "hsl(var(--neon-coral))",
           gold: "hsl(var(--neon-gold))",
           violet: "hsl(var(--neon-violet))",
           aqua: "hsl(var(--neon-aqua))",
           rose: "hsl(var(--neon-rose))",
           emerald: "hsl(var(--neon-emerald))",
           sunset: "hsl(var(--neon-sunset))",
           electric: "hsl(var(--neon-electric))",
           mint: "hsl(var(--neon-mint))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "hsl(var(--neon-green))" },
          "50%": { borderColor: "hsl(var(--neon-green) / 0.5)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px currentColor, 0 0 10px currentColor" },
          "50%": { boxShadow: "0 0 15px currentColor, 0 0 25px currentColor, 0 0 35px currentColor" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "orbit-1": {
          "0%": { transform: "rotate(0deg) translateX(28px) rotate(0deg)", opacity: "0.8" },
          "50%": { opacity: "1" },
          "100%": { transform: "rotate(360deg) translateX(28px) rotate(-360deg)", opacity: "0.8" },
        },
        "orbit-2": {
          "0%": { transform: "rotate(120deg) translateX(26px) rotate(-120deg)", opacity: "0.7" },
          "50%": { opacity: "0.9" },
          "100%": { transform: "rotate(480deg) translateX(26px) rotate(-480deg)", opacity: "0.7" },
        },
        "orbit-3": {
          "0%": { transform: "rotate(240deg) translateX(30px) rotate(-240deg)", opacity: "0.75" },
          "50%": { opacity: "1" },
          "100%": { transform: "rotate(600deg) translateX(30px) rotate(-600deg)", opacity: "0.75" },
        },
        "rainbow-border": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "color-cycle": {
          "0%": { color: "hsl(var(--neon-green))" },
          "10%": { color: "hsl(var(--neon-cyan))" },
          "20%": { color: "hsl(var(--neon-blue))" },
          "30%": { color: "hsl(var(--neon-purple))" },
          "40%": { color: "hsl(var(--neon-pink))" },
          "50%": { color: "hsl(var(--neon-red))" },
          "60%": { color: "hsl(var(--neon-orange))" },
          "70%": { color: "hsl(var(--neon-yellow))" },
          "80%": { color: "hsl(var(--neon-green))" },
          "90%": { color: "hsl(var(--neon-cyan))" },
          "100%": { color: "hsl(var(--neon-green))" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        flicker: "flicker 3s ease-in-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "bounce-in": "bounce-in 0.4s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "orbit-1": "orbit-1 3s linear infinite",
        "rainbow-border": "rainbow-border 4s linear infinite",
        "orbit-2": "orbit-2 4s linear infinite",
        "orbit-3": "orbit-3 5s linear infinite",
        "color-cycle": "color-cycle 8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
