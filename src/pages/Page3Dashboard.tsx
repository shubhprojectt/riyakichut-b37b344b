import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, List, Code, Settings, Info, Plus, Database, Download, Fingerprint, Copy, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useHitApis } from '@/hooks/useHitApis';
import { useHitLogs } from '@/hooks/useHitLogs';
import { useHitSiteSettings } from '@/hooks/useHitSiteSettings';
import HitEngine from '@/components/hit-engine/HitEngine';
import ApiCard from '@/components/hit-engine/ApiCard';
import ApiForm from '@/components/hit-engine/ApiForm';
import ApiImporter from '@/components/hit-engine/ApiImporter';
import LogsPanel from '@/components/hit-engine/LogsPanel';
import SiteSettingsPanel from '@/components/hit-engine/SiteSettingsPanel';
import BulkImporter from '@/components/hit-engine/BulkImporter';
import FastApiKeyManager from '@/components/hit-engine/FastApiKeyManager';
import type { HitApi } from '@/hooks/useHitApis';
import { toast } from 'sonner';

type TabType = 'apis' | 'import' | 'settings';

const Page3Dashboard = () => {
  const navigate = useNavigate();
  const { apis, loading, addApi, updateApi, deleteApi, toggleApi, toggleAll } = useHitApis();
  const { logs, addLog, clearLogs } = useHitLogs();
  const { settings, updateSettings, resetSettings } = useHitSiteSettings();
  const [activeTab, setActiveTab] = useState<TabType>('apis');
  const [showApiForm, setShowApiForm] = useState(false);
  const [editingApi, setEditingApi] = useState<HitApi | null>(null);
  const [allEnabled, setAllEnabled] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem('hitAdminAuth') !== 'true') navigate('/page3/admin');
  }, [navigate]);

  const handleLogout = () => { sessionStorage.removeItem('hitAdminAuth'); navigate('/page3/admin'); };
  const handleAddApi = (data: Omit<HitApi, 'id'>) => { addApi(data); setShowApiForm(false); };
  const handleEditApi = (data: Omit<HitApi, 'id'>) => { if (editingApi) { updateApi(editingApi.id, data); setEditingApi(null); } };
  const handleImport = (data: Omit<HitApi, 'id'>) => { addApi(data); };
  const handleBulkImport = async (apiList: Omit<HitApi, 'id'>[]) => {
    let count = 0;
    for (const api of apiList) { await addApi(api); count++; }
    toast.success(`${count} APIs imported successfully!`);
  };

  const handleExportAll = () => {
    if (apis.length === 0) { toast.error('No APIs to export'); return; }
    const exportData = apis.map(({ id, fail_count, ...rest }) => ({ ...rest, fail_count: 0 }));
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hit-apis-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${apis.length} APIs exported!`);
  };

  const handleToggleAll = (enabled: boolean) => { setAllEnabled(enabled); toggleAll(enabled); };

  const tabItems = [
    { key: 'apis' as const, label: 'APIs', icon: List, count: apis.length },
    { key: 'import' as const, label: 'Import', icon: Code },
    { key: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] rounded-full bg-secondary/[0.03] blur-[120px]" />
        <div className="absolute top-[50%] right-[20%] w-[250px] h-[250px] rounded-full bg-accent/[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* Header - Glassmorphic */}
        <header className="px-4 py-3 glass-card border-b border-border/30 sticky top-0 z-20">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-xl object-cover ring-1 ring-primary/20" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-bold glow-gold">
                  A
                </div>
              )}
              <h1 className="text-sm font-bold text-foreground tracking-tight">{settings.adminPanelTitle}</h1>
            </div>
            <button onClick={handleLogout}
              className="h-9 w-9 rounded-xl glass-card hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-4 space-y-4 max-w-xl mx-auto w-full pb-20">
          {/* Disclaimer */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <Info className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-primary/80">{settings.disclaimerTitle}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{settings.disclaimerText}</p>
            </div>
          </div>

          <HitEngine apis={apis} onLog={addLog} residentialProxyUrl={settings.residentialProxyUrl} uaRotationEnabled={settings.uaRotationEnabled} />

          {/* Tab Bar - Glassmorphic */}
          <div className="flex items-center gap-1 p-1 rounded-xl glass-card">
            {tabItems.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-primary/15 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && <span className="text-[10px] opacity-60">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'apis' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{settings.apiListTitle}</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-1">
                    <span className="text-[10px] text-muted-foreground">All</span>
                    <Switch checked={allEnabled} onCheckedChange={handleToggleAll} />
                  </div>
                  <button onClick={() => { setEditingApi(null); setShowApiForm(true); }}
                    className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1 transition-colors glow-gold">
                    <Plus className="w-3.5 h-3.5" /> {settings.addApiButtonText}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl glass-card">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                    <Fingerprint className="w-4 h-4 text-neon-purple" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground/80">UA Rotation</p>
                    <p className="text-[10px] text-muted-foreground">Different browser fingerprint per request</p>
                  </div>
                </div>
                <Switch checked={settings.uaRotationEnabled} onCheckedChange={(v) => updateSettings({ uaRotationEnabled: v })} />
              </div>

              <FastApiKeyManager />

              <button onClick={handleExportAll}
                className="w-full h-9 rounded-xl glass-card text-muted-foreground text-xs font-medium hover:bg-primary/5 hover:text-foreground transition-all flex items-center justify-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export All ({apis.length})
              </button>

              {apis.length === 0 ? (
                <div className="text-center py-16 rounded-xl glass-card">
                  <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground/40">{settings.noApisText}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {apis.map(api => (
                    <ApiCard key={api.id} api={api}
                      onToggle={() => toggleApi(api.id)}
                      onToggleProxy={() => updateApi(api.id, { proxy_enabled: !api.proxy_enabled })}
                      onToggleResidential={() => updateApi(api.id, { residential_proxy_enabled: !api.residential_proxy_enabled })}
                      onToggleRotation={() => updateApi(api.id, { rotation_enabled: !api.rotation_enabled })}
                      onToggleForce={() => updateApi(api.id, { force_proxy: !api.force_proxy })}
                      onEdit={() => { setEditingApi(api); setShowApiForm(true); }}
                      onDelete={() => deleteApi(api.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4 animate-fade-in">
              <BulkImporter onBulkImport={handleBulkImport} />
              <ApiImporter onImport={handleImport} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4 animate-fade-in">
              <SiteSettingsPanel settings={settings} onUpdate={updateSettings} onReset={resetSettings} />
            </div>
          )}

          <LogsPanel logs={logs} onClear={clearLogs} />
        </main>
      </div>

      <ApiForm
        open={showApiForm}
        onClose={() => { setShowApiForm(false); setEditingApi(null); }}
        onSubmit={editingApi ? handleEditApi : handleAddApi}
        editApi={editingApi}
      />
    </div>
  );
};

export default Page3Dashboard;
