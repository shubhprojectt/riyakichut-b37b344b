import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Phone, 
  CreditCard, 
  Car, 
  Camera, 
  Users, 
  ClipboardPaste, 
  Sparkles, 
  Code, 
  Globe,
  Loader2,
  User,
  Calendar,
  MapPin,
  Fuel,
  Settings,
  FileText,
  Shield,
  Zap,
  Search,
  Database,
  Send,
  LucideIcon,
  ArrowRight,
  MessageCircle,
  Skull,
  Bomb
} from "lucide-react";
import SearchButton from "./SearchButton";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
import ShubhCam from "./ShubhCam";
import TelegramOSINT from "./TelegramOSINT";
import HackerLoader from "./HackerLoader";
import AnimatedJsonViewer from "./AnimatedJsonViewer";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";

import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Phone, CreditCard, Car, Camera, Users, ClipboardPaste, Sparkles, Code, Globe, Database, Send, MessageCircle, Skull, Bomb, Shield, Search
};

interface VehicleResult {
  error: boolean;
  rc: string;
  result: {
    Nexus1: {
      id?: number;
      reg_no?: string;
      owner_name?: string;
      maker?: string;
      maker_modal?: string;
      vh_class?: string;
      insUpto?: string;
      regn_dt?: string;
      image?: string;
      isBrand?: boolean;
    };
    Nexus2: {
      "Owner Name"?: string;
      "Father's Name"?: string;
      "Model Name"?: string;
      "Vehicle Class"?: string;
      "Fuel Type"?: string;
      "Registration Date"?: string;
      "Insurance Expiry"?: string;
      "Registered RTO"?: string;
      "Address"?: string;
      "City Name"?: string;
    };
  };
  source_by?: string;
}

interface PhoneResult {
  data1?: {
    id?: string;
    mobile?: string;
    name?: string;
    father_name?: string;
    address?: string;
    alt_mobile?: string;
    circle?: string;
    id_number?: string;
    email?: string | null;
  };
  data2?: {
    id?: string;
    mobile?: string;
    name?: string;
    father_name?: string;
    address?: string;
    alt_mobile?: string;
    circle?: string;
    id_number?: string;
    email?: string | null;
  };
}

interface AllSearchResult {
  [key: string]: any;
}

interface AadharResult {
  name?: string;
  gender?: string;
  dob?: string;
  address?: string;
  state?: string;
  district?: string;
  pincode?: string;
  aadhaar_number?: string;
  mobile?: string;
  email?: string;
  father_name?: string;
  [key: string]: any;
}

const NumberDetailFinder = () => {
  const { settings } = useSettings();
  
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filter out manual tab - it's on Page2 now
  const enabledTabs = settings.tabs.filter(tab => tab.enabled && tab.searchType !== "manual");
  const activeButton = enabledTabs.find(b => b.label === activeTab);

  const handleTabClick = (label: string) => {
    // Check if it's RANDI PANEL - navigate to full page
    const tab = enabledTabs.find(t => t.label === label);
    if (tab?.searchType === "randipanel") {
      navigate("/randi-panel");
      return;
    }
    
    // Check if it's SMS BOMBER - open website in new tab
    if (tab?.searchType === "smsbomber") {
      const url = tab.apiUrl?.trim();
      if (url) {
        window.open(url, '_blank');
        toast({
          title: "SMS BOMBER",
          description: "Opening SMS Bomber...",
        });
      } else {
        toast({
          title: "Not Configured",
          description: "SMS Bomber URL not set. Configure in Admin Panel.",
          variant: "destructive",
        });
      }
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a value to search",
        variant: "destructive",
      });
      return;
    }

   // Debug log to check searchType
   console.log("Search triggered for tab:", activeButton?.searchType, "with API:", activeButton?.apiUrl);

    // START LOADING IMMEDIATELY for instant feedback
    setLoading(true);
    setResult(null);
    setError(null);


    // Log search history in background (non-blocking)
    logSearchHistory(activeButton?.searchType || "unknown", searchQuery.trim());

    // If tab has API URL and is manual type - open in new tab
    if (activeButton?.apiUrl && activeButton.searchType === "manual") {
      const apiUrl = `${activeButton.apiUrl}${encodeURIComponent(searchQuery.trim())}`;
      window.open(apiUrl, '_blank');
      setLoading(false);
      toast({
        title: "Opening API",
        description: `Opening search for: ${searchQuery}`,
      });
      return;
    }

    // Phone search API (via backend function to avoid CORS)
    if (activeButton?.searchType === "phone") {
      try {
        const defaultApiUrl = "https://anmolzz.teamxferry.workers.dev/?mobile=";

        // Use in-memory settings directly (already synced from context)
        const apiUrl =
          settings.tabs.find((t) => t.id === activeButton.id)?.apiUrl?.trim() ||
          settings.tabs.find((t) => t.searchType === "phone")?.apiUrl?.trim() ||
          defaultApiUrl;

        console.log("Phone search via edge function:", searchQuery.trim(), "API:", apiUrl);

        const { data, error: fnError } = await supabase.functions.invoke("numinfo-v2", {
          body: { number: searchQuery.trim(), apiUrl },
        });

        if (fnError) throw fnError;

        const hasData =
          data &&
          (data.responses?.length > 0 ||
            data.status === "success" ||
            (Object.keys(data).length > 0 && !data.error && !data.raw));

        if (hasData) {
          setResult({ type: "phone", data, usedApiUrl: apiUrl });
          toast({
            title: "Phone Found",
            description: `Results found for: ${searchQuery}`,
          });
        } else {
          setError(data?.error || "No information found for this number");
          toast({
            title: "Not Found",
            description: data?.error || "No information found",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Phone search error:", err);
        setError("Failed to fetch data. Please try again.");
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // NUM INFO V2 search via edge function (to avoid CORS)
    if (activeButton?.searchType === "numinfov2") {
      try {
        // Get API URL from settings
        const numInfoApiUrl = settings.tabs.find((t) => t.searchType === "numinfov2")?.apiUrl?.trim() || "";
        console.log("NUM INFO V2 search via edge function:", searchQuery.trim(), "API:", numInfoApiUrl);
        
        const { data, error: fnError } = await supabase.functions.invoke('numinfo-v2', {
          body: { number: searchQuery.trim(), apiUrl: numInfoApiUrl }
        });
        
        if (fnError) throw fnError;

        // Check for valid response - data can have responses array or direct data
        const hasData = data && (
          (data.responses && data.responses.length > 0) ||
          (data.status === "success") ||
          (Object.keys(data).length > 0 && !data.error && !data.raw)
        );
        
        if (hasData) {
          setResult({ type: "numinfov2", data });
          toast({
            title: "NUM INFO V2 Found",
            description: `Results found for: ${searchQuery}`,
          });
        } else {
          setError(data?.error || "No information found for this number");
          toast({
            title: "Not Found",
            description: data?.error || "No information found",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("NUM INFO V2 search error:", err);
        setError("Failed to fetch data. Please try again.");
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Aadhar search API (via edge function to avoid CORS)
    if (activeButton?.searchType === "aadhar") {
      try {
        // Get API URL from settings
        const aadharApiUrl = settings.tabs.find((t) => t.searchType === "aadhar")?.apiUrl?.trim() || "";
        console.log("Aadhar search via edge function:", searchQuery.trim(), "API:", aadharApiUrl);
        
        const { data, error: fnError } = await supabase.functions.invoke('aadhar-search', {
          body: { term: searchQuery.trim(), apiUrl: aadharApiUrl }
        });
        
        if (fnError) throw fnError;
        
        if (data && Object.keys(data).length > 0 && !data.error) {
          setResult({ type: "aadhar", data });
          toast({
            title: "Aadhar Found",
            description: `Results found for: ${searchQuery}`,
          });
        } else {
          setError(data?.error || "No information found for this Aadhar number");
          toast({
            title: "Not Found",
            description: data?.error || "No information found",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Aadhar search error:", err);
        setError("Failed to fetch data. Please try again.");
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // All Search API (LeakOSINT)
    if (activeButton?.searchType === "allsearch") {
      try {
        // Get API URL from settings
        const allSearchApiUrl = settings.tabs.find((t) => t.searchType === "allsearch")?.apiUrl?.trim() || "https://lek-steel.vercel.app/api/search?q=";
        console.log("All Search using API:", allSearchApiUrl);
        
        const response = await fetch(`${allSearchApiUrl}${encodeURIComponent(searchQuery.trim())}`);
        const data = await response.json();
        
        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
          setResult({ type: "allsearch", data });
          toast({
            title: "LeakOSINT Results",
            description: `Results found for: ${searchQuery}`,
          });
        } else {
          setError("No information found for this query");
          toast({
            title: "Not Found",
            description: "No information found",
            variant: "destructive",
          });
        }
      } catch (err) {
        setError("Failed to fetch data. Please try again.");
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Tg To Num search - inline JSON display
    if (activeButton?.searchType === "tgtonum") {
      if (activeButton.apiUrl) {
        try {
          const response = await fetch(`${activeButton.apiUrl}${encodeURIComponent(searchQuery.trim())}`);
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = { raw: text };
          }
          
          setResult({ type: "generic-json", data, searchType: "tgtonum" });
          toast({
            title: "Tg To Num Results",
            description: `Results found for: ${searchQuery}`,
          });
        } catch (err) {
          setError("Failed to fetch data. Please try again.");
          toast({
            title: "Error",
            description: "Failed to fetch data",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError("API not configured. Please set API URL in Admin panel.");
        toast({
          title: "API Not Set",
          description: "Configure API URL in Admin panel",
          variant: "destructive",
        });
      }
      return;
    }

    // Instagram search - inline JSON display
    if (activeButton?.searchType === "instagram") {
      if (activeButton.apiUrl) {
        try {
          const response = await fetch(`${activeButton.apiUrl}${encodeURIComponent(searchQuery.trim())}`);
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = { raw: text };
          }
          
          setResult({ type: "generic-json", data, searchType: "instagram" });
          toast({
            title: "Instagram Results",
            description: `Results found for: ${searchQuery}`,
          });
        } catch (err) {
          setError("Failed to fetch data. Please try again.");
          toast({
            title: "Error",
            description: "Failed to fetch data",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError("API not configured. Please set API URL in Admin panel.");
        toast({
          title: "API Not Set",
          description: "Configure API URL in Admin panel",
          variant: "destructive",
        });
      }
      return;
    }

    // Family search - inline JSON display
    if (activeButton?.searchType === "family") {
      if (activeButton.apiUrl) {
        try {
          const response = await fetch(`${activeButton.apiUrl}${encodeURIComponent(searchQuery.trim())}`);
          const text = await response.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            data = { raw: text };
          }
          
          setResult({ type: "generic-json", data, searchType: "family" });
          toast({
            title: "Family Info Results",
            description: `Results found for: ${searchQuery}`,
          });
        } catch (err) {
          setError("Failed to fetch data. Please try again.");
          toast({
            title: "Error",
            description: "Failed to fetch data",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError("API not configured. Please set API URL in Admin panel.");
        toast({
          title: "API Not Set",
          description: "Configure API URL in Admin panel",
          variant: "destructive",
        });
      }
      return;
    }

    // If tab has API URL - use it for vehicle
    if (activeButton?.apiUrl && activeButton.searchType === "vehicle") {
      try {
        const response = await fetch(`${activeButton.apiUrl}${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
        const data = await response.json();
        
        if (data && !data.error) {
          setResult(data);
          toast({
            title: "Vehicle Found",
            description: `Results found for: ${searchQuery.toUpperCase()}`,
          });
        } else {
          setError(data.error || "No vehicle found with this RC number");
          toast({
            title: "Not Found",
            description: data.error || "No vehicle found",
            variant: "destructive",
          });
        }
      } catch (err) {
        setError("Failed to fetch data. Please try again.");
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
   } else if (activeButton?.apiUrl && !["instagram", "family", "tgtonum"].includes(activeButton.searchType || "")) {
     // Only open in new tab for tabs that don't have inline handlers
     console.log("Opening in new tab for searchType:", activeButton.searchType);
      const apiUrl = `${activeButton.apiUrl}${encodeURIComponent(searchQuery.trim())}`;
      window.open(apiUrl, '_blank');
      setLoading(false);
      toast({
        title: "Opening API",
        description: `Opening search for: ${searchQuery}`,
      });
    } else {
      // Default demo behavior for tabs without API
      setTimeout(() => {
        setLoading(false);
        setResult({
          query: searchQuery,
          status: "Found",
          data: {
            name: "Demo Result",
            location: "India",
            provider: "SHUBH OSINT",
            timestamp: new Date().toLocaleString(),
          }
        });
        toast({
          title: "Search Complete",
          description: `Results found for: ${searchQuery}`,
        });
      }, 1500);
    }
  };

  const renderVehicleResult = (data: VehicleResult) => {
    return (
      <div className="p-4 rounded-xl bg-card/50 border border-border/50">
        <pre className="text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap break-words font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  // Render phone result as plain text/JSON
  const renderPhoneResult = (data: any, rawText?: string, usedApiUrl?: string) => {
    return (
      <div className="space-y-3 animate-slide-up">
        {usedApiUrl && (
          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
            <p className="text-xs text-muted-foreground">Using API URL</p>
            <p className="text-xs font-mono text-foreground break-all">{usedApiUrl}</p>
          </div>
        )}

        <div className="rounded-xl bg-card/80 border border-neon-green/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-5 h-5 text-neon-green" />
            <span className="text-sm font-bold text-neon-green uppercase tracking-wider">
              {rawText && data?.raw ? "API Response" : "API Response (JSON)"}
            </span>
          </div>

          <pre className="text-sm text-foreground font-mono whitespace-pre-wrap break-all bg-background/50 rounded-lg p-3 border border-border/50 overflow-x-auto max-h-[60vh] overflow-y-auto">
            {rawText && data?.raw ? rawText : JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  const renderAadharResult = (data: AadharResult) => {
    return (
      <div className="space-y-3 animate-slide-up">
        {/* Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neon-pink/20 via-neon-purple/10 to-neon-pink/5 border border-neon-pink/50 p-4">
          <div className="absolute top-0 right-0 w-20 h-20 bg-neon-pink/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-neon-pink/20 border border-neon-pink/50">
              <CreditCard className="w-6 h-6 text-neon-pink" />
            </div>
            <div>
              <p className="text-xs text-neon-pink/70 uppercase tracking-wider">Aadhar Number</p>
              <p className="text-xl font-display font-bold text-neon-pink">{data.aadhaar_number || data.id_number || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Name Info */}
        {data.name && (
          <div className="rounded-xl bg-gradient-to-r from-neon-cyan/15 to-neon-green/10 border border-neon-cyan/40 p-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs text-neon-cyan/70 uppercase">Name</span>
            </div>
            <p className="mt-1 font-semibold text-neon-cyan text-lg">{data.name}</p>
            {data.father_name && (
              <p className="text-xs text-muted-foreground mt-1">Father: {data.father_name}</p>
            )}
          </div>
        )}

        {/* Grid Info Cards */}
        <div className="grid grid-cols-2 gap-2">
          {data.gender && (
            <div className="rounded-xl bg-gradient-to-br from-neon-purple/15 to-neon-pink/10 border border-neon-purple/40 p-3">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-neon-purple" />
                <span className="text-[10px] text-neon-purple/70 uppercase">Gender</span>
              </div>
              <p className="mt-1 text-sm font-medium text-neon-purple">{data.gender}</p>
            </div>
          )}
          
          {data.dob && (
            <div className="rounded-xl bg-gradient-to-br from-neon-orange/15 to-neon-yellow/10 border border-neon-orange/40 p-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neon-orange" />
                <span className="text-[10px] text-neon-orange/70 uppercase">DOB</span>
              </div>
              <p className="mt-1 text-sm font-medium text-neon-orange">{data.dob}</p>
            </div>
          )}

          {data.state && (
            <div className="rounded-xl bg-gradient-to-br from-neon-green/15 to-neon-cyan/10 border border-neon-green/40 p-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neon-green" />
                <span className="text-[10px] text-neon-green/70 uppercase">State</span>
              </div>
              <p className="mt-1 text-sm font-medium text-neon-green truncate">{data.state}</p>
            </div>
          )}

          {data.district && (
            <div className="rounded-xl bg-gradient-to-br from-neon-cyan/15 to-neon-green/10 border border-neon-cyan/40 p-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-[10px] text-neon-cyan/70 uppercase">District</span>
              </div>
              <p className="mt-1 text-sm font-medium text-neon-cyan truncate">{data.district}</p>
            </div>
          )}

          {data.pincode && (
            <div className="rounded-xl bg-gradient-to-br from-neon-yellow/15 to-neon-orange/10 border border-neon-yellow/40 p-3">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-neon-yellow" />
                <span className="text-[10px] text-neon-yellow/70 uppercase">Pincode</span>
              </div>
              <p className="mt-1 text-sm font-medium text-neon-yellow">{data.pincode}</p>
            </div>
          )}

          {data.mobile && (
            <div className="rounded-xl bg-gradient-to-br from-neon-red/15 to-neon-pink/10 border border-neon-red/40 p-3">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neon-red" />
                <span className="text-[10px] text-neon-red/70 uppercase">Mobile</span>
              </div>
              <p className="mt-1 text-sm font-medium text-neon-red">{data.mobile}</p>
            </div>
          )}
        </div>

        {/* Address */}
        {data.address && (
          <div className="rounded-xl bg-gradient-to-r from-neon-orange/15 to-neon-yellow/10 border border-neon-orange/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-neon-orange" />
              <span className="text-xs text-neon-orange/70 uppercase">Address</span>
            </div>
            <p className="text-sm text-neon-orange">{data.address}</p>
          </div>
        )}

        {/* Email */}
        {data.email && (
          <div className="rounded-xl bg-muted/50 border border-border/50 p-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase">Email</span>
            </div>
            <p className="mt-1 text-sm text-foreground">{data.email}</p>
          </div>
        )}

        {/* Source */}
        <p className="text-xs text-center text-muted-foreground/60 pt-2">Source: SHUBH OSINT</p>
      </div>
    );
  };

  // Render NUM INFO V2 result as raw JSON
  const renderNumInfoV2Result = (data: any) => {
    const copyData = () => {
      const jsonStr = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(jsonStr);
      toast({
        title: "Copied!",
        description: "JSON data copied to clipboard",
      });
    };

    return (
      <div className="space-y-3 animate-slide-up">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neon-cyan/20 via-neon-green/10 to-neon-cyan/5 border border-neon-cyan/50 p-4">
          <div className="absolute top-0 right-0 w-20 h-20 bg-neon-cyan/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-neon-cyan/20 border border-neon-cyan/50">
                <Search className="w-6 h-6 text-neon-cyan" />
              </div>
              <div>
                <p className="text-xs text-neon-cyan/70 uppercase tracking-wider">Cradit D4rk</p>
                <p className="text-lg font-display font-bold text-neon-cyan">Raw JSON Response</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyData}
              className="border-neon-green/50 text-neon-green hover:bg-neon-green/20"
            >
              <ClipboardPaste className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>

        {/* JSON Content */}
        <div className="rounded-xl bg-card/50 border border-neon-cyan/40 overflow-hidden">
          <div className="px-4 py-2 bg-neon-cyan/10 border-b border-neon-cyan/30 flex items-center gap-2">
            <Code className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm text-neon-cyan font-semibold">JSON Response</span>
          </div>
          <div className="p-4 max-h-[500px] overflow-auto custom-scrollbar">
            <pre className="text-xs text-neon-green font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>

        {/* Source */}
        <p className="text-xs text-center text-muted-foreground/60 pt-2">Source: SHUBH OSINT via Cross Proxy</p>
      </div>
    );
  };

  // Generic JSON result renderer for Insta, Family, TgToNum etc
  const renderGenericJsonResult = (data: any, searchType: string) => {
    const titles: Record<string, string> = {
      instagram: "📸 INSTAGRAM INFO",
      family: "👨‍👩‍👧‍👦 FAMILY INFO",
      tgtonum: "📲 TG TO NUM INFO"
    };
    const colors: Record<string, "green" | "cyan" | "pink" | "purple" | "yellow" | "orange"> = {
      instagram: "pink",
      family: "purple",
      tgtonum: "cyan"
    };
    const title = titles[searchType] || "📊 RESULTS";
    const color = colors[searchType] || "green";
    
    return (
      <div className="space-y-3 animate-slide-up">
        <AnimatedJsonViewer
          data={data?.raw ? { raw: data.raw } : data}
          title={title}
          accentColor={color}
          animationSpeed={25}
          showLineNumbers={true}
        />
        <p className="text-xs text-center text-muted-foreground/60 pt-2">Source: SHUBH OSINT</p>
      </div>
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  // Flatten nested objects into simple key-value pairs
  const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
    const result: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined || value === '') continue;
      
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          if (typeof item === 'object') {
            Object.assign(result, flattenObject(item, `${newKey}[${idx}]`));
          } else {
            result[`${newKey}[${idx}]`] = String(item);
          }
        });
      } else {
        result[newKey] = String(value);
      }
    }
    
    return result;
  };

  // Highlight important fields
  const isImportantField = (key: string): boolean => {
    const importantKeys = ['name', 'email', 'phone', 'mobile', 'firstname', 'lastname', 'address', 'city', 'password', 'username'];
    return importantKeys.some(k => key.toLowerCase().includes(k));
  };

  const renderAllSearchResult = (data: any) => {
    const results = Array.isArray(data) ? data : [data];
    
    const copyAllData = () => {
      const jsonStr = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(jsonStr);
      toast({
        title: "All Data Copied!",
        description: "Complete JSON data copied to clipboard",
      });
    };
    
    return (
      <div className="space-y-3 animate-slide-up">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neon-red/20 via-neon-orange/10 to-neon-red/5 border border-neon-red/50 p-4">
          <div className="absolute top-0 right-0 w-20 h-20 bg-neon-red/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-neon-red/20 border border-neon-red/50">
                <Search className="w-6 h-6 text-neon-red" />
              </div>
              <div>
                <p className="text-xs text-neon-red/70 uppercase tracking-wider">LeakOSINT Database</p>
                <p className="text-lg font-display font-bold text-neon-red">{results.length} Record(s) Found</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAllData}
              className="border-neon-green/50 text-neon-green hover:bg-neon-green/20"
            >
              <ClipboardPaste className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>

        {/* Results List */}
        {results.map((item: any, index: number) => {
          const flatData = flattenObject(item);
          const entries = Object.entries(flatData);
          
          // Sort: important fields first
          entries.sort(([a], [b]) => {
            const aImportant = isImportantField(a);
            const bImportant = isImportantField(b);
            if (aImportant && !bImportant) return -1;
            if (!aImportant && bImportant) return 1;
            return 0;
          });

          return (
            <div key={index} className="rounded-xl bg-card/50 border border-neon-cyan/40 overflow-hidden">
              {/* Record Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-neon-cyan/10 border-b border-neon-cyan/30">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-neon-cyan" />
                  <span className="text-sm text-neon-cyan font-semibold">RECORD #{index + 1}</span>
                  <span className="text-xs text-muted-foreground">({entries.length} fields)</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(item, null, 2), `Record #${index + 1}`)}
                  className="h-7 text-neon-cyan/70 hover:text-neon-cyan hover:bg-neon-cyan/10"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                </Button>
              </div>
              
              {/* Record Content - Simple Table Layout */}
              <div className="p-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                  {entries.map(([key, value]) => {
                    const displayKey = key
                      .replace(/\./g, ' › ')
                      .replace(/\[(\d+)\]/g, ' #$1')
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, l => l.toUpperCase());
                    
                    const important = isImportantField(key);
                    
                    return (
                      <div 
                        key={key} 
                        className={`group flex gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                          important 
                            ? 'bg-neon-yellow/10 border border-neon-yellow/30 hover:bg-neon-yellow/20' 
                            : 'hover:bg-neon-green/10 border border-transparent hover:border-neon-green/20'
                        }`}
                        onClick={() => copyToClipboard(value, displayKey)}
                      >
                        <span className={`text-[10px] uppercase tracking-wide shrink-0 w-[100px] ${
                          important ? 'text-neon-yellow font-bold' : 'text-muted-foreground'
                        }`}>
                          {displayKey}
                        </span>
                        <span className={`text-sm font-mono flex-1 break-words ${
                          important ? 'text-neon-yellow' : 'text-neon-green'
                        }`}>
                          {value}
                        </span>
                        <ClipboardPaste className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground/60 pt-2">Click any field to copy • Source: LeakOSINT</p>
      </div>
    );
  };

  const renderDefaultResult = () => (
    <div className="border border-neon-green/30 rounded-lg p-4 bg-muted/30 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-neon-green font-bold">RESULT</span>
        <span className="text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded">
          {result.status}
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Query:</span>
          <span className="text-foreground">{result.query}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Name:</span>
          <span className="text-foreground">{result.data.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Location:</span>
          <span className="text-foreground">{result.data.location}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Provider:</span>
          <span className="text-neon-pink">{result.data.provider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Time:</span>
          <span className="text-foreground text-xs">{result.data.timestamp}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-1.5">
      {/* Main Card */}
      <div className="relative">
        {/* Dynamic Multicolor running glow border (disabled in transparent mode) */}
        {!settings.sectionTransparent &&
           settings.tabContainerBorderEnabled !== false &&
           (() => {
             // Use 12-color palette for tab container (different from header)
             const colors = settings.tabContainerBorderColors || ["lime", "aqua", "rose", "gold", "teal", "magenta", "coral", "violet", "sunset", "electric", "mint", "emerald"];
             const gradientColors = colors.map((c) => `hsl(var(--neon-${c}))`).join(", ");
             const speed = settings.sectionBorderSpeed || 4;
             const gradient = `linear-gradient(90deg, ${gradientColors}, ${gradientColors.split(", ")[0]})`;

            return (
              <>
                <div
                  className="absolute -inset-[2px] rounded-lg bg-[length:400%_100%] animate-rainbow-border opacity-70"
                  style={{
                    background: gradient,
                    backgroundSize: "400% 100%",
                    animationDuration: `${speed}s`,
                  }}
                />
                <div
                  className="absolute -inset-[1px] rounded-lg bg-[length:400%_100%] animate-rainbow-border blur-sm opacity-50"
                  style={{
                    background: gradient,
                    backgroundSize: "400% 100%",
                    animationDuration: `${speed}s`,
                  }}
                />
              </>
            );
          })()}
        <div className={`relative rounded-lg p-1.5 overflow-hidden ${
          settings.sectionTransparent ? 'bg-transparent' : 'bg-card/95 backdrop-blur-sm'
        }`}>
          
          {/* Button Grid - 4 columns with proper spacing */}
          <div className="relative grid grid-cols-4 gap-4 p-2">
            {enabledTabs.map((tab, index) => {
              const IconComponent = iconMap[tab.icon] || Sparkles;
              return (
                <div
                  key={tab.id}
                  className="animate-bounce-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <SearchButton
                    icon={IconComponent}
                    label={tab.label}
                    color={tab.color as any}
                    active={tab.label === activeTab}
                    onClick={() => handleTabClick(tab.label)}
                    size={settings.tabSize}
                    particleEnabled={settings.tabParticleEnabled !== false}
                    particleCount={settings.tabParticleCount || 3}
                    particleSpeed={settings.tabParticleSpeed || 1}
                  />
                </div>
              );
            })}
            
            {/* Next Page Button - Round style matching other tabs */}
            <div
              className="animate-bounce-in"
              style={{ animationDelay: `${enabledTabs.length * 30}ms` }}
            >
              <Link
                to="/page2"
                className="group flex flex-col items-center gap-1.5 transition-all duration-300"
              >
                {/* Round Icon Container */}
                <div
                  className={cn(
                    "relative flex items-center justify-center rounded-full border-2 transition-all duration-300",
                    "active:scale-90 border-neon-yellow text-neon-yellow bg-neon-yellow/10",
                    "hover:shadow-[0_0_20px_hsl(var(--neon-yellow)/0.5)] hover:scale-110",
                    settings.tabSize === "small" && "w-12 h-12",
                    settings.tabSize === "medium" && "w-14 h-14",
                    settings.tabSize === "large" && "w-16 h-16"
                  )}
                >
                  <ArrowRight className={cn(
                    "text-neon-yellow group-hover:translate-x-0.5 transition-transform",
                    settings.tabSize === "small" && "w-5 h-5",
                    settings.tabSize === "medium" && "w-6 h-6",
                    settings.tabSize === "large" && "w-7 h-7"
                  )} />
                </div>
                
                {/* Label Below */}
                <span className={cn(
                  "font-bold tracking-wider uppercase text-center leading-tight text-neon-yellow",
                  settings.tabSize === "small" && "text-[8px]",
                  settings.tabSize === "medium" && "text-[9px]",
                  settings.tabSize === "large" && "text-[10px]"
                )}>More</span>
              </Link>
            </div>
          </div>
          
          {/* Search Input - Shows when a non-camhack, non-darkdb, non-telegram, non-phprat tab is selected */}
          {activeTab && activeButton && activeButton.searchType !== "shubh" && activeButton.searchType !== "darkdb" && activeButton.searchType !== "telegram" && activeButton.searchType !== "phprat" && (
            <div key={`search-${activeTab}`} className="relative mt-2 animate-tab-fade-scale">
              <div className="flex gap-1.5 p-1 rounded-lg bg-background/80 border border-neon-cyan/40 shadow-[0_0_10px_hsl(var(--neon-cyan)/0.15)]">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeButton.placeholder}
                  className="flex-1 bg-transparent border-0 text-neon-green placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 text-xs font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button 
                  onClick={handleSearch}
                  disabled={loading}
                  className={`bg-gradient-to-r from-neon-cyan to-neon-green text-background font-bold px-3 h-8 hover:opacity-90 text-xs transition-all active:scale-95 ${loading ? 'animate-pulse shadow-[0_0_20px_hsl(var(--neon-cyan)/0.6),0_0_40px_hsl(var(--neon-green)/0.4)]' : 'shadow-[0_0_8px_hsl(var(--neon-cyan)/0.4)]'}`}
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin drop-shadow-[0_0_8px_hsl(var(--neon-cyan))]" /> : <Search className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* ShubhCam - shows when camhack tab is active */}
      {activeButton?.searchType === "shubh" && (
        <div key={`shubh-${activeTab}`} className="animate-tab-slide-in">
          <ShubhCam />
        </div>
      )}

      {/* DARK DB iframe - shows when darkdb tab is active */}
      {activeButton?.searchType === "darkdb" && (
        <div key={`darkdb-${activeTab}`} className="animate-tab-slide-in">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-3 py-2">
            <Database className="w-4 h-4 text-neon-purple animate-pulse" />
            <span className="text-xs font-bold tracking-[0.15em] text-neon-purple uppercase">
              Secure OSINT Database
            </span>
            <Shield className="w-4 h-4 text-neon-green" />
          </div>
          
          {/* Security Notice */}
          <div className="mb-3 px-3 py-2 rounded-xl bg-neon-green/5 border border-neon-green/20 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-neon-green flex-shrink-0" />
            <p className="text-[10px] text-neon-green/80">
              Search enabled • Redirects blocked • Safe browsing mode
            </p>
          </div>
          
          {/* Iframe Container */}
          <div 
            className="relative rounded-2xl overflow-hidden"
            style={{
              borderWidth: `${settings.darkDbBorderWidth}px`,
              borderStyle: 'solid',
              borderColor: `hsl(var(--neon-${settings.darkDbBorderColor}))`,
              boxShadow: settings.darkDbBorderWidth !== "0" 
                ? `0 0 20px hsl(var(--neon-${settings.darkDbBorderColor}) / 0.3)` 
                : 'none'
            }}
          >
            <iframe
              src={settings.darkDbUrl}
              className="w-full bg-background"
              style={{ height: `${settings.darkDbHeight}vh`, minHeight: '500px' }}
              title="DARK DB - Secure OSINT"
              sandbox="allow-scripts allow-forms allow-same-origin"
              referrerPolicy="no-referrer"
            />
            
            {/* Bottom overlay to block footer contact links */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-auto flex items-end justify-center pb-2">
              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                <Shield className="w-3 h-3" /> External links disabled for security
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Telegram OSINT Dashboard - shows when telegram tab is active */}
      {activeButton?.searchType === "telegram" && (
        <div key={`telegram-${activeTab}`} className="animate-tab-slide-in mt-4">
          <TelegramOSINT />
        </div>
      )}

      {/* PHPRAT Panel - shows when phprat tab is active */}
      {activeButton?.searchType === "phprat" && (
        <div key={`phprat-${activeTab}`} className="animate-tab-slide-in">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-3 py-2">
            <Code className="w-4 h-4 text-neon-green animate-pulse" />
            <span className="text-xs font-bold tracking-[0.15em] text-neon-green uppercase">
              PHPRAT Control Panel
            </span>
            <Shield className="w-4 h-4 text-neon-cyan" />
          </div>
          
          {/* Info Notice */}
          <div className="mb-3 px-3 py-2 rounded-xl bg-neon-green/5 border border-neon-green/20 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-neon-green flex-shrink-0" />
            <p className="text-[10px] text-neon-green/80">
              Remote Access Panel • Secure Connection • Active
            </p>
          </div>
          
          {/* Iframe Container */}
          <div 
            className="relative rounded-2xl overflow-hidden"
            style={{
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'hsl(var(--neon-green))',
              boxShadow: '0 0 20px hsl(var(--neon-green) / 0.3)'
            }}
          >
            <iframe
              src={activeButton?.apiUrl || "https://userb-92mn.onrender.com/"}
              className="w-full bg-background"
              style={{ height: '70vh', minHeight: '500px' }}
              title="PHPRAT Control Panel"
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Results Section */}
      {activeTab && activeButton && activeButton.searchType !== "shubh" && activeButton.searchType !== "darkdb" && activeButton.searchType !== "telegram" && activeButton.searchType !== "phprat" && (
        <div key={`results-${activeTab}`} className="animate-tab-slide-in">
          {/* Loading - inline version to not cover the screen */}
          {loading && <HackerLoader inline />}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-6 text-neon-red border-2 border-neon-red/30 rounded-2xl bg-card/50 animate-slide-up">
              <p>{error}</p>
            </div>
          )}

          {result && !loading && !error && (
            <div className="border-2 border-neon-green/50 rounded-2xl bg-card/80 p-4 animate-bounce-in shadow-[0_0_20px_hsl(var(--neon-green)/0.2)]">
              {result?.type === "generic-json" ? (
                renderGenericJsonResult(result.data, result.searchType)
              ) : (
                <>
                  <h3 className="text-neon-yellow font-display font-bold text-base mb-4 text-center tracking-wider">
                    {activeButton?.searchType === "vehicle" ? "🚗 VEHICLE INFO" : activeButton?.searchType === "phone" ? "📱 PHONE INFO" : activeButton?.searchType === "aadhar" ? "🪪 AADHAR INFO" : activeButton?.searchType === "allsearch" ? "👄 NUMBER TO DETAIL" : activeButton?.searchType === "numinfov2" ? "📱 NUM INFO V2" : "📊 RESULTS"}
                  </h3>
                  {activeButton?.searchType === "vehicle" 
                    ? renderVehicleResult(result) 
                    : activeButton?.searchType === "aadhar"
                    ? renderAadharResult(result.data)
                    : activeButton?.searchType === "allsearch"
                    ? renderAllSearchResult(result.data)
                    : activeButton?.searchType === "numinfov2"
                    ? renderNumInfoV2Result(result.data)
                    : (result?.type === "phone" ? renderPhoneResult(result.data, result.rawText, result.usedApiUrl) : renderDefaultResult())}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default NumberDetailFinder;
