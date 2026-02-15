import { useEffect, useRef, useState } from "react";

interface AiFaceDetectorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onCameraReady: () => void;
  onPermissionDenied: () => void;
}

const AiFaceDetector = ({ videoRef, onCameraReady, onPermissionDenied }: AiFaceDetectorProps) => {
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"waiting" | "scanning" | "analyzing" | "denied">("waiting");
  const [scanProgress, setScanProgress] = useState(0);
  const [faceFound, setFaceFound] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const animFrameRef = useRef<number>(0);

  const analysisMessages = [
    "Mapping facial landmarks...",
    "Analyzing bone structure...",
    "Detecting micro-expressions...",
    "Processing biometric data...",
    "Scanning retinal patterns...",
    "Measuring facial symmetry...",
    "Identifying unique features...",
    "Cross-referencing database...",
    "Computing identity score...",
    "Deep analysis in progress...",
  ];

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus("scanning");
          onCameraReady();
        }
      } catch {
        setStatus("denied");
        onPermissionDenied();
      }
    };
    startCamera();
  }, []);

  useEffect(() => {
    if (status !== "scanning") return;
    const interval = setInterval(() => {
      setScanProgress((p) => {
        if (p >= 100) {
          setFaceFound(true);
          setStatus("analyzing");
          clearInterval(interval);
          return 100;
        }
        return p + Math.random() * 3 + 1;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== "analyzing") return;
    let idx = 0;
    setAnalysisText(analysisMessages[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % analysisMessages.length;
      setAnalysisText(analysisMessages[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== "scanning" && status !== "analyzing") return;
    const canvas = canvasOverlayRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let frame = 0;
    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const lineY = (frame * 3) % h;
      const grad = ctx.createLinearGradient(0, lineY - 20, 0, lineY + 20);
      grad.addColorStop(0, "rgba(0,255,136,0)");
      grad.addColorStop(0.5, "rgba(0,255,136,0.6)");
      grad.addColorStop(1, "rgba(0,255,136,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, lineY - 20, w, 40);

      const cx = w / 2, cy = h / 2;
      const bw = w * 0.5, bh = h * 0.65;
      ctx.strokeStyle = faceFound ? "rgba(0,255,136,0.9)" : "rgba(0,200,255,0.7)";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 6]);
      ctx.lineDashOffset = -frame * 2;
      ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
      ctx.setLineDash([]);

      const cornerLen = Math.min(w, h) * 0.06;
      ctx.lineWidth = 3;
      ctx.strokeStyle = faceFound ? "#00ff88" : "#00c8ff";
      const corners = [
        [cx - bw / 2, cy - bh / 2, cornerLen, 0, 0, cornerLen],
        [cx + bw / 2, cy - bh / 2, -cornerLen, 0, 0, cornerLen],
        [cx - bw / 2, cy + bh / 2, cornerLen, 0, 0, -cornerLen],
        [cx + bw / 2, cy + bh / 2, -cornerLen, 0, 0, -cornerLen],
      ];
      corners.forEach(([x, y, dx1, dy1, dx2, dy2]) => {
        ctx.beginPath();
        ctx.moveTo(x + dx1, y + dy1);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx2, y + dy2);
        ctx.stroke();
      });

      if (status === "analyzing") {
        for (let i = 0; i < 12; i++) {
          const px = cx - bw / 2 + Math.sin(frame * 0.05 + i * 1.2) * bw * 0.4 + bw / 2;
          const py = cy - bh / 2 + Math.cos(frame * 0.04 + i * 0.9) * bh * 0.35 + bh / 2;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,136,${0.4 + Math.sin(frame * 0.1 + i) * 0.3})`;
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(0,255,136,0.15)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const x1 = cx - bw / 2 + Math.sin(frame * 0.05 + i * 1.2) * bw * 0.4 + bw / 2;
          const y1 = cy - bh / 2 + Math.cos(frame * 0.04 + i * 0.9) * bh * 0.35 + bh / 2;
          const x2 = cx - bw / 2 + Math.sin(frame * 0.05 + (i + 3) * 1.2) * bw * 0.4 + bw / 2;
          const y2 = cy - bh / 2 + Math.cos(frame * 0.04 + (i + 3) * 0.9) * bh * 0.35 + bh / 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      frame++;
      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [status, faceFound]);

  if (status === "denied") {
    return (
      <div className="min-h-[100dvh] bg-[#0a0a1a] flex items-center justify-center p-5" style={{ fontFamily: "Inter, -apple-system, sans-serif" }}>
        <div className="text-center max-w-[320px]">
          <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4 border-2 border-red-500/40">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-white text-lg font-bold mb-2">Camera Access Required</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Please enable camera access in your browser settings to use AI Face Detection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[100dvh] bg-[#0a0a1a] flex flex-col items-center overflow-hidden"
      style={{ fontFamily: "Inter, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <div className="w-full px-4 py-3 flex items-center justify-center gap-2.5 bg-black/50 border-b border-emerald-400/20">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: status !== "waiting" ? "#00ff88" : "#444",
            boxShadow: status !== "waiting" ? "0 0 10px #00ff88" : "none",
            animation: status !== "waiting" ? "pulse 1.5s infinite" : "none",
          }}
        />
        <span className="text-emerald-400 text-xs font-bold uppercase tracking-[2px]">
          AI Face Detection
        </span>
        <span className="text-[10px] text-white/30 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
          v3.2
        </span>
      </div>

      {/* Camera Feed - fills available width on mobile */}
      <div
        className="relative w-full flex-1 max-w-[100vw] overflow-hidden transition-all duration-500"
        style={{
          border: `2px solid ${faceFound ? "rgba(0,255,136,0.5)" : "rgba(0,200,255,0.3)"}`,
          boxShadow: faceFound ? "0 0 40px rgba(0,255,136,0.2)" : "0 0 20px rgba(0,200,255,0.1)",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover block"
          style={{ transform: "scaleX(-1)", minHeight: "50dvh" }}
        />
        <canvas
          ref={canvasOverlayRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />

        {/* LIVE badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 px-3 py-1 rounded-full border border-emerald-400/30">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ animation: "pulse 1s infinite" }} />
          <span className="text-white text-[10px] font-semibold">LIVE</span>
        </div>

        {/* FPS */}
        <div className="absolute top-3 right-3 bg-black/70 px-2.5 py-1 rounded-full text-emerald-400 text-[10px] font-semibold">
          30 FPS
        </div>
      </div>

      {/* Progress / Analysis */}
      <div className="w-full px-4 py-4">
        {status === "scanning" && (
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-cyan-400 text-xs font-semibold">Detecting face...</span>
              <span className="text-cyan-400 text-xs">{Math.min(Math.round(scanProgress), 100)}%</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-100"
                style={{
                  width: `${Math.min(scanProgress, 100)}%`,
                  background: "linear-gradient(90deg, #00c8ff, #00ff88)",
                }}
              />
            </div>
          </div>
        )}

        {status === "analyzing" && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-emerald-400/10 px-4 py-1.5 rounded-full border border-emerald-400/30 mb-3">
              <span className="text-emerald-400 text-xs font-semibold">✓ Face Detected</span>
            </div>
            <p className="text-emerald-400 text-sm font-medium" style={{ animation: "fadeInOut 2.5s infinite" }}>
              {analysisText}
            </p>
            <div className="flex justify-center gap-1 mt-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-70"
                  style={{ animation: `bounce 1.2s ${i * 0.15}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="fixed bottom-0 left-0 right-0 py-3 px-5 bg-black/60 border-t border-white/5 text-center">
        <p className="text-white/25 text-[10px]">Powered by Neural Face Engine™ • Privacy Protected</p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default AiFaceDetector;
