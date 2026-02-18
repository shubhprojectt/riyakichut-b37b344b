import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone, CreditCard, Car, Camera, Users, ClipboardPaste, Sparkles, Code, Globe,
  Loader2, Search, Database, Send, MessageCircle, Skull, Bomb, Shield, Zap,
  LucideIcon, Copy, Check, PhoneCall, Image as ImageIcon, Clock
} from "lucide-react";
import FeatureCard from "./FeatureCard";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import ShubhCam from "./ShubhCam";
import TelegramOSINT from "./TelegramOSINT";
import CallDark from "./CallDark";

import ImageToInfo from "./ImageToInfo";
import HackerLoader from "./HackerLoader";
import AnimatedJsonViewer from "./AnimatedJsonViewer";
import QuickHitEngine from "./hit-engine/QuickHitEngine";
import LogsPanel from "./hit-engine/LogsPanel";
import { useHitApis } from "@/hooks/useHitApis";
import { useHitLogs } from "@/hooks/useHitLogs";
import { useHitSiteSettings } from "@/hooks/useHitSiteSettings";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Phone, CreditCard, Car, Camera, Users, ClipboardPaste, Sparkles, Code, Globe, Database, Send, MessageCircle, Skull, Bomb, Shield, Search, PhoneCall, Image: ImageIcon, Clock
};

const SearchPanel = ({ theme = "cyber-grid" }: { theme?: string }) => {
  const { settings } = useSettings();
  const { credits, deductCredits, isUnlimited } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Hit Engine hooks for SMS BOMBER tab
  const { apis } = useHitApis();
  const { logs, addLog, clearLogs } = useHitLogs();
  const { settings: hitSettings } = useHitSiteSettings();
  
  const visibleTabs = settings.tabs.filter(tab => tab.searchType !== "manual");
  const activeButton = visibleTabs.find(b => b.label === activeTab);

  const handleTabClick = (label: string) => {
    const tab = visibleTabs.find(t => t.label === label);
    if (tab?.searchType === "randipanel") {
      navigate("/randi-panel");
      return;
    }
    
    if (activeTab === label) {
      setActiveTab(null);
    } else {
      setActiveTab(label);
      setSearchQuery("");
      setResult(null);
      setError(null);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast({ title: "Copied!", description: `${fieldName} copied to clipboard` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const logSearchHistory = async (searchType: string, query: string) => {
    try {
      await supabase.from("search_history").insert({
        search_type: searchType,
        search_query: query,
      });
    } catch (err) {
      console.error("Failed to log search:", err);
    }
  };

  const runInlineJsonSearch = async (opts: {
    searchType: string;
    query: string;
    apiUrl?: string;
    toastTitle: string;
  }) => {
    const apiUrl = opts.apiUrl?.trim();
    if (!apiUrl) {
      setLoading(false);
      setError("API not configured. Admin panel me API URL set karo.");
      toast({ title: "API Not Set", description: "Configure API URL in Admin panel", variant: "destructive" });
      return;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("numinfo-v2", {
        body: { number: opts.query, apiUrl },
      });
      if (fnError) throw fnError;

      const hasValidData = data && (
        data.results || data.responses || data.data || 
        data.status === true || data.status === "success" || 
        (data.raw && data.raw.length > 0) ||
        (typeof data === 'object' && Object.keys(data).length > 0)
      );

      if (hasValidData) {
        setResult({ type: opts.searchType, data });
        toast({ title: opts.toastTitle, description: "Results found" });
      } else {
        setError("No information found");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch data. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({ title: "Error", description: "Please enter a value to search", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    // Check if tab is disabled
    if (activeButton && !activeButton.enabled) {
      setLoading(false);
      setError("⛔ Tab disabled hai! Admin se contact karo.");
      logSearchHistory(activeButton.searchType + "_disabled", searchQuery.trim());
      toast({ title: "Tab Disabled", description: "Yeh tab abhi disabled hai. Admin se contact karo.", variant: "destructive" });
      return;
    }

    if (settings.creditSystemEnabled) {
      if (!isUnlimited && credits <= 0) {
        setLoading(false);
        toast({ title: "No Credits", description: "Credits finished! Contact admin.", variant: "destructive" });
        return;
      }
      deductCredits(activeButton?.searchType || "search", searchQuery.trim());
    }

    logSearchHistory(activeButton?.searchType || "unknown", searchQuery.trim());

    if (activeButton?.searchType === "instagram") {
      await runInlineJsonSearch({ searchType: "instagram", query: searchQuery.trim(), apiUrl: activeButton.apiUrl, toastTitle: "Instagram Results" });
      return;
    }

    if (activeButton?.searchType === "family") {
      await runInlineJsonSearch({ searchType: "family", query: searchQuery.trim(), apiUrl: activeButton.apiUrl, toastTitle: "Family Results" });
      return;
    }

    if (activeButton?.searchType === "tgtonum") {
      await runInlineJsonSearch({ searchType: "tgtonum", query: searchQuery.trim(), apiUrl: activeButton.apiUrl, toastTitle: "TG to Num Results" });
      return;
    }

    if (activeButton?.searchType === "phone") {
      try {
        const apiUrl = settings.tabs.find((t) => t.searchType === "phone")?.apiUrl?.trim() || "https://anmolzz.teamxferry.workers.dev/?mobile=";
        const { data, error: fnError } = await supabase.functions.invoke("numinfo-v2", { body: { number: searchQuery.trim(), apiUrl } });
        if (fnError) throw fnError;
        const hasData = data && (data.responses?.length > 0 || data.status === "success" || Object.keys(data).length > 0);
        if (hasData) {
          setResult({ type: "phone", data });
          toast({ title: "Found!", description: `Results for: ${searchQuery}` });
        } else { setError("No information found"); }
      } catch (err) { setError("Failed to fetch data"); }
      finally { setLoading(false); }
      return;
    }

    if (activeButton?.searchType === "aadhar") {
      try {
        const aadharApiUrl = settings.tabs.find((t) => t.searchType === "aadhar")?.apiUrl?.trim() || "";
        const { data, error: fnError } = await supabase.functions.invoke('aadhar-search', { body: { term: searchQuery.trim(), apiUrl: aadharApiUrl } });
        if (fnError) throw fnError;
        if (data && Object.keys(data).length > 0 && !data.error) {
          setResult({ type: "aadhar", data });
          toast({ title: "Found!", description: `Aadhar results for: ${searchQuery}` });
        } else { setError("No Aadhar information found"); }
      } catch (err) { setError("Failed to fetch Aadhar data"); }
      finally { setLoading(false); }
      return;
    }

    if (activeButton?.searchType === "numinfov2") {
      try {
        const numInfoApiUrl = settings.tabs.find((t) => t.searchType === "numinfov2")?.apiUrl?.trim() || "";
        const { data, error: fnError } = await supabase.functions.invoke('numinfo-v2', { body: { number: searchQuery.trim(), apiUrl: numInfoApiUrl } });
        if (fnError) throw fnError;
        const hasData = data && (data.responses?.length > 0 || data.status === "success" || Object.keys(data).length > 0);
        if (hasData) {
          setResult({ type: "numinfov2", data });
          toast({ title: "Found!", description: `NUM INFO V2 results` });
        } else { setError("No information found"); }
      } catch (err) { setError("Failed to fetch data"); }
      finally { setLoading(false); }
      return;
    }

    if (activeButton?.searchType === "vehicle" && activeButton?.apiUrl) {
      try {
        const response = await fetch(`${activeButton.apiUrl}${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
        const data = await response.json();
        if (data && !data.error) {
          setResult({ type: "vehicle", data });
          toast({ title: "Vehicle Found!", description: `Results for: ${searchQuery.toUpperCase()}` });
        } else { setError("No vehicle found"); }
      } catch (err) { setError("Failed to fetch vehicle data"); }
      finally { setLoading(false); }
      return;
    }

    if (activeButton?.searchType === "allsearch") {
      try {
        const allSearchApiUrl = settings.tabs.find((t) => t.searchType === "allsearch")?.apiUrl?.trim() || "https://lek-steel.vercel.app/api/search?q=";
        const response = await fetch(`${allSearchApiUrl}${encodeURIComponent(searchQuery.trim())}`);
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setResult({ type: "allsearch", data });
          toast({ title: "LeakOSINT Results", description: `Results found` });
        } else { setError("No information found"); }
      } catch (err) { setError("Failed to fetch data"); }
      finally { setLoading(false); }
      return;
    }

    if (activeButton?.apiUrl) {
      const apiUrl = `${activeButton.apiUrl}${encodeURIComponent(searchQuery.trim())}`;
      window.open(apiUrl, '_blank');
      setLoading(false);
      toast({ title: "Opening", description: `Searching: ${searchQuery}` });
    } else {
      setLoading(false);
      setError("No API configured");
    }
  };

  const getAccentColor = (searchType: string): "green" | "cyan" | "pink" | "purple" | "yellow" | "orange" => {
    const colorMap: Record<string, "green" | "cyan" | "pink" | "purple" | "yellow" | "orange"> = {
      instagram: "pink", family: "purple", tgtonum: "cyan", phone: "green",
      numinfov2: "yellow", aadhar: "orange", vehicle: "cyan", allsearch: "pink",
    };
    return colorMap[searchType] || "green";
  };

  const getResultTitle = (searchType: string): string => {
    const titles: Record<string, string> = {
      instagram: "📸 INSTAGRAM RESULTS", family: "👨‍👩‍👧‍👦 FAMILY INFO",
      tgtonum: "📲 TG TO NUM", phone: "📱 PHONE INFO",
      numinfov2: "📱 NUM INFO V2", aadhar: "🪪 AADHAR INFO",
      vehicle: "🚗 VEHICLE INFO", allsearch: "🔍 ALL SEARCH",
    };
    return titles[searchType] || "📊 RESULTS";
  };

  const renderResult = () => {
    if (!result) return null;
    const searchType = result.type || activeButton?.searchType || "unknown";
    return (
      <AnimatedJsonViewer
        data={result.data}
        title={getResultTitle(searchType)}
        accentColor={getAccentColor(searchType)}
        animationSpeed={25}
        showLineNumbers={true}
      />
    );
  };

  const showSearchInput = activeTab && activeButton && 
    !["shubh", "darkdb", "telegram", "phprat", "calldark", "imagetoinfo", "smsbomber"].includes(activeButton.searchType);

  // ── Theme-specific tab grid styles ──
  const tabGridStyles: Record<string, { wrapper: React.CSSProperties; grid: string; accent: React.CSSProperties | null }> = {
    "cyber-grid": {
      wrapper: { background:'rgba(5,15,12,0.6)', backdropFilter:'blur(16px)', border:'1px solid rgba(0,255,128,0.1)', boxShadow:'0 4px 24px rgba(0,0,0,0.4)', borderRadius:'1rem', padding:'10px', position:'relative', overflow:'hidden' },
      grid: "grid grid-cols-4 gap-2",
      accent: { background:'linear-gradient(90deg,transparent,hsl(var(--neon-green)/0.4),hsl(var(--neon-cyan)/0.4),hsl(var(--neon-pink)/0.3),transparent)' }
    },
    "matrix-rain": {
      wrapper: { background:'rgba(0,20,0,0.7)', border:'1px solid rgba(0,255,0,0.15)', borderRadius:'0', padding:'8px', position:'relative', overflow:'hidden', fontFamily:'monospace' },
      grid: "grid grid-cols-4 gap-1",
      accent: { background:'linear-gradient(90deg,transparent,rgba(0,255,0,0.5),transparent)' }
    },
    "neon-cards": {
      wrapper: { background:'rgba(20,0,20,0.65)', backdropFilter:'blur(12px)', border:'2px solid rgba(255,0,200,0.2)', borderRadius:'0.5rem', padding:'12px', position:'relative', overflow:'hidden', boxShadow:'0 0 30px rgba(255,0,200,0.08)' },
      grid: "grid grid-cols-3 gap-3",
      accent: { background:'linear-gradient(90deg,transparent,rgba(255,0,200,0.5),rgba(100,0,255,0.4),transparent)' }
    },
    "minimal-dark": {
      wrapper: { background:'rgba(15,15,15,0.9)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'0.75rem', padding:'10px', position:'relative', overflow:'hidden' },
      grid: "grid grid-cols-4 gap-2",
      accent: null
    },
    "hologram": {
      wrapper: { background:'rgba(0,30,40,0.5)', backdropFilter:'blur(20px)', border:'1px solid rgba(0,255,255,0.15)', borderRadius:'0.75rem', padding:'10px', position:'relative', overflow:'hidden', boxShadow:'0 0 20px rgba(0,255,255,0.06)' },
      grid: "grid grid-cols-4 gap-2",
      accent: { background:'linear-gradient(90deg,transparent,rgba(0,255,255,0.5),rgba(0,200,255,0.4),transparent)' }
    },
    "retro-terminal": {
      wrapper: { background:'rgba(8,6,0,0.9)', border:'2px solid rgba(255,180,0,0.25)', borderRadius:'0', padding:'8px', position:'relative', overflow:'hidden', boxShadow:'inset 0 0 20px rgba(255,180,0,0.04)' },
      grid: "grid grid-cols-4 gap-1",
      accent: { background:'linear-gradient(90deg,transparent,rgba(255,180,0,0.5),transparent)' }
    },
    "glassmorphic": {
      wrapper: { background:'rgba(255,255,255,0.03)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'1.25rem', padding:'12px', position:'relative', overflow:'hidden' },
      grid: "grid grid-cols-4 gap-2",
      accent: { background:'linear-gradient(90deg,rgba(100,0,255,0.4),rgba(255,0,128,0.4),rgba(0,200,255,0.4))' }
    },
    "brutal-neon": {
      wrapper: { background:'#000', border:'3px solid rgba(255,255,0,0.5)', borderRadius:'0', padding:'8px', position:'relative', overflow:'hidden', boxShadow:'4px 4px 0 rgba(255,0,255,0.4)' },
      grid: "grid grid-cols-4 gap-1",
      accent: null
    },
    "cosmic": {
      wrapper: { background:'rgba(5,0,20,0.75)', backdropFilter:'blur(16px)', border:'1px solid rgba(150,50,255,0.2)', borderRadius:'1rem', padding:'10px', position:'relative', overflow:'hidden', boxShadow:'0 0 30px rgba(100,0,255,0.08)' },
      grid: "grid grid-cols-4 gap-2",
      accent: { background:'linear-gradient(90deg,transparent,rgba(150,50,255,0.5),rgba(255,50,200,0.4),transparent)' }
    },
    "blood-hex": {
      wrapper: { background:'rgba(15,0,0,0.8)', border:'1px solid rgba(200,0,0,0.25)', borderRadius:'0.5rem', padding:'8px', position:'relative', overflow:'hidden', boxShadow:'inset 0 0 20px rgba(200,0,0,0.05)' },
      grid: "grid grid-cols-4 gap-1",
      accent: { background:'linear-gradient(90deg,transparent,rgba(200,0,0,0.5),rgba(150,0,0,0.4),transparent)' }
    },
  };

  const tStyle = tabGridStyles[theme] || tabGridStyles["cyber-grid"];

  // Theme-specific search input styles
  const searchInputColors: Record<string, { bg: string; border: string; color: string; btnBg: string; btnBorder: string; btnColor: string }> = {
    "matrix-rain":    { bg:'rgba(0,10,0,0.8)',     border:'rgba(0,200,0,0.3)',   color:'#00ff00', btnBg:'rgba(0,200,0,0.1)',   btnBorder:'rgba(0,200,0,0.4)',  btnColor:'#00ee00' },
    "neon-cards":     { bg:'rgba(10,0,10,0.8)',     border:'rgba(255,0,200,0.3)', color:'#ff66ff', btnBg:'rgba(200,0,255,0.1)', btnBorder:'rgba(200,0,255,0.4)',btnColor:'#dd44ff' },
    "minimal-dark":   { bg:'rgba(20,20,20,0.9)',    border:'rgba(80,80,80,0.4)', color:'#e0e0e0', btnBg:'rgba(60,60,60,0.4)',   btnBorder:'rgba(80,80,80,0.5)', btnColor:'#ccc' },
    "hologram":       { bg:'rgba(0,15,20,0.8)',     border:'rgba(0,255,255,0.2)', color:'#00ffff', btnBg:'rgba(0,200,255,0.1)', btnBorder:'rgba(0,200,255,0.4)',btnColor:'#00ddff' },
    "retro-terminal": { bg:'rgba(5,4,0,0.9)',       border:'rgba(255,180,0,0.3)', color:'#ffb400', btnBg:'rgba(255,180,0,0.1)', btnBorder:'rgba(255,180,0,0.4)',btnColor:'#ffaa00' },
    "glassmorphic":   { bg:'rgba(255,255,255,0.04)',border:'rgba(255,255,255,0.12)',color:'#f0f0ff',btnBg:'rgba(150,50,255,0.15)',btnBorder:'rgba(150,50,255,0.4)',btnColor:'#cc88ff' },
    "brutal-neon":    { bg:'#000',                  border:'rgba(255,255,0,0.6)', color:'#ffff00', btnBg:'rgba(255,0,255,0.2)', btnBorder:'rgba(255,0,255,0.8)',btnColor:'#ff00ff' },
    "cosmic":         { bg:'rgba(5,0,20,0.9)',      border:'rgba(150,50,255,0.3)',color:'#bb88ff', btnBg:'rgba(150,50,255,0.15)',btnBorder:'rgba(150,50,255,0.5)',btnColor:'#bb88ff' },
    "blood-hex":      { bg:'rgba(10,0,0,0.9)',      border:'rgba(200,0,0,0.3)',  color:'#ff4444', btnBg:'rgba(200,0,0,0.12)',   btnBorder:'rgba(200,0,0,0.4)',  btnColor:'#ff3333' },
    "cyber-grid":     { bg:'rgba(0,0,0,0.5)',       border:'rgba(0,255,128,0.15)',color:'hsl(var(--neon-green))',btnBg:'rgba(0,255,128,0.1)',btnBorder:'rgba(0,255,128,0.3)',btnColor:'hsl(var(--neon-green))' },
  };
  const sc = searchInputColors[theme] || searchInputColors["cyber-grid"];

  return (
    <div className="px-3 space-y-3 max-w-xl mx-auto">
      {/* Feature Cards Grid */}
      <div style={tStyle.wrapper}>
        {/* Top accent line */}
        {tStyle.accent && (
          <div className="absolute top-0 left-0 right-0 h-[1px]" style={tStyle.accent} />
        )}

        <div className={tStyle.grid}>
          {visibleTabs.map((tab) => {
            const IconComponent = iconMap[tab.icon] || Sparkles;
            const isPhoneSearch = tab.searchType === "phone";
            const isDisabled = !tab.enabled;
            return (
              <FeatureCard
                key={tab.id}
                icon={IconComponent}
                label={tab.label}
                color={tab.color}
                active={tab.label === activeTab}
                onClick={() => handleTabClick(tab.label)}
                curved={isPhoneSearch}
                disabled={isDisabled}
              />
            );
          })}
        </div>
      </div>

      {/* Search Input Section */}
      {showSearchInput && (
        <div className="rounded-xl p-3" style={{background: sc.bg, backdropFilter:'blur(12px)', border:`1px solid ${sc.border}`, boxShadow:'0 4px 20px rgba(0,0,0,0.3)'}}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{background: sc.color, boxShadow:`0 0 5px ${sc.color}`}} />
            <span className="text-[10px] font-bold tracking-wider uppercase font-mono" style={{color: sc.color, opacity: 0.85}}>
              {activeButton?.label || "SEARCH"}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeButton?.placeholder || "Enter search query..."}
              className="flex-1 h-10 text-sm font-mono rounded-xl border"
              style={{background: sc.bg, borderColor: sc.border, color: sc.color}}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="h-10 px-4 rounded-xl font-bold transition-all active:scale-[0.97]"
              style={{background: sc.btnBg, border:`1px solid ${sc.btnBorder}`, color: sc.btnColor, boxShadow:`0 0 10px ${sc.btnBg}`}}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Disabled Tab Message */}
      {activeButton && !activeButton.enabled && (
        <div className="text-center py-8 rounded-2xl" style={{background: 'rgba(220,30,30,0.06)', border: '1px solid rgba(220,30,30,0.15)'}}>
          <div className="text-3xl mb-2">⛔</div>
          <p className="text-sm font-bold" style={{color: 'rgba(255,80,80,0.85)'}}>Tab Disabled</p>
          <p className="text-xs mt-1" style={{color: 'rgba(255,255,255,0.35)'}}>Yeh tab abhi disabled hai. Admin se contact karo.</p>
        </div>
      )}

      {/* ShubhCam Panel */}
      {activeButton?.searchType === "shubh" && activeButton.enabled && <ShubhCam />}

      {/* Telegram OSINT Panel */}
      {activeButton?.searchType === "telegram" && activeButton.enabled && <TelegramOSINT />}

      {/* DARK DB iframe */}
      {activeButton?.searchType === "darkdb" && activeButton.enabled && (
        <div className="rounded-2xl overflow-hidden" style={{background: 'rgba(5,10,15,0.7)', border: '1px solid rgba(0,200,255,0.1)'}}>
          <div className="flex items-center gap-2 px-4 py-3" style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
            <Database className="w-4 h-4" style={{color: 'hsl(var(--neon-cyan))', opacity: 0.7}} />
            <span className="text-xs font-semibold tracking-wider uppercase" style={{color: 'rgba(255,255,255,0.6)'}}>Secure OSINT Database</span>
          </div>
          <iframe
            src={settings.darkDbUrl}
            className="w-full"
            style={{ height: `${settings.darkDbHeight}vh`, minHeight: '400px', background: '#09090b' }}
            title="DARK DB"
            sandbox="allow-scripts allow-forms allow-same-origin"
          />
        </div>
      )}

      {/* PHPRAT Panel */}
      {activeButton?.searchType === "phprat" && activeButton.enabled && (
        <div className="rounded-2xl overflow-hidden" style={{background: 'rgba(5,10,15,0.7)', border: '1px solid rgba(0,200,100,0.1)'}}>
          <div className="flex items-center gap-2 px-4 py-3" style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
            <Code className="w-4 h-4" style={{color: 'hsl(var(--neon-emerald))', opacity: 0.7}} />
            <span className="text-xs font-semibold tracking-wider uppercase" style={{color: 'rgba(255,255,255,0.6)'}}>PHPRAT Control Panel</span>
          </div>
          <iframe
            src={activeButton?.apiUrl || "https://userb-92mn.onrender.com/"}
            className="w-full"
            style={{ height: '70vh', minHeight: '400px', background: '#09090b' }}
            title="PHPRAT"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          />
        </div>
      )}

      {/* CALL DARK Panel */}
      {activeButton?.searchType === "calldark" && activeButton.enabled && <CallDark />}

      {/* Image to Info Panel */}
      {activeButton?.searchType === "imagetoinfo" && activeButton.enabled && <ImageToInfo />}

      {/* SMS BOMBER */}
      {activeButton?.searchType === "smsbomber" && activeButton.enabled && (
        <div className="space-y-3">
          <QuickHitEngine
            apis={apis}
            onLog={(log) => { addLog(log); }}
            onPhoneUsed={(phone) => { logSearchHistory("smsbomber", phone); }}
            title={hitSettings.quickHitTitle || 'HIT ENGINE'}
            phoneLabel={hitSettings.phoneLabel}
            phonePlaceholder={hitSettings.phonePlaceholder}
            hitButtonText={hitSettings.hitButtonText}
            stopButtonText={hitSettings.stopButtonText}
            noApisWarning={hitSettings.noApisWarning}
            uaRotation={hitSettings.uaRotationEnabled}
          />
          <LogsPanel logs={logs} onClear={clearLogs} />
        </div>
      )}

      {/* Results Section */}
      {showSearchInput && (
        <div className="min-h-[80px]">
          {loading && <HackerLoader inline />}
          
          {error && !loading && (
            <div className="text-center py-6 rounded-2xl" style={{background: 'rgba(220,30,30,0.05)', border: '1px solid rgba(220,30,30,0.12)'}}>
              <p className="text-sm font-medium" style={{color: 'rgba(255,80,80,0.8)'}}>{error}</p>
            </div>
          )}
          
          {result && !loading && !error && (
            <div className="rounded-2xl p-4" style={{background: 'rgba(0,10,8,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(0,255,128,0.1)'}}>
              <div className="flex items-center gap-2 mb-3 pb-2" style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                <div className="w-2 h-2 rounded-full" style={{background: 'hsl(var(--neon-green))', boxShadow: '0 0 6px hsl(var(--neon-green))'}} />
                <Zap className="w-4 h-4" style={{color: 'hsl(var(--neon-green))', opacity: 0.8}} />
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{color: 'rgba(255,255,255,0.75)'}}>
                  {activeButton?.label} Results
                </h3>
              </div>
              {renderResult()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
