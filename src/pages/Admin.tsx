import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Settings, Palette, Key, History, LayoutGrid, Database, ArrowLeft, Save,
  Trash2, RefreshCw, Shield, Eye, EyeOff, ExternalLink, Type, Upload, X,
  Image, Send, Camera, Music, Coins, Plus, Power, RotateCcw, Loader2,
  ChevronDown, ChevronUp, PhoneCall, List, Code, Download, Fingerprint, Copy, Zap, Info, LogOut
} from "lucide-react";
import * as Icons from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { useHitApis } from "@/hooks/useHitApis";
import { useHitLogs } from "@/hooks/useHitLogs";
import { useHitSiteSettings } from "@/hooks/useHitSiteSettings";
import HitEngine from "@/components/hit-engine/HitEngine";
import ApiCard from "@/components/hit-engine/ApiCard";
import ApiForm from "@/components/hit-engine/ApiForm";
import ApiImporter from "@/components/hit-engine/ApiImporter";
import LogsPanel from "@/components/hit-engine/LogsPanel";
import SiteSettingsPanel from "@/components/hit-engine/SiteSettingsPanel";
import BulkImporter from "@/components/hit-engine/BulkImporter";
import FastApiKeyManager from "@/components/hit-engine/FastApiKeyManager";
import type { HitApi } from "@/hooks/useHitApis";
import { toast as sonnerToast } from "sonner";


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
  { value: "Orbitron", label: "Orbitron", category: "Tech" },
  { value: "Share Tech Mono", label: "Share Tech Mono", category: "Tech" },
  { value: "Courier New", label: "Courier New", category: "Mono" },
  { value: "Consolas", label: "Consolas", category: "Mono" },
  { value: "Monaco", label: "Monaco", category: "Mono" },
  { value: "Lucida Console", label: "Lucida Console", category: "Mono" },
  { value: "Impact", label: "Impact", category: "Bold" },
  { value: "Arial Black", label: "Arial Black", category: "Bold" },
  { value: "Trebuchet MS", label: "Trebuchet MS", category: "Bold" },
  { value: "Franklin Gothic Medium", label: "Franklin Gothic", category: "Bold" },
  { value: "Georgia", label: "Georgia", category: "Classic" },
  { value: "Times New Roman", label: "Times New Roman", category: "Classic" },
  { value: "Palatino Linotype", label: "Palatino", category: "Classic" },
  { value: "Book Antiqua", label: "Book Antiqua", category: "Classic" },
  { value: "Verdana", label: "Verdana", category: "Modern" },
  { value: "Tahoma", label: "Tahoma", category: "Modern" },
  { value: "Segoe UI", label: "Segoe UI", category: "Modern" },
  { value: "Calibri", label: "Calibri", category: "Modern" },
  { value: "Arial", label: "Arial", category: "Modern" },
  { value: "Helvetica", label: "Helvetica", category: "Modern" },
  { value: "Copperplate", label: "Copperplate", category: "Stylish" },
  { value: "Papyrus", label: "Papyrus", category: "Stylish" },
  { value: "Brush Script MT", label: "Brush Script", category: "Stylish" },
  { value: "Lucida Handwriting", label: "Lucida Hand", category: "Stylish" },
];

const headerStyleOptions = [
  { value: "normal", label: "Normal", category: "Basic" },
  { value: "uppercase", label: "UPPERCASE", category: "Basic" },
  { value: "lowercase", label: "lowercase", category: "Basic" },
  { value: "capitalize", label: "Capitalize", category: "Basic" },
  { value: "italic", label: "Italic", category: "Weight" },
  { value: "bold", label: "Bold", category: "Weight" },
  { value: "light", label: "Light", category: "Weight" },
  { value: "thin", label: "Thin", category: "Weight" },
  { value: "wide", label: "W I D E", category: "Spacing" },
  { value: "tight", label: "Tight", category: "Spacing" },
  { value: "glow", label: "Glow Pulse", category: "Animate" },
  { value: "flicker", label: "Neon Flicker", category: "Animate" },
  { value: "bounce", label: "Bounce", category: "Animate" },
  { value: "shake", label: "Shake", category: "Animate" },
  { value: "pulse", label: "Pulse", category: "Animate" },
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
  title, description, children, actions,
}: {
  title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode;
}) => (
  <div className="glass-card rounded-2xl p-4">
    {(title || description || actions) && (
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title && <h3 className="text-sm font-bold text-foreground">{title}</h3>}
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    )}
    <div className="space-y-3">{children}</div>
  </div>
);

const Section = ({ 
  title, icon: Icon, children, defaultOpen = false
}: { 
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="overflow-hidden rounded-2xl glass-card">
      <button onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors">
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-primary/60" />
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {isOpen && <div className="px-4 pb-4 pt-2 space-y-3">{children}</div>}
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

  const { isAuthenticated, isAdmin: isAdminUser, isLoading: authLoading, user } = useAuth();

  const [localSitePassword, setLocalSitePassword] = useState(settings.sitePassword);
  const [localAdminPassword, setLocalAdminPassword] = useState(settings.adminPassword);
  const [localAllSearchKey, setLocalAllSearchKey] = useState(settings.allSearchAccessKey || "");
  const [localTelegramKey, setLocalTelegramKey] = useState(settings.telegramOsintAccessKey || "");

  // Hit Engine state
  const { apis, loading: apisLoading, addApi, updateApi, deleteApi, toggleApi, toggleAll } = useHitApis();
  const { logs, addLog, clearLogs } = useHitLogs();
  const { settings: hitSettings, updateSettings: updateHitSettings, resetSettings: resetHitSettings } = useHitSiteSettings();
  const [hitSubTab, setHitSubTab] = useState<'apis' | 'import' | 'settings'>('apis');
  const [showApiForm, setShowApiForm] = useState(false);
  const [editingApi, setEditingApi] = useState<HitApi | null>(null);
  const [allEnabled, setAllEnabled] = useState(true);

  // Signup/Login toggle state
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [loginEnabled, setLoginEnabled] = useState(true);

  useEffect(() => {
    const fetchAuthToggles = async () => {
      const { data: signupData } = await supabase.from('app_settings').select('setting_value').eq('setting_key', 'signup_enabled').maybeSingle();
      const { data: loginData } = await supabase.from('app_settings').select('setting_value').eq('setting_key', 'login_enabled').maybeSingle();
      if (signupData) setSignupEnabled(signupData.setting_value === true || signupData.setting_value === 'true' || signupData.setting_value === '"true"');
      if (loginData) setLoginEnabled(loginData.setting_value === true || loginData.setting_value === 'true' || loginData.setting_value === '"true"');
    };
    fetchAuthToggles();
  }, []);

  const toggleAuthSetting = async (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    const { data: existing } = await supabase.from('app_settings').select('id').eq('setting_key', key).maybeSingle();
    if (existing) {
      await supabase.from('app_settings').update({ setting_value: value }).eq('setting_key', key);
    } else {
      await supabase.from('app_settings').insert({ setting_key: key, setting_value: value });
    }
    toast({ title: "Updated", description: `${key.replace('_', ' ')} ${value ? 'enabled' : 'disabled'}` });
  };

  useEffect(() => {
    if (isAdminUser) { fetchSearchHistory(); }
  }, [isAdminUser]);

  const fetchSearchHistory = async () => {
    const { data, error } = await supabase.from("search_history").select("*").order("searched_at", { ascending: false }).limit(100);
    if (!error && data) setSearchHistory(data);
  };

  const clearSearchHistory = async () => {
    const { error } = await supabase.from("search_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (!error) { setSearchHistory([]); toast({ title: "History Cleared", description: "All search history deleted" }); }
  };

  const savePasswords = () => {
    updateSettings({ sitePassword: localSitePassword, adminPassword: localAdminPassword, allSearchAccessKey: localAllSearchKey, telegramOsintAccessKey: localTelegramKey });
    toast({ title: "Saved", description: "Passwords & Access Keys updated successfully" });
  };

  // Hit Engine handlers
  const handleAddApi = (data: Omit<HitApi, 'id'>) => { addApi(data); setShowApiForm(false); };
  const handleEditApi = (data: Omit<HitApi, 'id'>) => { if (editingApi) { updateApi(editingApi.id, data); setEditingApi(null); } };
  const handleImport = (data: Omit<HitApi, 'id'>) => { addApi(data); };
  const handleBulkImport = async (apiList: Omit<HitApi, 'id'>[]) => {
    let count = 0;
    for (const api of apiList) { await addApi(api); count++; }
    sonnerToast.success(`${count} APIs imported successfully!`);
  };
  const handleExportAll = () => {
    if (apis.length === 0) { sonnerToast.error('No APIs to export'); return; }
    const exportData = apis.map(({ id, fail_count, ...rest }) => ({ ...rest, fail_count: 0 }));
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hit-apis-export-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    sonnerToast.success(`${apis.length} APIs exported!`);
  };
  const handleDeleteAll = async () => {
    try {
      const { error } = await supabase.from('hit_apis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      sonnerToast.success(`All ${apis.length} APIs deleted!`);
    } catch (err) {
      console.error('Failed to delete all:', err);
      sonnerToast.error('Failed to delete all APIs');
    }
  };
  const handleToggleAll = (enabled: boolean) => { setAllEnabled(enabled); toggleAll(enabled); };

  // Auth check - must be admin
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-primary/[0.05] rounded-full blur-[120px]" />
        </div>
        <div className="w-full max-w-sm relative z-10">
          <div className="glass-card rounded-3xl p-5 text-center">
            <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-base font-bold text-foreground mb-2">Admin Access</h1>
            <p className="text-xs text-muted-foreground mb-4">Please login first</p>
            <Button onClick={() => navigate("/login")} className="w-full h-10 bg-gradient-to-r from-primary to-secondary text-primary-foreground">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdminUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-primary/[0.05] rounded-full blur-[120px]" />
        </div>
        <div className="w-full max-w-sm relative z-10">
          <div className="glass-card rounded-3xl p-5 text-center">
            <Shield className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h1 className="text-base font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-xs text-muted-foreground mb-4">You don't have admin permissions.<br/>Email: {user?.email}</p>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full h-10 glass-card border-border/30">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-secondary/[0.03] blur-[120px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 glass-card border-b border-border/30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-base font-bold text-foreground">Admin Panel</h1>
          </div>
          <Button variant="outline" size="sm" onClick={resetSettings} className="glass-card border-border/30">
            <RefreshCw className="w-4 h-4" /> Reset
          </Button>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-4">
        <Tabs defaultValue="theme" className="w-full">
          <div className="sticky top-[56px] z-40 -mx-4 px-4 pb-3 pt-3 bg-background">
            <TabsList className="w-full grid grid-cols-4 glass-card rounded-xl h-11">
              <TabsTrigger value="theme" className="rounded-lg text-xs font-semibold">Theme</TabsTrigger>
              <TabsTrigger value="tools" className="rounded-lg text-xs font-semibold">Tools</TabsTrigger>
              <TabsTrigger value="hitengine" className="rounded-lg text-xs font-semibold">Hit Engine</TabsTrigger>
              <TabsTrigger value="logs" className="rounded-lg text-xs font-semibold">Logs</TabsTrigger>
            </TabsList>
          </div>

          {/* ── THEME TAB ── */}
          <TabsContent value="theme" className="mt-0 space-y-4">
            <Section title="Dashboard UI Theme" icon={Palette} defaultOpen>
              <PanelCard title="Choose Theme" description="Select from 10 unique dashboard styles.">
                <div className="grid grid-cols-1 gap-3">
                  {([
                    { id: "cyber-grid", label: "Cyber Grid", desc: "Green + Cyan neon grid (Default)", emoji: "🟩" },
                    { id: "matrix-rain", label: "Matrix Rain", desc: "Classic green rain hacker style", emoji: "🟢" },
                    { id: "neon-cards", label: "Neon Cards", desc: "Pink + Purple dominant glow", emoji: "🟣" },
                    { id: "minimal-dark", label: "Minimal Dark", desc: "Clean black, desaturated & calm", emoji: "⬛" },
                    { id: "hologram", label: "Hologram", desc: "Cyan sci-fi holographic grid", emoji: "🔵" },
                    { id: "retro-terminal", label: "Retro Terminal", desc: "Amber CRT terminal scanlines", emoji: "🟡" },
                    { id: "glassmorphic", label: "Glassmorphic", desc: "Frosted glass with blur orbs", emoji: "🪟" },
                    { id: "brutal-neon", label: "Brutal Neon", desc: "Max contrast, all colors raw", emoji: "💥" },
                    { id: "cosmic", label: "Cosmic", desc: "Deep space purple starfield", emoji: "🌌" },
                    { id: "blood-hex", label: "Blood Hex", desc: "Red hacker grid, dark blood tone", emoji: "🔴" },
                  ] as const).map((theme) => {
                    const isActive = settings.dashboardTheme === theme.id;
                    return (
                      <button key={theme.id} onClick={() => updateSettings({ dashboardTheme: theme.id })}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isActive ? "border-primary/40 bg-primary/10 glow-gold" : "glass-card hover:border-primary/20"
                        }`}>
                        <span className="text-xl">{theme.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold ${isActive ? "text-primary" : "text-foreground"}`}>{theme.label}</div>
                          <div className="text-xs text-muted-foreground truncate">{theme.desc}</div>
                        </div>
                        {isActive && <div className="w-2 h-2 rounded-full bg-primary shrink-0 glow-gold" />}
                      </button>
                    );
                  })}
                </div>
              </PanelCard>
            </Section>
          </TabsContent>

          {/* ── TOOLS TAB ── */}
          <TabsContent value="tools" className="mt-0 space-y-4">
            {/* Auth Controls */}
            <Section title="Auth Controls" icon={Shield} defaultOpen>
              <PanelCard title="Signup & Login" description="Control website registration and login access">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-background/30">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Signup</p>
                      <p className="text-[10px] text-muted-foreground">New users can create accounts</p>
                    </div>
                    <Switch checked={signupEnabled} onCheckedChange={(v) => toggleAuthSetting('signup_enabled', v, setSignupEnabled)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-background/30">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Login</p>
                      <p className="text-[10px] text-muted-foreground">Existing users can sign in</p>
                    </div>
                    <Switch checked={loginEnabled} onCheckedChange={(v) => toggleAuthSetting('login_enabled', v, setLoginEnabled)} />
                  </div>
                </div>
              </PanelCard>
            </Section>
            <Section title="Tab Configuration" icon={LayoutGrid} defaultOpen>
              <div className="space-y-3">
                {settings.tabs.map((tab) => (
                  <PanelCard key={tab.id} title={tab.label} description={tab.searchType}
                    actions={<Switch checked={tab.enabled} onCheckedChange={(enabled) => updateTab(tab.id, { enabled })} />}>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Tab Name</label>
                          <Input value={tab.label} onChange={(e) => updateTab(tab.id, { label: e.target.value })} className="h-9 text-sm bg-background/30 border-border/30" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Color</label>
                          <select value={tab.color} onChange={(e) => updateTab(tab.id, { color: e.target.value })}
                            className="w-full h-9 rounded-md border border-border/30 bg-background/30 px-3 text-sm">
                            {colorOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Placeholder</label>
                        <Input value={tab.placeholder} onChange={(e) => updateTab(tab.id, { placeholder: e.target.value })} className="h-9 text-sm bg-background/30 border-border/30" />
                      </div>
                      {tab.searchType !== "shubh" && (
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">API URL (query appended)</label>
                          <Input value={tab.apiUrl} onChange={(e) => updateTab(tab.id, { apiUrl: e.target.value })} placeholder="https://api.example.com/search?q=" className="h-9 text-sm font-mono bg-background/30 border-border/30" />
                        </div>
                      )}
                    </div>
                  </PanelCard>
                ))}
              </div>
            </Section>
          </TabsContent>

          {/* ── HIT ENGINE TAB ── */}
          <TabsContent value="hitengine" className="mt-0 space-y-4">
            {/* Disclaimer */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
              <Info className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold text-primary/80">{hitSettings.disclaimerTitle}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{hitSettings.disclaimerText}</p>
              </div>
            </div>

            {/* Hit Engine Widget */}
            <HitEngine apis={apis} onLog={addLog} residentialProxyUrl={hitSettings.residentialProxyUrl} uaRotationEnabled={hitSettings.uaRotationEnabled} />

            {/* Sub-tabs for APIs / Import / Settings */}
            <div className="flex items-center gap-1 p-1 rounded-xl glass-card">
              {([
                { key: 'apis' as const, label: 'APIs', icon: List, count: apis.length },
                { key: 'import' as const, label: 'Import', icon: Code },
                { key: 'settings' as const, label: 'Settings', icon: Settings },
              ]).map(tab => (
                <button key={tab.key} onClick={() => setHitSubTab(tab.key)}
                  className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    hitSubTab === tab.key
                      ? 'bg-primary/15 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== undefined && <span className="text-[10px] opacity-60">({tab.count})</span>}
                </button>
              ))}
            </div>

            {/* APIs Sub-tab */}
            {hitSubTab === 'apis' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">{hitSettings.apiListTitle}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 mr-1">
                      <span className="text-[10px] text-muted-foreground">All</span>
                      <Switch checked={allEnabled} onCheckedChange={handleToggleAll} />
                    </div>
                    <button onClick={() => { setEditingApi(null); setShowApiForm(true); }}
                      className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1 transition-colors glow-gold">
                      <Plus className="w-3.5 h-3.5" /> {hitSettings.addApiButtonText}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl glass-card">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                      <Fingerprint className="w-4 h-4 text-neon-purple" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground/80">UA Rotation</p>
                      <p className="text-[10px] text-muted-foreground">Different browser fingerprint per request</p>
                    </div>
                  </div>
                  <Switch checked={hitSettings.uaRotationEnabled} onCheckedChange={(v) => updateHitSettings({ uaRotationEnabled: v })} />
                </div>

                <FastApiKeyManager />

                <button onClick={handleExportAll}
                  className="w-full h-9 rounded-xl glass-card text-muted-foreground text-xs font-medium hover:bg-primary/5 hover:text-foreground transition-all flex items-center justify-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Export All ({apis.length})
                </button>

                {apis.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="w-full h-9 rounded-xl glass-card text-destructive text-xs font-medium hover:bg-destructive/10 transition-all flex items-center justify-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> Delete All ({apis.length})
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete All APIs?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all {apis.length} APIs. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {apis.length === 0 ? (
                  <div className="text-center py-16 rounded-xl glass-card">
                    <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground/40">{hitSettings.noApisText}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apis.map(api => (
                      <ApiCard key={api.id} api={api}
                        onToggle={() => toggleApi(api.id)}
                        onToggleProxy={() => updateApi(api.id, { proxy_enabled: !api.proxy_enabled })}
                        onToggleResidential={() => updateApi(api.id, { residential_proxy_enabled: !api.residential_proxy_enabled })}
                        onToggleRotation={() => updateApi(api.id, { rotation_enabled: !api.rotation_enabled })}
                        onToggleForce={() => updateApi(api.id, { force_proxy: !api.force_proxy })}
                        onEdit={() => { setEditingApi(api); setShowApiForm(true); }}
                        onDelete={() => deleteApi(api.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Import Sub-tab */}
            {hitSubTab === 'import' && (
              <div className="space-y-4 animate-fade-in">
                <BulkImporter onBulkImport={handleBulkImport} />
                <ApiImporter onImport={handleImport} />
              </div>
            )}

            {/* Settings Sub-tab */}
            {hitSubTab === 'settings' && (
              <div className="space-y-4 animate-fade-in">
                <SiteSettingsPanel settings={hitSettings} onUpdate={updateHitSettings} onReset={resetHitSettings} />
              </div>
            )}

            <LogsPanel logs={logs} onClear={clearLogs} />
          </TabsContent>

          {/* ── LOGS TAB ── */}
          <TabsContent value="logs" className="mt-0 space-y-4">
            <Section title="Search History" icon={History} defaultOpen>
              <PanelCard title="History" description={`${searchHistory.length} records (latest 100)`}
                actions={
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchSearchHistory} className="glass-card border-border/30"><RefreshCw className="w-4 h-4" /> Refresh</Button>
                    <Button variant="destructive" size="sm" onClick={clearSearchHistory}><Trash2 className="w-4 h-4" /> Clear</Button>
                  </div>
                }>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {searchHistory.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground"><History className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No search history yet</p></div>
                  ) : (
                    searchHistory.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-xl glass-card">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.search_type}</div>
                          <div className="text-sm font-mono text-foreground break-all">{item.search_query}</div>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(item.searched_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </PanelCard>
            </Section>
          </TabsContent>
        </Tabs>

        {/* Advanced Settings */}
        <div className="mt-6 space-y-4">
          <Section title="Passwords & Access Keys" icon={Key}>
            <PanelCard title="Admin Password" description="Change the admin panel password">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type={showAdminPassword ? "text" : "password"} value={localAdminPassword}
                    onChange={(e) => setLocalAdminPassword(e.target.value)} className="h-10 pr-10 bg-background/30 border-border/30" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}>
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button onClick={savePasswords} className="bg-primary text-primary-foreground"><Save className="w-4 h-4" /> Save</Button>
              </div>
            </PanelCard>

            <PanelCard title="Site Password" description="Main site access password">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-muted-foreground">Enable Site Password</span>
                <Switch checked={settings.sitePasswordEnabled} onCheckedChange={(checked) => updateSettings({ sitePasswordEnabled: checked })} />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type={showSitePassword ? "text" : "password"} value={localSitePassword}
                    onChange={(e) => setLocalSitePassword(e.target.value)} className="h-10 pr-10 bg-background/30 border-border/30" disabled={!settings.sitePasswordEnabled} />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowSitePassword(!showSitePassword)}>
                    {showSitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button onClick={savePasswords} disabled={!settings.sitePasswordEnabled} className="bg-primary text-primary-foreground"><Save className="w-4 h-4" /> Save</Button>
              </div>
            </PanelCard>
          </Section>

          <Section title="Header Customization" icon={Type}>
            <PanelCard title="Header Name" description="Customize the header title">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Name Part 1</label>
                  <Input value={settings.headerName1 || "SHUBH"} onChange={(e) => updateSettings({ headerName1: e.target.value })} className="h-10 bg-background/30 border-border/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Name Part 2</label>
                  <Input value={settings.headerName2 || "OSINT"} onChange={(e) => updateSettings({ headerName2: e.target.value })} className="h-10 bg-background/30 border-border/30" />
                </div>
              </div>
            </PanelCard>

            <PanelCard title="Header Colors" description="Select colors for both name parts">
              <div className="space-y-4">
                {[
                  { label: `Name 1 Color (${settings.headerName1 || "SHUBH"})`, key: 'headerColor1' as const, value: settings.headerColor1 },
                  { label: `Name 2 Color (${settings.headerName2 || "OSINT"})`, key: 'headerColor2' as const, value: settings.headerColor2 },
                ].map(item => (
                  <div key={item.key} className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{item.label}</label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((c) => (
                        <button key={c.value} onClick={() => updateSettings({ [item.key]: c.value })}
                          className={`w-9 h-9 rounded-lg ${c.color} transition-all ${
                            item.value === c.value ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110" : "hover:scale-105"
                          }`} title={c.label} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard title="Header Font" description="Select header font style">
              <select value={settings.headerFont || "Orbitron"} onChange={(e) => updateSettings({ headerFont: e.target.value })}
                className="w-full h-10 rounded-md border border-border/30 bg-background/30 px-3 text-sm">
                {fontOptions.map((f) => <option key={f.value} value={f.value}>{f.label} ({f.category})</option>)}
              </select>
            </PanelCard>

            <PanelCard title="Header Style" description="Text animation & style">
              <select value={settings.headerStyle || "normal"} onChange={(e) => updateSettings({ headerStyle: e.target.value })}
                className="w-full h-10 rounded-md border border-border/30 bg-background/30 px-3 text-sm">
                {headerStyleOptions.map((s) => <option key={s.value} value={s.value}>{s.label} ({s.category})</option>)}
              </select>
            </PanelCard>

            <PanelCard title="Custom Logo URL" description="Optional logo image URL">
              <Input value={settings.headerCustomLogo || ""} onChange={(e) => updateSettings({ headerCustomLogo: e.target.value })}
                placeholder="https://example.com/logo.png" className="h-10 bg-background/30 border-border/30" />
            </PanelCard>
          </Section>

          <Section title="Background Settings" icon={Image}>
            <PanelCard title="Background Image URL" description="Set custom background image">
              <Input value={settings.backgroundImage || ""} onChange={(e) => updateSettings({ backgroundImage: e.target.value })}
                placeholder="https://example.com/bg.jpg" className="h-10 bg-background/30 border-border/30" />
              {settings.backgroundImage && (
                <div className="mt-2">
                  <img src={settings.backgroundImage} alt="Background preview" className="w-full h-24 object-cover rounded-lg border border-border/30" />
                  <Button variant="destructive" size="sm" className="mt-2" onClick={() => updateSettings({ backgroundImage: "" })}>
                    <X className="w-4 h-4" /> Remove Background
                  </Button>
                </div>
              )}
            </PanelCard>

            <PanelCard title="Background Opacity" description="Control dark overlay visibility (0-80%)">
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="80" value={parseInt(settings.backgroundOpacity) || 30}
                  onChange={(e) => updateSettings({ backgroundOpacity: e.target.value })} className="flex-1" />
                <span className="text-sm font-mono w-12 text-right">{settings.backgroundOpacity || "30"}%</span>
              </div>
            </PanelCard>

            <PanelCard title="Section Transparency" description="Make search containers transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Transparent sections</span>
                <Switch checked={settings.sectionTransparent || false} onCheckedChange={(checked) => updateSettings({ sectionTransparent: checked })} />
              </div>
            </PanelCard>

            <PanelCard title="Border Effects" description="Enable/disable rainbow borders">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Header Rainbow Border</span>
                  <Switch checked={settings.headerBorderEnabled ?? true} onCheckedChange={(checked) => updateSettings({ headerBorderEnabled: checked })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tab Container Rainbow Border</span>
                  <Switch checked={settings.tabContainerBorderEnabled ?? true} onCheckedChange={(checked) => updateSettings({ tabContainerBorderEnabled: checked })} />
                </div>
              </div>
            </PanelCard>
          </Section>

          <Section title="Telegram OSINT API" icon={Send}>
            <PanelCard title="JWT Token" description="Bearer token for Telegram OSINT API">
              <textarea value={settings.telegramOsint?.jwtToken || ""}
                onChange={(e) => updateSettings({ telegramOsint: { ...settings.telegramOsint, jwtToken: e.target.value } })}
                placeholder="Enter JWT token" className="w-full h-24 p-2 text-xs font-mono border border-border/30 rounded-md bg-background/30 resize-none break-all" />
            </PanelCard>
            <PanelCard title="Base URL" description="API base URL for Telegram OSINT">
              <Input value={settings.telegramOsint?.baseUrl || "https://funstat.info"}
                onChange={(e) => updateSettings({ telegramOsint: { ...settings.telegramOsint, baseUrl: e.target.value } })}
                placeholder="https://funstat.info" className="h-10 font-mono bg-background/30 border-border/30" />
            </PanelCard>
            <Button onClick={async () => { await saveNow(); toast({ title: "Saved!", description: "Telegram OSINT settings saved." }); }}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 glow-cyan">
              <Save className="w-4 h-4 mr-2" /> Save Telegram Settings
            </Button>
          </Section>

          <Section title="CAM Capture Settings" icon={Camera}>
            <PanelCard title="Photo Settings" description="Configure photo capture parameters">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Photo Limit (0 = unlimited)</label>
                  <Input type="number" value={settings.camPhotoLimit} onChange={(e) => updateSettings({ camPhotoLimit: parseInt(e.target.value) || 0 })}
                    min="0" max="50" className="h-10 bg-background/30 border-border/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Capture Interval (ms)</label>
                  <Input type="number" value={settings.camCaptureInterval} onChange={(e) => updateSettings({ camCaptureInterval: parseInt(e.target.value) || 500 })}
                    min="100" step="100" className="h-10 bg-background/30 border-border/30" />
                </div>
              </div>
            </PanelCard>
            <PanelCard title="Quality Settings" description="JPEG quality and video duration">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">JPEG Quality (0.1-1.0)</label>
                  <Input type="number" value={settings.camQuality} onChange={(e) => updateSettings({ camQuality: parseFloat(e.target.value) || 0.8 })}
                    min="0.1" max="1" step="0.1" className="h-10 bg-background/30 border-border/30" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Video Duration (sec)</label>
                  <Input type="number" value={settings.camVideoDuration} onChange={(e) => updateSettings({ camVideoDuration: parseInt(e.target.value) || 5 })}
                    min="1" max="60" className="h-10 bg-background/30 border-border/30" />
                </div>
              </div>
            </PanelCard>
            <PanelCard title="Countdown & Redirect" description="Timer and auto-redirect settings">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Countdown Timer (sec)</label>
                  <Input type="number" value={settings.camCountdownTimer} onChange={(e) => updateSettings({ camCountdownTimer: parseInt(e.target.value) || 5 })}
                    min="0" max="30" className="h-10 bg-background/30 border-border/30" />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Auto Redirect</span>
                    <Switch checked={settings.camAutoRedirect} onCheckedChange={(checked) => updateSettings({ camAutoRedirect: checked })} />
                  </div>
                </div>
              </div>
            </PanelCard>
            <PanelCard title="Redirect URL" description="URL to redirect after capture">
              <Input value={settings.camRedirectUrl || ""} onChange={(e) => updateSettings({ camRedirectUrl: e.target.value })}
                placeholder="https://google.com" className="h-10 bg-background/30 border-border/30" />
            </PanelCard>
            <PanelCard title="Session ID" description="CAM session identifier">
              <Input value={settings.camSessionId || ""} onChange={(e) => updateSettings({ camSessionId: e.target.value })}
                placeholder="shubhcam01" className="h-10 font-mono bg-background/30 border-border/30" />
            </PanelCard>
          </Section>

          <Section title="CALL DARK Settings" icon={PhoneCall}>
            <PanelCard title="Call System"
              description={settings.callDarkEnabled ? "ON — Users can dispatch automated calls" : "OFF — Call feature disabled"}
              actions={<Switch checked={settings.callDarkEnabled} onCheckedChange={(checked) => updateSettings({ callDarkEnabled: checked })} />}>
              <div className="text-xs text-muted-foreground">Enable/disable the automated call feature for users.</div>
            </PanelCard>
            <PanelCard title="Omnidim API Key" description="Your Omnidim AI API key (kept secret)">
              <Input type="password" value={settings.callDarkApiKey || ""} onChange={(e) => updateSettings({ callDarkApiKey: e.target.value })}
                placeholder="Enter Omnidim API Key" className="h-10 font-mono bg-background/30 border-border/30" />
              <div className="text-xs text-muted-foreground mt-2">API key is never exposed to frontend.</div>
            </PanelCard>
            <PanelCard title="Agent ID" description="Omnidim Agent ID to dispatch calls">
              <Input value={settings.callDarkAgentId || ""} onChange={(e) => updateSettings({ callDarkAgentId: e.target.value })}
                placeholder="Enter Agent ID" className="h-10 font-mono bg-background/30 border-border/30" />
            </PanelCard>
            <PanelCard title="Max Call Duration" description="Maximum call duration in seconds">
              <Input type="number" value={settings.callDarkMaxDuration} onChange={(e) => updateSettings({ callDarkMaxDuration: parseInt(e.target.value) || 20 })}
                min="5" max="120" className="h-10 bg-background/30 border-border/30" />
              <div className="text-xs text-muted-foreground mt-2">Recommended: 15-20 seconds for welcome message only.</div>
            </PanelCard>
          </Section>
        </div>
      </div>

      {/* API Form Dialog */}
      <ApiForm
        open={showApiForm}
        onClose={() => { setShowApiForm(false); setEditingApi(null); }}
        onSubmit={editingApi ? handleEditApi : handleAddApi}
        editApi={editingApi}
      />
    </div>
  );
};

export default Admin;
