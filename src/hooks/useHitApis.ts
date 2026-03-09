import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HitApi {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body: Record<string, unknown>;
  bodyType: 'json' | 'form-urlencoded' | 'multipart' | 'text' | 'none';
  query_params: Record<string, string>;
  enabled: boolean;
  proxy_enabled: boolean;
  force_proxy: boolean;
  rotation_enabled: boolean;
  residential_proxy_enabled: boolean;
  fail_count: number;
}

export function useHitApis() {
  const [apis, setApis] = useState<HitApi[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch APIs from database
  const fetchApis = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('hit_apis')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: HitApi[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        url: row.url,
        method: row.method as HitApi['method'],
        headers: (row.headers as Record<string, string>) || {},
        body: (row.body as Record<string, unknown>) || {},
        bodyType: row.body_type as HitApi['bodyType'],
        query_params: (row.query_params as Record<string, string>) || {},
        enabled: row.enabled,
        proxy_enabled: row.proxy_enabled,
        force_proxy: row.force_proxy,
        rotation_enabled: row.rotation_enabled,
        residential_proxy_enabled: row.residential_proxy_enabled,
      }));

      setApis(mapped);
    } catch (err) {
      console.error('Failed to fetch APIs:', err);
      toast.error('Failed to load APIs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('hit_apis_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hit_apis' }, () => {
        fetchApis();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchApis]);

  const addApi = useCallback(async (api: Omit<HitApi, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('hit_apis')
        .insert({
          name: api.name,
          url: api.url,
          method: api.method,
          headers: api.headers as any,
          body: api.body as any,
          body_type: api.bodyType,
          query_params: api.query_params as any,
          enabled: api.enabled,
          proxy_enabled: api.proxy_enabled,
          force_proxy: api.force_proxy,
          rotation_enabled: api.rotation_enabled,
          residential_proxy_enabled: api.residential_proxy_enabled,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('API added');
      return data;
    } catch (err) {
      console.error('Failed to add API:', err);
      toast.error('Failed to add API');
    }
  }, []);

  const updateApi = useCallback(async (id: string, updates: Partial<HitApi>) => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.url !== undefined) dbUpdates.url = updates.url;
      if (updates.method !== undefined) dbUpdates.method = updates.method;
      if (updates.headers !== undefined) dbUpdates.headers = updates.headers;
      if (updates.body !== undefined) dbUpdates.body = updates.body;
      if (updates.bodyType !== undefined) dbUpdates.body_type = updates.bodyType;
      if (updates.query_params !== undefined) dbUpdates.query_params = updates.query_params;
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.proxy_enabled !== undefined) dbUpdates.proxy_enabled = updates.proxy_enabled;
      if (updates.force_proxy !== undefined) dbUpdates.force_proxy = updates.force_proxy;
      if (updates.rotation_enabled !== undefined) dbUpdates.rotation_enabled = updates.rotation_enabled;
      if (updates.residential_proxy_enabled !== undefined) dbUpdates.residential_proxy_enabled = updates.residential_proxy_enabled;

      const { error } = await supabase
        .from('hit_apis')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update API:', err);
      toast.error('Failed to update API');
    }
  }, []);

  const deleteApi = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('hit_apis')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('API deleted');
    } catch (err) {
      console.error('Failed to delete API:', err);
      toast.error('Failed to delete API');
    }
  }, []);

  const toggleApi = useCallback(async (id: string) => {
    const api = apis.find(a => a.id === id);
    if (!api) return;
    await updateApi(id, { enabled: !api.enabled });
  }, [apis, updateApi]);

  const toggleAll = useCallback(async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('hit_apis')
        .update({ enabled })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows

      if (error) throw error;
    } catch (err) {
      console.error('Failed to toggle all:', err);
      toast.error('Failed to toggle all APIs');
    }
  }, []);

  const enabledApis = apis.filter(a => a.enabled);

  return { apis, enabledApis, loading, addApi, updateApi, deleteApi, toggleApi, toggleAll, setApis };
}
