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
    if (sessionStorage.getItem('hitAdminAuth') !== 'true') {
      navigate('/page3/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('hitAdminAuth');
    navigate('/page3/admin');
  };

  const handleAddApi = (data: Omit<HitApi, 'id'>) => {
    addApi(data);
    setShowApiForm(false);
  };

  const handleEditApi = (data: Omit<HitApi, 'id'>) => {
    if (editingApi) {
      updateApi(editingApi.id, data);
      setEditingApi(null);
    }
  };

  const handleImport = (data: Omit<HitApi, 'id'>) => {
    addApi(data);
  };

  const handleBulkImport = async (apiList: Omit<HitApi, 'id'>[]) => {
    let count = 0;
    for (const api of apiList) {
      await addApi(api);
      count++;
    }
    toast.success(`${count} APIs imported successfully!`);
  };

  const handleExportAll = () => {
    if (apis.length === 0) {
      toast.error('No APIs to export');
      return;
    }
    const exportData = apis.map(({ id, ...rest }) => rest);
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

  const handleToggleAll = (enabled: boolean) => {
    setAllEnabled(enabled);
    toggleAll(enabled);
  };

  const tabItems = [
    { key: 'apis' as const, label: 'APIs', icon: List, count: apis.length },
    { key: 'import' as const, label: 'Import', icon: Code },
    { key: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#09090b] relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/[0.06] blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[350px] h-[350px] rounded-full bg-blue-600/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* Header */}
        <header className="px-4 py-3 bg-white/[0.03] backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-20">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  A
                </div>
              )}
              <h1 className="text-sm font-semibold text-white tracking-tight">{settings.adminPanelTitle}</h1>
            </div>
            <button onClick={handleLogout}
              className="h-9 w-9 rounded-xl bg-white/[0.06] hover:bg-red-500/20 border border-white/[0.08] text-white/50 hover:text-red-400 flex items-center justify-center transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-4 space-y-4 max-w-xl mx-auto w-full pb-20">
          {/* Disclaimer */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/[0.1]">
            <Info className="w-4 h-4 text-amber-400/70 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-medium text-amber-400/80">{settings.disclaimerTitle}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{settings.disclaimerText}</p>
            </div>
          </div>

          {/* Hit Engine */}
          <HitEngine apis={apis} onLog={addLog} residentialProxyUrl={settings.residentialProxyUrl} uaRotationEnabled={settings.uaRotationEnabled} />

          {/* Tab Bar */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {tabItems.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 h-9 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-white/[0.08] text-white shadow-sm'
                    : 'text-white/35 hover:text-white/60'
                }`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-[10px] opacity-60">({tab.count})</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'apis' && (
            <div className="space-y-3 animate-fade-in">
              {/* Controls Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white/60">{settings.apiListTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-1">
                    <span className="text-[10px] text-white/30">All</span>
                    <Switch checked={allEnabled} onCheckedChange={handleToggleAll} />
                  </div>
                  <button onClick={() => { setEditingApi(null); setShowApiForm(true); }}
                    className="h-8 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> {settings.addApiButtonText}
                  </button>
                </div>
              </div>

              {/* UA Rotation */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Fingerprint className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/80">UA Rotation</p>
                    <p className="text-[10px] text-white/30">Different browser fingerprint per request</p>
                  </div>
                </div>
                <Switch checked={settings.uaRotationEnabled} onCheckedChange={(v) => updateSettings({ uaRotationEnabled: v })} />
              </div>

              {/* Fast API Link */}
              <button onClick={() => {
                const url = `https://qetbvgvdsgetkkupbbse.supabase.co/functions/v1/fast-hit-all`;
                navigator.clipboard.writeText(url);
                toast.success('Fast API link copied!');
              }}
                className="w-full h-9 rounded-xl bg-violet-600/20 border border-violet-500/20 text-violet-300 text-xs font-medium hover:bg-violet-600/30 transition-all flex items-center justify-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Copy Fast API Link <Copy className="w-3 h-3 opacity-60" />
              </button>

              {/* Export */}
              <button onClick={handleExportAll}
                className="w-full h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/40 text-xs font-medium hover:bg-white/[0.06] hover:text-white/60 transition-all flex items-center justify-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export All ({apis.length})
              </button>

              {/* API List */}
              {apis.length === 0 ? (
                <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <Database className="w-10 h-10 mx-auto mb-3 text-white/10" />
                  <p className="text-sm text-white/25">{settings.noApisText}</p>
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

          {/* Logs */}
          <LogsPanel logs={logs} onClear={clearLogs} />
        </main>
      </div>

      {/* API Form Dialog */}
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
