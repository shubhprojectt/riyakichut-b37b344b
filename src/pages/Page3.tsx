import { Link } from 'react-router-dom';
import { Info, Settings2 } from 'lucide-react';
import { useHitApis } from '@/hooks/useHitApis';
import { useHitLogs } from '@/hooks/useHitLogs';
import { useHitSiteSettings } from '@/hooks/useHitSiteSettings';
import QuickHitEngine from '@/components/hit-engine/QuickHitEngine';
import LogsPanel from '@/components/hit-engine/LogsPanel';

const Page3 = () => {
  const { apis } = useHitApis();
  const { logs, addLog, clearLogs } = useHitLogs();
  const { settings } = useHitSiteSettings();

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/[0.05] blur-[120px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-secondary/[0.04] blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-accent/[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 min-h-[100dvh] flex flex-col">
        {/* Header - Glassmorphic */}
        <header className="px-4 py-4 glass-card sticky top-0 z-20 border-b border-border/30">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-cover ring-1 ring-primary/20" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xs font-bold glow-gold">
                  {settings.siteName.charAt(0)}
                </div>
              )}
              <h1 className="text-base font-bold text-foreground tracking-tight">{settings.siteName}</h1>
            </div>
            <Link to="/chaudhary99/page3"
              className="h-9 px-4 rounded-xl glass-card hover:bg-primary/10 text-muted-foreground text-xs font-semibold transition-all flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" /> {settings.adminButtonText}
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-5 space-y-4 max-w-xl mx-auto w-full">
          {/* Info Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <Info className="w-4 h-4 text-primary/80 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">{settings.warningText}</p>
          </div>

          <QuickHitEngine
            apis={apis} onLog={addLog}
            title={settings.quickHitTitle || 'HIT ENGINE'}
            phoneLabel={settings.phoneLabel} phonePlaceholder={settings.phonePlaceholder}
            hitButtonText={settings.hitButtonText} stopButtonText={settings.stopButtonText}
            noApisWarning={settings.noApisWarning} uaRotation={settings.uaRotationEnabled}
            cloudflareProxyUrl={settings.cloudflareProxyUrl}
            enterNumberLabel={settings.enterNumberLabel}
            apisActiveText={settings.apisActiveText}
            sequentialLabel={settings.sequentialLabel}
            parallelLabel={settings.parallelLabel}
            scheduleLabel={settings.scheduleLabel}
            hittingApisText={settings.hittingApisText}
            copyrightText={settings.copyrightText}
            roundLabel={settings.roundLabel}
            hitsLabel={settings.hitsLabel}
            okLabel={settings.okLabel}
            failLabel={settings.failLabel}
          />

          <LogsPanel logs={logs} onClear={clearLogs} />

          <Link to="/"
            className="block w-full py-2.5 rounded-xl glass-card text-muted-foreground text-xs font-medium text-center hover:bg-primary/5 hover:text-foreground transition-all">
            ← Back to Main
          </Link>
        </main>
      </div>
    </div>
  );
};

export default Page3;
