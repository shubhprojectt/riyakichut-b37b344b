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
import ScheduledHit from "./ScheduledHit";
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

const SearchPanel = () => {
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

  return (
    <div className="px-3 space-y-3 max-w-xl mx-auto">
      {/* Feature Cards Grid - neon container */}
        <div className="rounded-2xl bg-black/60 backdrop-blur-sm p-3 relative overflow-hidden" style={{border: 'none'}}>
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{padding: '1px', background: 'linear-gradient(90deg, hsl(var(--neon-green)), hsl(var(--neon-cyan)), hsl(var(--neon-pink)), hsl(var(--neon-purple)), hsl(var(--neon-green)))', backgroundSize: '300% 100%', animation: 'borderColorRun 4s linear infinite', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', borderRadius: 'inherit'}} />
          <div className="grid grid-cols-4 gap-2">
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
        <div className="rounded-2xl bg-black/60 backdrop-blur-sm border border-neon-cyan/20 p-3" style={{boxShadow: '0 0 15px hsl(var(--neon-cyan) / 0.1)'}}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan" style={{boxShadow: '0 0 6px hsl(var(--neon-cyan))'}} />
            <span className="text-[10px] font-bold text-neon-cyan/70 tracking-wider uppercase font-mono" style={{textShadow: '0 0 8px hsl(var(--neon-cyan) / 0.5)'}}>
              {activeButton?.label || "SEARCH"}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeButton?.placeholder || "Enter search query..."}
              className="flex-1 bg-black/80 border-neon-green/20 text-neon-green placeholder:text-neon-green/20 focus:border-neon-green/50 focus:ring-neon-green/20 h-10 text-sm font-mono rounded-xl"
              style={{textShadow: '0 0 4px hsl(var(--neon-green) / 0.3)', boxShadow: 'inset 0 0 10px hsl(var(--neon-green) / 0.05)'}}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="h-10 px-4 rounded-xl font-bold bg-black border-2 border-neon-green/50 text-neon-green hover:bg-neon-green/10 active:scale-[0.97] transition-all"
              style={{boxShadow: '0 0 15px hsl(var(--neon-green) / 0.3), inset 0 0 10px hsl(var(--neon-green) / 0.1)', textShadow: '0 0 8px hsl(var(--neon-green))'}}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Disabled Tab Message */}
      {activeButton && !activeButton.enabled && (
        <div className="text-center py-8 rounded-2xl border border-red-500/20 bg-red-500/[0.06]">
          <div className="text-3xl mb-2">⛔</div>
          <p className="text-red-400/90 text-sm font-bold">Tab Disabled</p>
          <p className="text-white/40 text-xs mt-1">Yeh tab abhi disabled hai. Admin se contact karo.</p>
        </div>
      )}

      {/* ShubhCam Panel */}
      {activeButton?.searchType === "shubh" && activeButton.enabled && <ShubhCam />}

      {/* Telegram OSINT Panel */}
      {activeButton?.searchType === "telegram" && activeButton.enabled && <TelegramOSINT />}

      {/* DARK DB iframe */}
      {activeButton?.searchType === "darkdb" && activeButton.enabled && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
            <Database className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Secure OSINT Database</span>
          </div>
          <iframe
            src={settings.darkDbUrl}
            className="w-full bg-[#09090b]"
            style={{ height: `${settings.darkDbHeight}vh`, minHeight: '400px' }}
            title="DARK DB"
            sandbox="allow-scripts allow-forms allow-same-origin"
          />
        </div>
      )}

      {/* PHPRAT Panel */}
      {activeButton?.searchType === "phprat" && activeButton.enabled && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
            <Code className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">PHPRAT Control Panel</span>
          </div>
          <iframe
            src={activeButton?.apiUrl || "https://userb-92mn.onrender.com/"}
            className="w-full bg-[#09090b]"
            style={{ height: '70vh', minHeight: '400px' }}
            title="PHPRAT"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          />
        </div>
      )}

      {/* CALL DARK Panel */}
      {activeButton?.searchType === "calldark" && activeButton.enabled && <CallDark />}

      {/* Image to Info Panel */}
      {activeButton?.searchType === "imagetoinfo" && activeButton.enabled && <ImageToInfo />}

      {/* SMS BOMBER - Inline Hit Engine + Scheduled Hit */}
      {activeButton?.searchType === "smsbomber" && activeButton.enabled && (
        <div className="space-y-4">
          <QuickHitEngine
            apis={apis}
            onLog={(log) => {
              addLog(log);
            }}
            onPhoneUsed={(phone) => {
              logSearchHistory("smsbomber", phone);
            }}
            title={hitSettings.quickHitTitle || 'HIT ENGINE'}
            phoneLabel={hitSettings.phoneLabel}
            phonePlaceholder={hitSettings.phonePlaceholder}
            hitButtonText={hitSettings.hitButtonText}
            stopButtonText={hitSettings.stopButtonText}
            noApisWarning={hitSettings.noApisWarning}
            uaRotation={hitSettings.uaRotationEnabled}
          />
          <ScheduledHit />
          <LogsPanel logs={logs} onClear={clearLogs} />
        </div>
      )}

      {/* Results Section */}
      {showSearchInput && (
        <div className="min-h-[100px]">
          {loading && <HackerLoader inline />}
          
          {error && !loading && (
            <div className="text-center py-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06]">
              <p className="text-red-400/80 text-sm font-medium">{error}</p>
            </div>
          )}
          
          {result && !loading && !error && (
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/[0.06]">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
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
