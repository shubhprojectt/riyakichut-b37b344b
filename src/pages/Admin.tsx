import { useState, useEffect } from "react";
import { 
  Settings, 
  Palette, 
  Key, 
  History, 
  LayoutGrid,
  Database,
  ArrowLeft,
  Save,
  Trash2,
  RefreshCw,
  Shield,
  Eye,
  EyeOff,
  ExternalLink,
  Type,
  Upload,
  X,
  Image,
  Send,
  Camera,
  Music,
  Coins,
  Plus,
  Power,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  PhoneCall
} from "lucide-react";
import * as Icons from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";

interface PasswordRecord {
  id: string;
  password_display: string;
  total_credits: number;
  remaining_credits: number;
  is_enabled: boolean;
  is_used: boolean;
  is_unlimited: boolean;
  device_id: string | null;
  created_at: string;
  used_at: string | null;
  credit_usage?: Array<{
    id: string;
    search_type: string;
    credits_used: number;
    created_at: string;
  }>;
}

const colorOptions = [
  { value: "green", label: "Green", color: "bg-neon-green" },
  { value: "pink", label: "Pink", color: "bg-neon-pink" },
  { value: "orange", label: "Orange", color: "bg-neon-orange" },
  { value: "cyan", label: "Cyan", color: "bg-neon-cyan" },
  { value: "red", label: "Red", color: "bg-neon-red" },
  { value: "purple", label: "Purple", color: "bg-neon-purple" },
  { value: "yellow", label: "Yellow", color: "bg-neon-yellow" },
  { value: "blue", label: "Blue", color: "bg-neon-blue" },
];

const iconOptions = [
  "Zap", "Sparkles", "Shield", "Terminal", "Code", "Wifi", "Globe", 
  "Eye", "Lock", "Skull", "Bug", "Fingerprint", "Radar", "Search",
  "Database", "Server", "Cpu", "Binary", "Hash", "Key"
];

const fontOptions = [
  // Techy/Futuristic Fonts
  { value: "Orbitron", label: "Orbitron", category: "Tech" },
  { value: "Share Tech Mono", label: "Share Tech Mono", category: "Tech" },
  { value: "Courier New", label: "Courier New", category: "Mono" },
  { value: "Consolas", label: "Consolas", category: "Mono" },
  { value: "Monaco", label: "Monaco", category: "Mono" },
  { value: "Lucida Console", label: "Lucida Console", category: "Mono" },
  // Bold/Impact Fonts
  { value: "Impact", label: "Impact", category: "Bold" },
  { value: "Arial Black", label: "Arial Black", category: "Bold" },
  { value: "Trebuchet MS", label: "Trebuchet MS", category: "Bold" },
  { value: "Franklin Gothic Medium", label: "Franklin Gothic", category: "Bold" },
  // Classic Fonts
  { value: "Georgia", label: "Georgia", category: "Classic" },
  { value: "Times New Roman", label: "Times New Roman", category: "Classic" },
  { value: "Palatino Linotype", label: "Palatino", category: "Classic" },
  { value: "Book Antiqua", label: "Book Antiqua", category: "Classic" },
  // Modern/Clean Fonts
  { value: "Verdana", label: "Verdana", category: "Modern" },
  { value: "Tahoma", label: "Tahoma", category: "Modern" },
  { value: "Segoe UI", label: "Segoe UI", category: "Modern" },
  { value: "Calibri", label: "Calibri", category: "Modern" },
  { value: "Arial", label: "Arial", category: "Modern" },
  { value: "Helvetica", label: "Helvetica", category: "Modern" },
  // Stylish/Decorative
  { value: "Copperplate", label: "Copperplate", category: "Stylish" },
  { value: "Papyrus", label: "Papyrus", category: "Stylish" },
  { value: "Brush Script MT", label: "Brush Script", category: "Stylish" },
  { value: "Lucida Handwriting", label: "Lucida Hand", category: "Stylish" },
];

const headerStyleOptions = [
  // Basic Transforms
  { value: "normal", label: "Normal", category: "Basic" },
  { value: "uppercase", label: "UPPERCASE", category: "Basic" },
  { value: "lowercase", label: "lowercase", category: "Basic" },
  { value: "capitalize", label: "Capitalize", category: "Basic" },
  // Text Weight
  { value: "italic", label: "Italic", category: "Weight" },
  { value: "bold", label: "Bold", category: "Weight" },
  { value: "light", label: "Light", category: "Weight" },
  { value: "thin", label: "Thin", category: "Weight" },
  // Spacing
  { value: "wide", label: "W I D E", category: "Spacing" },
  { value: "tight", label: "Tight", category: "Spacing" },
  // Animations
  { value: "glow", label: "Glow Pulse", category: "Animate" },
  { value: "flicker", label: "Neon Flicker", category: "Animate" },
  { value: "bounce", label: "Bounce", category: "Animate" },
  { value: "shake", label: "Shake", category: "Animate" },
  { value: "pulse", label: "Pulse", category: "Animate" },
  // Effects
  { value: "shadow", label: "Shadow", category: "Effect" },
  { value: "outline", label: "Outline", category: "Effect" },
  { value: "gradient", label: "Gradient", category: "Effect" },
  { value: "glitch", label: "Glitch", category: "Effect" },
  { value: "blur", label: "Blur Hover", category: "Effect" },
];

interface SearchHistoryItem {
  id: string;
  search_type: string;
  search_query: string;
  searched_at: string;
}

const PanelCard = ({
  title,
  description,
  children,
  actions,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {(title || description || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}

      <div className="space-y-3">{children}</div>
    </div>
  );
};

// Collapsible Section Component
const Section = ({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = false
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const { settings, updateSettings, updateTab, updateTelegramTool, resetSettings, saveNow } = useSettings();
  const [showSitePassword, setShowSitePassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showAllSearchKey, setShowAllSearchKey] = useState(false);
  const [showTelegramKey, setShowTelegramKey] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");

  // Local state for editing
  const [localSitePassword, setLocalSitePassword] = useState(settings.sitePassword);
  const [localAdminPassword, setLocalAdminPassword] = useState(settings.adminPassword);
  const [localAllSearchKey, setLocalAllSearchKey] = useState(settings.allSearchAccessKey || "");
  const [localTelegramKey, setLocalTelegramKey] = useState(settings.telegramOsintAccessKey || "");

  // Credit Password Management State
  const [passwordRecords, setPasswordRecords] = useState<PasswordRecord[]>([]);
  const [isLoadingPasswords, setIsLoadingPasswords] = useState(false);
  const [newCredits, setNewCredits] = useState("50");
  const [customPassword, setCustomPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      fetchSearchHistory();
      fetchPasswords();
    }
  }, [isAuthenticated]);

  const fetchSearchHistory = async () => {
    const { data, error } = await supabase
      .from("search_history")
      .select("*")
      .order("searched_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      setSearchHistory(data);
    }
  };

  const clearSearchHistory = async () => {
    const { error } = await supabase.from("search_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) {
      setSearchHistory([]);
      toast({ title: "History Cleared", description: "All search history deleted" });
    }
  };

  // Credit Password Management Functions
  const fetchPasswords = async () => {
    setIsLoadingPasswords(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-passwords', {
        body: { action: 'list', adminPassword: adminPasswordInput }
      });
      if (error) throw error;
      setPasswordRecords(data.passwords || []);
    } catch (err) {
      console.error('Error fetching passwords:', err);
      toast({ title: "Error", description: "Failed to fetch passwords", variant: "destructive" });
    } finally {
      setIsLoadingPasswords(false);
    }
  };

  const createPassword = async () => {
    const credits = parseInt(newCredits);
    if (isNaN(credits) || credits < 1) {
      toast({ title: "Error", description: "Credits must be at least 1", variant: "destructive" });
      return;
    }
    if (customPassword && customPassword.trim().length < 4) {
      toast({ title: "Error", description: "Custom password must be at least 4 characters", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-passwords', {
        body: { 
          action: 'create', 
          adminPassword: adminPasswordInput, 
          credits,
          customPassword: customPassword.trim() || undefined
        }
      });
      if (error) throw error;
      toast({ title: "Password Created", description: `Password: ${data.password.password_display}` });
      setCustomPassword("");
      fetchPasswords();
    } catch (err) {
      toast({ title: "Error", description: "Failed to create password", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const updatePassword = async (passwordId: string, updates: { credits?: number; isEnabled?: boolean; isUnlimited?: boolean }) => {
    try {
      const { error } = await supabase.functions.invoke('admin-passwords', {
        body: { action: 'update', adminPassword: adminPasswordInput, passwordId, ...updates }
      });
      if (error) throw error;
      toast({ title: "Updated", description: "Password updated successfully" });
      fetchPasswords();
      setEditingId(null);
    } catch (err) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const deletePassword = async (passwordId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-passwords', {
        body: { action: 'delete', adminPassword: adminPasswordInput, passwordId }
      });
      if (error) throw error;
      toast({ title: "Deleted", description: "Password deleted" });
      fetchPasswords();
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const resetPassword = async (passwordId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-passwords', {
        body: { action: 'reset', adminPassword: adminPasswordInput, passwordId }
      });
      if (error) throw error;
      toast({ title: "Reset", description: "Password reset - can be used on new device" });
      fetchPasswords();
    } catch (err) {
      toast({ title: "Error", description: "Failed to reset", variant: "destructive" });
    }
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === settings.adminPassword) {
      setIsAuthenticated(true);
      toast({ title: "Access Granted", description: "Welcome to Admin Panel" });
    } else {
      toast({ title: "Access Denied", description: "Wrong admin password", variant: "destructive" });
    }
  };

  const savePasswords = () => {
    updateSettings({ 
      sitePassword: localSitePassword, 
      adminPassword: localAdminPassword,
      allSearchAccessKey: localAllSearchKey,
      telegramOsintAccessKey: localTelegramKey
    });
    toast({ title: "Saved", description: "Passwords & Access Keys updated successfully" });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">Admin Access</h1>
                <p className="text-xs text-muted-foreground">Enter admin password</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <Input
                type="password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Admin password"
                className="h-10"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              />
              <Button onClick={handleAdminLogin} className="w-full h-10">
                Login
              </Button>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full h-10">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-base font-semibold text-foreground">Admin Panel</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetSettings}>
              <RefreshCw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="relative container mx-auto px-4 py-4">
        <Tabs defaultValue="credits" className="w-full">
          <div className="sticky top-[56px] z-40 -mx-4 px-4 pb-3 pt-3 bg-background/80 backdrop-blur">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="credits">Credits</TabsTrigger>
              <TabsTrigger value="theme">Theme</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
          </div>

          {/* ── THEME TAB ── */}
          <TabsContent value="theme" className="mt-0 space-y-4">
            <Section title="Dashboard UI Theme" icon={Palette} defaultOpen>
              <PanelCard title="Choose Theme" description="Select from 10 unique dashboard styles. Changes apply instantly.">
                <div className="grid grid-cols-1 gap-3">
                  {([
                    { id: "cyber-grid",      label: "Cyber Grid",       desc: "Green + Cyan neon grid (Default)",  emoji: "🟩" },
                    { id: "matrix-rain",     label: "Matrix Rain",      desc: "Classic green rain hacker style",   emoji: "🟢" },
                    { id: "neon-cards",      label: "Neon Cards",       desc: "Pink + Purple dominant glow",       emoji: "🟣" },
                    { id: "minimal-dark",    label: "Minimal Dark",     desc: "Clean black, desaturated & calm",   emoji: "⬛" },
                    { id: "hologram",        label: "Hologram",         desc: "Cyan sci-fi holographic grid",      emoji: "🔵" },
                    { id: "retro-terminal",  label: "Retro Terminal",   desc: "Amber CRT terminal scanlines",      emoji: "🟡" },
                    { id: "glassmorphic",    label: "Glassmorphic",     desc: "Frosted glass with blur orbs",      emoji: "🪟" },
                    { id: "brutal-neon",     label: "Brutal Neon",      desc: "Max contrast, all colors raw",      emoji: "💥" },
                    { id: "cosmic",          label: "Cosmic",           desc: "Deep space purple starfield",       emoji: "🌌" },
                    { id: "blood-hex",       label: "Blood Hex",        desc: "Red hacker grid, dark blood tone",  emoji: "🔴" },
                  ] as const).map((theme) => {
                    const isActive = settings.dashboardTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => updateSettings({ dashboardTheme: theme.id })}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isActive
                            ? "border-primary bg-primary/15 shadow-lg shadow-primary/20"
                            : "border-border bg-background/50 hover:border-primary/40"
                        }`}
                      >
                        <span className="text-xl">{theme.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>{theme.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{theme.desc}</div>
                        </div>
                        {isActive && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </PanelCard>
            </Section>
          </TabsContent>

          <TabsContent value="credits" className="mt-0 space-y-4">
            {/* Credits Section */}
            <Section title="Credit Password Management" icon={Coins} defaultOpen>
              <PanelCard
                title="Credit System"
                description={
                  settings.creditSystemEnabled
                    ? "ON — Users need password to access"
                    : "OFF — Everything is free"
                }
                actions={
                  <Switch
                    checked={settings.creditSystemEnabled}
                    onCheckedChange={(checked) => updateSettings({ creditSystemEnabled: checked })}
                  />
                }
              >
                <div className="text-xs text-muted-foreground">
                  Tip: Keep this ON if you want credit-based access.
                </div>
              </PanelCard>

              <PanelCard
                title="Generate New Password"
                description="Create a new access password with credits"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Credits</label>
                    <Input
                      type="number"
                      value={newCredits}
                      onChange={(e) => setNewCredits(e.target.value)}
                      min="1"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Custom Password (optional)</label>
                    <Input
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value.toUpperCase())}
                      placeholder="AUTO"
                      className="h-10 font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[10, 50, 100, 500].map((c) => (
                    <Button
                      key={c}
                      variant={newCredits === c.toString() ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewCredits(c.toString())}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
                <Button onClick={createPassword} disabled={isCreating} className="w-full h-10">
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {customPassword ? "Create Password" : "Generate Password"}
                    </>
                  )}
                </Button>
              </PanelCard>

              <PanelCard
                title="Password List"
                description={`${passwordRecords.length} passwords`}
                actions={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchPasswords}
                    disabled={isLoadingPasswords}
                  >
                    <RefreshCw className={isLoadingPasswords ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
                    Refresh
                  </Button>
                }
              >
                {isLoadingPasswords ? (
                  <div className="text-center py-10">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                    <p className="text-xs text-muted-foreground mt-2">Loading…</p>
                  </div>
                ) : passwordRecords.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Key className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No passwords yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {passwordRecords.map((record) => (
                      <div
                        key={record.id}
                        className={`rounded-xl border p-3 ${
                          record.is_enabled
                            ? "border-border bg-background"
                            : "border-border bg-muted/30 opacity-70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-mono font-semibold tracking-widest text-foreground">
                                {record.password_display}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  navigator.clipboard.writeText(record.password_display);
                                  toast({ title: "Copied", description: "Password copied" });
                                }}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              Created: {new Date(record.created_at).toLocaleString()}
                              {record.used_at && ` • First used: ${new Date(record.used_at).toLocaleString()}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {record.is_unlimited && (
                              <span className="text-[10px] px-2 py-1 rounded-md bg-accent text-foreground font-semibold">
                                ∞ UNLIMITED
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-1 rounded-md bg-muted text-muted-foreground font-semibold">
                              {record.is_used ? "USED" : "NEW"}
                            </span>
                            <Switch
                              checked={record.is_enabled}
                              onCheckedChange={(checked) => updatePassword(record.id, { isEnabled: checked })}
                            />
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-4 gap-2">
                          <div className="rounded-lg border border-border bg-card p-2">
                            <span className="text-[10px] text-muted-foreground block">Total</span>
                            <span className="text-sm font-mono font-semibold">{record.total_credits}</span>
                          </div>
                          <div className="rounded-lg border border-border bg-card p-2">
                            <span className="text-[10px] text-muted-foreground block">Remaining</span>
                            <span className="text-sm font-mono font-semibold">{record.remaining_credits}</span>
                          </div>
                          <div className="rounded-lg border border-border bg-card p-2">
                            <span className="text-[10px] text-muted-foreground block">Used</span>
                            <span className="text-sm font-mono font-semibold">
                              {record.total_credits - record.remaining_credits}
                            </span>
                          </div>
                          <div className="rounded-lg border border-border bg-card p-2">
                            <span className="text-[10px] text-muted-foreground block">Device</span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {record.device_id ? "Bound" : "Free"}
                            </span>
                          </div>
                        </div>

                        {editingId === record.id ? (
                          <div className="mt-3 flex gap-2">
                            <Input
                              type="number"
                              value={editCredits}
                              onChange={(e) => setEditCredits(e.target.value)}
                              className="h-9"
                              placeholder="New credits"
                            />
                            <Button
                              size="sm"
                              onClick={() => updatePassword(record.id, { credits: parseInt(editCredits) })}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={record.is_unlimited ? "default" : "outline"}
                            onClick={() => updatePassword(record.id, { isUnlimited: !record.is_unlimited })}
                          >
                            {record.is_unlimited ? "Unlimited ON" : "Make Unlimited"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(record.id);
                              setEditCredits(record.remaining_credits.toString());
                            }}
                          >
                            <Coins className="w-3 h-3" /> Edit
                          </Button>
                          {record.is_used && (
                            <Button size="sm" variant="outline" onClick={() => resetPassword(record.id)}>
                              <RotateCcw className="w-3 h-3" /> Reset Device
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deletePassword(record.id)}>
                            <Trash2 className="w-3 h-3" /> Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>
            </Section>
          </TabsContent>

          <TabsContent value="tools" className="mt-0 space-y-4">
            {/* Tabs Section */}
            <Section title="Tab Configuration" icon={LayoutGrid} defaultOpen>
              <div className="space-y-3">
                {settings.tabs.map((tab) => (
                  <PanelCard
                    key={tab.id}
                    title={tab.label}
                    description={tab.searchType}
                    actions={
                      <Switch
                        checked={tab.enabled}
                        onCheckedChange={(enabled) => updateTab(tab.id, { enabled })}
                      />
                    }
                  >
                    <div className="grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Tab Name</label>
                          <Input
                            value={tab.label}
                            onChange={(e) => updateTab(tab.id, { label: e.target.value })}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Color</label>
                          <select
                            value={tab.color}
                            onChange={(e) => updateTab(tab.id, { color: e.target.value })}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            {colorOptions.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Placeholder</label>
                        <Input
                          value={tab.placeholder}
                          onChange={(e) => updateTab(tab.id, { placeholder: e.target.value })}
                          className="h-9 text-sm"
                        />
                      </div>

                      {tab.searchType !== "shubh" && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">API URL (query appended)</label>
                          <Input
                            value={tab.apiUrl}
                            onChange={(e) => updateTab(tab.id, { apiUrl: e.target.value })}
                            placeholder="https://api.example.com/search?q="
                            className="h-9 text-sm font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </PanelCard>
                ))}
              </div>
            </Section>

            {/* Keep the rest of the existing tool-related sections available under Advanced below */}
          </TabsContent>

          <TabsContent value="logs" className="mt-0 space-y-4">
            <Section title="Search History" icon={History} defaultOpen>
              <PanelCard
                title="History"
                description={`${searchHistory.length} records (latest 100)`}
                actions={
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchSearchHistory}>
                      <RefreshCw className="w-4 h-4" /> Refresh
                    </Button>
                    <Button variant="destructive" size="sm" onClick={clearSearchHistory}>
                      <Trash2 className="w-4 h-4" /> Clear
                    </Button>
                  </div>
                }
              >
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {searchHistory.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No search history yet</p>
                    </div>
                  ) : (
                    searchHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border bg-background"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {item.search_type}
                          </div>
                          <div className="text-sm font-mono text-foreground break-all">{item.search_query}</div>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(item.searched_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </PanelCard>
            </Section>
          </TabsContent>
        </Tabs>

        {/* Advanced Settings Sections */}
        <div className="mt-6 space-y-4">
          {/* Passwords & Access Keys */}
          <Section title="Passwords & Access Keys" icon={Key}>
            <PanelCard title="Admin Password" description="Change the admin panel password">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showAdminPassword ? "text" : "password"}
                    value={localAdminPassword}
                    onChange={(e) => setLocalAdminPassword(e.target.value)}
                    className="h-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button onClick={savePasswords}>
                  <Save className="w-4 h-4" /> Save
                </Button>
              </div>
            </PanelCard>

            <PanelCard title="Site Password" description="Main site access password">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-muted-foreground">Enable Site Password</span>
                <Switch
                  checked={settings.sitePasswordEnabled}
                  onCheckedChange={(checked) => updateSettings({ sitePasswordEnabled: checked })}
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showSitePassword ? "text" : "password"}
                    value={localSitePassword}
                    onChange={(e) => setLocalSitePassword(e.target.value)}
                    className="h-10 pr-10"
                    disabled={!settings.sitePasswordEnabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowSitePassword(!showSitePassword)}
                  >
                    {showSitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button onClick={savePasswords} disabled={!settings.sitePasswordEnabled}>
                  <Save className="w-4 h-4" /> Save
                </Button>
              </div>
            </PanelCard>
          </Section>

          {/* Header Customization */}
          <Section title="Header Customization" icon={Type}>
            <PanelCard title="Header Name" description="Customize the header title">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Name Part 1</label>
                  <Input
                    value={settings.headerName1 || "SHUBH"}
                    onChange={(e) => updateSettings({ headerName1: e.target.value })}
                    placeholder="SHUBH"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Name Part 2</label>
                  <Input
                    value={settings.headerName2 || "OSINT"}
                    onChange={(e) => updateSettings({ headerName2: e.target.value })}
                    placeholder="OSINT"
                    className="h-10"
                  />
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Header Colors" description="Select colors for both name parts">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Name 1 Color ({settings.headerName1 || "SHUBH"})</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => updateSettings({ headerColor1: c.value })}
                        className={`w-9 h-9 rounded-lg ${c.color} transition-all ${
                          settings.headerColor1 === c.value
                            ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                            : "hover:scale-105"
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Name 2 Color ({settings.headerName2 || "OSINT"})</label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => updateSettings({ headerColor2: c.value })}
                        className={`w-9 h-9 rounded-lg ${c.color} transition-all ${
                          settings.headerColor2 === c.value
                            ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                            : "hover:scale-105"
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Header Font" description="Select header font style">
              <select
                value={settings.headerFont || "Orbitron"}
                onChange={(e) => updateSettings({ headerFont: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {fontOptions.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label} ({f.category})
                  </option>
                ))}
              </select>
            </PanelCard>

            <PanelCard title="Header Style" description="Text animation & style">
              <select
                value={settings.headerStyle || "normal"}
                onChange={(e) => updateSettings({ headerStyle: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {headerStyleOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} ({s.category})
                  </option>
                ))}
              </select>
            </PanelCard>

            <PanelCard title="Custom Logo URL" description="Optional logo image URL">
              <Input
                value={settings.headerCustomLogo || ""}
                onChange={(e) => updateSettings({ headerCustomLogo: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="h-10"
              />
            </PanelCard>
          </Section>

          {/* Background Settings */}
          <Section title="Background Settings" icon={Image}>
            <PanelCard title="Background Image URL" description="Set custom background image">
              <Input
                value={settings.backgroundImage || ""}
                onChange={(e) => updateSettings({ backgroundImage: e.target.value })}
                placeholder="https://example.com/bg.jpg or data:image/..."
                className="h-10"
              />
              {settings.backgroundImage && (
                <div className="mt-2">
                  <img
                    src={settings.backgroundImage}
                    alt="Background preview"
                    className="w-full h-24 object-cover rounded-lg border border-border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={() => updateSettings({ backgroundImage: "" })}
                  >
                    <X className="w-4 h-4" /> Remove Background
                  </Button>
                </div>
              )}
            </PanelCard>

            <PanelCard title="Background Opacity" description="Control dark overlay visibility (0-80%)">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={parseInt(settings.backgroundOpacity) || 30}
                  onChange={(e) => updateSettings({ backgroundOpacity: e.target.value })}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12 text-right">{settings.backgroundOpacity || "30"}%</span>
              </div>
            </PanelCard>

            <PanelCard title="Section Transparency" description="Make search containers transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Transparent sections</span>
                <Switch
                  checked={settings.sectionTransparent || false}
                  onCheckedChange={(checked) => updateSettings({ sectionTransparent: checked })}
                />
              </div>
            </PanelCard>

            <PanelCard title="Border Effects" description="Enable/disable rainbow borders">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Header Rainbow Border</span>
                  <Switch
                    checked={settings.headerBorderEnabled ?? true}
                    onCheckedChange={(checked) => updateSettings({ headerBorderEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tab Container Rainbow Border</span>
                  <Switch
                    checked={settings.tabContainerBorderEnabled ?? true}
                    onCheckedChange={(checked) => updateSettings({ tabContainerBorderEnabled: checked })}
                  />
                </div>
              </div>
            </PanelCard>
          </Section>

          {/* Telegram OSINT Settings */}
          <Section title="Telegram OSINT API" icon={Send}>
            <PanelCard title="JWT Token" description="Bearer token for Telegram OSINT API (visible for editing)">
              <div className="space-y-2">
                <textarea
                  value={settings.telegramOsint?.jwtToken || ""}
                  onChange={(e) => updateSettings({ 
                    telegramOsint: { 
                      ...settings.telegramOsint, 
                      jwtToken: e.target.value 
                    } 
                  })}
                  placeholder="Enter JWT token"
                  className="w-full h-24 p-2 text-xs font-mono border rounded-md bg-background resize-none break-all"
                />
              </div>
            </PanelCard>

            <PanelCard title="Base URL" description="API base URL for Telegram OSINT">
              <Input
                value={settings.telegramOsint?.baseUrl || "https://funstat.info"}
                onChange={(e) => updateSettings({ 
                  telegramOsint: { 
                    ...settings.telegramOsint, 
                    baseUrl: e.target.value 
                  } 
                })}
                placeholder="https://funstat.info"
                className="h-10 font-mono"
              />
            </PanelCard>

            <Button 
              onClick={async () => {
                await saveNow();
                toast({ title: "Saved!", description: "Telegram OSINT settings saved successfully." });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Telegram Settings
            </Button>
          </Section>

          {/* CAM Capture Settings */}
          <Section title="CAM Capture Settings" icon={Camera}>
            <PanelCard title="Photo Settings" description="Configure photo capture parameters">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Photo Limit (0 = unlimited)</label>
                  <Input
                    type="number"
                    value={settings.camPhotoLimit}
                    onChange={(e) => updateSettings({ camPhotoLimit: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="50"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Capture Interval (ms)</label>
                  <Input
                    type="number"
                    value={settings.camCaptureInterval}
                    onChange={(e) => updateSettings({ camCaptureInterval: parseInt(e.target.value) || 500 })}
                    min="100"
                    step="100"
                    className="h-10"
                  />
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Quality Settings" description="JPEG quality and video duration">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">JPEG Quality (0.1-1.0)</label>
                  <Input
                    type="number"
                    value={settings.camQuality}
                    onChange={(e) => updateSettings({ camQuality: parseFloat(e.target.value) || 0.8 })}
                    min="0.1"
                    max="1"
                    step="0.1"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Video Duration (sec)</label>
                  <Input
                    type="number"
                    value={settings.camVideoDuration}
                    onChange={(e) => updateSettings({ camVideoDuration: parseInt(e.target.value) || 5 })}
                    min="1"
                    max="60"
                    className="h-10"
                  />
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Countdown & Redirect" description="Timer and auto-redirect settings">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Countdown Timer (sec)</label>
                  <Input
                    type="number"
                    value={settings.camCountdownTimer}
                    onChange={(e) => updateSettings({ camCountdownTimer: parseInt(e.target.value) || 5 })}
                    min="0"
                    max="30"
                    className="h-10"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Auto Redirect</span>
                    <Switch
                      checked={settings.camAutoRedirect}
                      onCheckedChange={(checked) => updateSettings({ camAutoRedirect: checked })}
                    />
                  </div>
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Redirect URL" description="URL to redirect after capture">
              <Input
                value={settings.camRedirectUrl || ""}
                onChange={(e) => updateSettings({ camRedirectUrl: e.target.value })}
                placeholder="https://google.com"
                className="h-10"
              />
            </PanelCard>

            <PanelCard title="Session ID" description="CAM session identifier">
              <Input
                value={settings.camSessionId || ""}
                onChange={(e) => updateSettings({ camSessionId: e.target.value })}
                placeholder="shubhcam01"
                className="h-10 font-mono"
              />
            </PanelCard>
          </Section>

          {/* CALL DARK Settings */}
          <Section title="CALL DARK Settings" icon={PhoneCall}>
            <PanelCard
              title="Call System"
              description={
                settings.callDarkEnabled
                  ? "ON — Users can dispatch automated calls"
                  : "OFF — Call feature disabled"
              }
              actions={
                <Switch
                  checked={settings.callDarkEnabled}
                  onCheckedChange={(checked) => updateSettings({ callDarkEnabled: checked })}
                />
              }
            >
              <div className="text-xs text-muted-foreground">
                Enable/disable the automated call feature for users.
              </div>
            </PanelCard>

            <PanelCard title="Omnidim API Key" description="Your Omnidim AI API key (kept secret)">
              <Input
                type="password"
                value={settings.callDarkApiKey || ""}
                onChange={(e) => updateSettings({ callDarkApiKey: e.target.value })}
                placeholder="Enter Omnidim API Key"
                className="h-10 font-mono"
              />
              <div className="text-xs text-muted-foreground mt-2">
                API key is never exposed to frontend. Only used in backend edge function.
              </div>
            </PanelCard>

            <PanelCard title="Agent ID" description="Omnidim Agent ID to dispatch calls">
              <Input
                value={settings.callDarkAgentId || ""}
                onChange={(e) => updateSettings({ callDarkAgentId: e.target.value })}
                placeholder="Enter Agent ID"
                className="h-10 font-mono"
              />
            </PanelCard>

            <PanelCard title="Max Call Duration" description="Maximum call duration in seconds">
              <Input
                type="number"
                value={settings.callDarkMaxDuration}
                onChange={(e) => updateSettings({ callDarkMaxDuration: parseInt(e.target.value) || 20 })}
                min="5"
                max="120"
                className="h-10"
              />
              <div className="text-xs text-muted-foreground mt-2">
                Recommended: 15-20 seconds for welcome message only.
              </div>
            </PanelCard>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default Admin;
