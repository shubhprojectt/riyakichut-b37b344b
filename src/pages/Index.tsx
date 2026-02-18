import PasswordProtection from "@/components/PasswordProtection";
import { useSettings } from "@/contexts/SettingsContext";
import {
  CyberGridTheme,
  MatrixRainTheme,
  NeonCardsTheme,
  MinimalDarkTheme,
  HologramTheme,
  RetroTerminalTheme,
  GlassmorphicTheme,
  BrutalNeonTheme,
  CosmicTheme,
  BloodHexTheme,
} from "@/components/DashboardThemes";

const themeMap = {
  "cyber-grid": CyberGridTheme,
  "matrix-rain": MatrixRainTheme,
  "neon-cards": NeonCardsTheme,
  "minimal-dark": MinimalDarkTheme,
  "hologram": HologramTheme,
  "retro-terminal": RetroTerminalTheme,
  "glassmorphic": GlassmorphicTheme,
  "brutal-neon": BrutalNeonTheme,
  "cosmic": CosmicTheme,
  "blood-hex": BloodHexTheme,
};

const Index = () => {
  const { settings } = useSettings();
  const ThemeComponent = themeMap[settings.dashboardTheme] || CyberGridTheme;

  return (
    <PasswordProtection>
      <ThemeComponent />
    </PasswordProtection>
  );
};

export default Index;
