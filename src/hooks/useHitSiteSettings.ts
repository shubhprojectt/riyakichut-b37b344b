import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HitSiteSettings {
  siteName: string;
  adminButtonText: string;
  warningText: string;
  quickHitTitle: string;
  phoneLabel: string;
  phonePlaceholder: string;
  hitButtonText: string;
  stopButtonText: string;
  noApisWarning: string;
  adminPanelTitle: string;
  logoutButtonText: string;
  disclaimerTitle: string;
  disclaimerText: string;
  apiListTitle: string;
  addApiButtonText: string;
  noApisText: string;
  logoUrl: string;
  adminPassword: string;
  residentialProxyUrl: string;
  uaRotationEnabled: boolean;
  cloudflareProxyUrl: string;
  hitProxyMode: 'edge' | 'cloudflare';
  // New customizable labels
  enterNumberLabel: string;
  apisActiveText: string;
  sequentialLabel: string;
  parallelLabel: string;
  scheduleLabel: string;
  hittingApisText: string;
  copyrightText: string;
  roundLabel: string;
  hitsLabel: string;
  okLabel: string;
  failLabel: string;
}

const defaultSettings: HitSiteSettings = {
  siteName: 'SHUBH OSINT',
  adminButtonText: 'SETTING',
  warningText: 'Sirf authorized testing aur educational purpose ke liye.',
  quickHitTitle: 'QUICK HIT',
  phoneLabel: 'Phone Number',
  phonePlaceholder: '91XXXXXXXXXX',
  hitButtonText: 'START',
  stopButtonText: 'STOP',
  noApisWarning: 'Admin me APIs add karo pehle.',
  adminPanelTitle: 'ADMIN PANEL',
  logoutButtonText: 'LOGOUT',
  disclaimerTitle: 'DISCLAIMER',
  disclaimerText: 'Yeh tool sirf authorized testing aur educational purpose ke liye hai. Unauthorized use strictly prohibited.',
  apiListTitle: 'API List',
  addApiButtonText: 'Add',
  noApisText: 'No APIs added yet.',
  logoUrl: '',
  adminPassword: 'dark',
  residentialProxyUrl: '',
  uaRotationEnabled: true,
  cloudflareProxyUrl: '',
  // New customizable labels
  enterNumberLabel: 'Enter Number:',
  apisActiveText: 'APIs Active',
  sequentialLabel: 'Sequential',
  parallelLabel: 'Parallel',
  scheduleLabel: 'Schedule',
  hittingApisText: 'Hitting APIs...',
  copyrightText: '© 2026 {TITLE} | All Rights Reserved',
  roundLabel: 'Round',
  hitsLabel: 'Hits',
  okLabel: 'OK',
  failLabel: 'Fail',
};

const STORAGE_KEY = 'hit_site_settings';
const SUPABASE_SETTING_KEY = 'hit_site_settings';

export function useHitSiteSettings() {
  const [settings, setSettings] = useState<HitSiteSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {}
    return defaultSettings;
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const rowIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from backend on mount — backend is source of truth
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('id, setting_value')
          .eq('setting_key', SUPABASE_SETTING_KEY)
          .maybeSingle();

        if (!error && data?.id) {
          rowIdRef.current = data.id;
          if (data.setting_value) {
            const parsed = data.setting_value as unknown as Partial<HitSiteSettings>;
            const merged = { ...defaultSettings, ...parsed };
            setSettings(merged);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
          }
        }
      } catch (err) {
        console.error('Error loading hit site settings:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const saveToBackend = useCallback(async (nextSettings: HitSiteSettings) => {
    try {
      const settingsJson = JSON.parse(JSON.stringify(nextSettings));

      if (!rowIdRef.current) {
        const { data: existing } = await supabase
          .from('app_settings')
          .select('id')
          .eq('setting_key', SUPABASE_SETTING_KEY)
          .maybeSingle();
        if (existing?.id) rowIdRef.current = existing.id;
      }

      if (rowIdRef.current) {
        await supabase
          .from('app_settings')
          .update({ setting_value: settingsJson })
          .eq('id', rowIdRef.current);
      } else {
        const { data } = await supabase
          .from('app_settings')
          .insert([{ setting_key: SUPABASE_SETTING_KEY, setting_value: settingsJson }])
          .select('id')
          .single();
        if (data?.id) rowIdRef.current = data.id;
      }
    } catch (err) {
      console.error('Error saving hit site settings:', err);
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<HitSiteSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };
      // Save to localStorage immediately
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      // Debounce backend save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveToBackend(updated), 700);
      return updated;
    });
  }, [saveToBackend]);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    saveToBackend(defaultSettings);
  }, [saveToBackend]);

  return { settings, updateSettings, resetSettings, defaultSettings, isLoaded };
}
