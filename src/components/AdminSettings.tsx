import { useState } from "react";
import { Settings, Minimize2, Maximize2, Square, Image, Trash2, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useSettings } from "@/contexts/SettingsContext";
import { useNavigate } from "react-router-dom";
import defaultLoaderImage from "@/assets/loader-logo.jpg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { cn } from "@/lib/utils";

const AdminSettings = () => {
  const { settings, updateSettings } = useSettings();
  const { signOut, isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
   const [loaderUrlInput, setLoaderUrlInput] = useState(settings.loaderImageUrl || "");

  const tabSizes = [
    { value: "small", label: "Small", icon: Minimize2 },
    { value: "medium", label: "Medium", icon: Square },
    { value: "large", label: "Large", icon: Maximize2 },
  ] as const;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 hover:border-primary/50 transition-all"
        >
          <Settings className="h-4 w-4 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground font-display text-lg">
            Tab Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 py-4">
          {/* Tab Size Control */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Tab Size
            </label>
            <div className="grid grid-cols-3 gap-3">
              {tabSizes.map((size) => {
                const IconComponent = size.icon;
                const isActive = settings.tabSize === size.value;
                return (
                  <button
                    key={size.value}
                    onClick={() => updateSettings({ tabSize: size.value })}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                      isActive
                        ? "border-primary bg-primary/15 text-primary shadow-lg shadow-primary/20"
                        : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground bg-background/50"
                    )}
                  >
                    <IconComponent className={cn(
                      "transition-all",
                      size.value === "small" && "w-4 h-4",
                      size.value === "medium" && "w-5 h-5",
                      size.value === "large" && "w-6 h-6"
                    )} />
                    <span className="text-xs font-medium">{size.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Preview
            </label>
            <div className="p-4 rounded-xl border border-border bg-background/50">
              <div className={cn(
                "flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 text-primary mx-auto",
                settings.tabSize === "small" && "w-24 h-14 text-[9px]",
                settings.tabSize === "medium" && "w-28 h-16 text-[10px]",
                settings.tabSize === "large" && "w-32 h-20 text-xs"
              )}>
                <Settings className={cn(
                  settings.tabSize === "small" && "w-4 h-4",
                  settings.tabSize === "medium" && "w-5 h-5",
                  settings.tabSize === "large" && "w-6 h-6"
                )} />
                <span className="font-semibold uppercase">Sample</span>
              </div>
            </div>
          </div>

           {/* Loader Image Setting */}
           <div className="space-y-3 pt-2 border-t border-border">
             <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
               <Image className="w-4 h-4" />
               Loader Image
             </label>
             <p className="text-xs text-muted-foreground/70">
               Custom image URL for loading screen (leave empty for default)
             </p>
             <div className="flex gap-2">
               <Input
                 value={loaderUrlInput}
                 onChange={(e) => setLoaderUrlInput(e.target.value)}
                 placeholder="https://example.com/image.png"
                 className="flex-1 text-xs"
               />
               <Button
                 size="sm"
                 onClick={() => updateSettings({ loaderImageUrl: loaderUrlInput })}
                 className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/40"
               >
                 Save
               </Button>
               {settings.loaderImageUrl && (
                 <Button
                   size="sm"
                   variant="ghost"
                   onClick={() => {
                     setLoaderUrlInput("");
                     updateSettings({ loaderImageUrl: "" });
                   }}
                   className="text-destructive hover:bg-destructive/20"
                 >
                   <Trash2 className="w-4 h-4" />
                 </Button>
               )}
             </div>
             {/* Loader Preview */}
             <div className="flex justify-center p-4 rounded-xl border border-neon-purple/30 bg-background">
               <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-neon-purple/50">
                 <img 
                   src={settings.loaderImageUrl?.trim() || defaultLoaderImage} 
                   alt="Loader Preview" 
                   className="w-full h-full object-cover"
                 />
               </div>
              </div>
           </div>

          {/* Logout */}
          {isAuthenticated && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Logout</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{user?.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { setIsOpen(false); signOut(); }}
                  className="text-xs"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminSettings;