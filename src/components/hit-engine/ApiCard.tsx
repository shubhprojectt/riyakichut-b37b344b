import { useState } from 'react';
import { HitApi } from '@/hooks/useHitApis';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Zap, Globe, Shield, RotateCw, Home, Edit2, Trash2, AlertTriangle } from 'lucide-react';

interface ApiCardProps {
  api: HitApi;
  onToggle: () => void;
  onToggleProxy: () => void;
  onToggleResidential: () => void;
  onToggleRotation: () => void;
  onToggleForce: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const methodColors: Record<string, string> = {
  GET: 'bg-neon-green/15 text-neon-green border-neon-green/20',
  POST: 'bg-accent/15 text-accent border-accent/20',
  PUT: 'bg-primary/15 text-primary border-primary/20',
  DELETE: 'bg-destructive/15 text-destructive border-destructive/20',
  PATCH: 'bg-neon-purple/15 text-neon-purple border-neon-purple/20',
};

export default function ApiCard({ api, onToggle, onToggleProxy, onToggleResidential, onToggleRotation, onToggleForce, onEdit, onDelete }: ApiCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
    <div className={`rounded-xl border p-4 space-y-3 transition-all ${
      api.enabled 
        ? 'glass-card' 
        : 'glass-card opacity-50'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${methodColors[api.method] || methodColors.GET}`}>
              {api.method}
            </span>
            <h3 className="text-sm font-semibold text-foreground/90 truncate">{api.name}</h3>
          </div>
          <p className="text-[10px] text-muted-foreground/50 truncate">{api.url}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {[
          { icon: Zap, label: 'Enable', checked: api.enabled, onChange: onToggle },
          { icon: Globe, label: 'Proxy', checked: api.proxy_enabled, onChange: onToggleProxy },
          { icon: Shield, label: 'Force', checked: api.force_proxy, onChange: onToggleForce },
          { icon: RotateCw, label: 'Rotate', checked: api.rotation_enabled, onChange: onToggleRotation },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between p-2 rounded-lg glass-card">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <item.icon className="w-3 h-3" /> {item.label}
            </span>
            <Switch checked={item.checked} onCheckedChange={item.onChange} />
          </div>
        ))}
      </div>

      <button onClick={() => {}} className="w-full flex items-center justify-center gap-1 p-1.5 rounded-lg bg-neon-purple/5 border border-neon-purple/10 text-neon-purple/60 text-[10px]">
        <Home className="w-3 h-3" /> Residential
      </button>

      <div className="flex gap-2">
        <button onClick={onEdit}
          className="flex-1 h-9 rounded-xl glass-card text-muted-foreground text-xs font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={() => setShowDeleteConfirm(true)}
          className="h-9 px-4 rounded-xl bg-destructive/10 border border-destructive/15 text-destructive/70 text-xs font-medium hover:bg-destructive/15 transition-colors flex items-center justify-center gap-2">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>
    </div>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent className="bg-card border-border/30 glass-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Delete API?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            "{api.name}" ko permanently delete kar diya jayega. Kya aap sure hain?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-muted/30 border-border/30 text-foreground/70 hover:bg-muted/50">No</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
