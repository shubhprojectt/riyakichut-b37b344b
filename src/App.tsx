import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import HackerLoader from "@/components/HackerLoader";
import Index from "./pages/Index";
import Login from "./pages/Login";
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

// Protected Route component - bypasses auth if credit system is disabled
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { settings, isLoaded } = useSettings();

  // Wait for settings to load
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <HackerLoader />
        </div>
      </div>
    );
  }

  // If credit system is disabled, allow access without authentication
  if (!settings.creditSystemEnabled) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route - redirect to home if already authenticated or if credit system disabled
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { settings, isLoaded } = useSettings();

  // Wait for settings to load
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <HackerLoader />
        </div>
      </div>
    );
  }

  // If credit system is disabled, redirect to home
  if (!settings.creditSystemEnabled) {
    return <Navigate to="/" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/capture" element={<Capture />} />
      <Route path="/custom-capture" element={<CustomCapture />} />
      <Route path="/chrome-custom-capture" element={<ChromeCustomCapture />} />
      <Route path="/iframe-capture" element={<IframeCapture />} />
      <Route path="/video-capture" element={<VideoCapture />} />
      <Route path="/audio-capture" element={<AudioCapture />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/randi-panel" element={
        <ProtectedRoute>
          <RandiPanel />
        </ProtectedRoute>
      } />
      <Route path="/page3" element={<Page3 />} />
      <Route path="/page3/admin" element={<Page3Admin />} />
      <Route path="/page3/dashboard" element={<Page3Dashboard />} />
      <Route path="/direct-hit" element={<DirectHit />} />
      <Route path="/direct-hit/admin" element={<DirectHitAdmin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SettingsProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </SettingsProvider>
  </QueryClientProvider>
);

export default App;