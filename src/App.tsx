import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SettingsProvider } from "@/contexts/SettingsContext";
import Index from "./pages/Index";
import Capture from "./pages/Capture";
import CustomCapture from "./pages/CustomCapture";
import ChromeCustomCapture from "./pages/ChromeCustomCapture";
import IframeCapture from "./pages/IframeCapture";
import VideoCapture from "./pages/VideoCapture";
import AudioCapture from "./pages/AudioCapture";
import Admin from "./pages/Admin";
import Page3 from "./pages/Page3";
import Page3Admin from "./pages/Page3Admin";
import Page3Dashboard from "./pages/Page3Dashboard";
import RandiPanel from "./pages/RandiPanel";
import DirectHit from "./pages/DirectHit";
import DirectHitAdmin from "./pages/DirectHitAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/capture" element={<Capture />} />
            <Route path="/custom-capture" element={<CustomCapture />} />
            <Route path="/chrome-custom-capture" element={<ChromeCustomCapture />} />
            <Route path="/iframe-capture" element={<IframeCapture />} />
            <Route path="/video-capture" element={<VideoCapture />} />
            <Route path="/audio-capture" element={<AudioCapture />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/randi-panel" element={<RandiPanel />} />
            <Route path="/page3" element={<Page3 />} />
            <Route path="/page3/admin" element={<Page3Admin />} />
            <Route path="/page3/dashboard" element={<Page3Dashboard />} />
            <Route path="/direct-hit" element={<DirectHit />} />
            <Route path="/direct-hit/admin" element={<DirectHitAdmin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

export default App;
