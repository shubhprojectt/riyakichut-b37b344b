import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, User } from "lucide-react";

const CreditDisplay = () => {
  const { user, isAdmin, signOut, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div className="flex items-center gap-1.5">
      {/* User Badge */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border backdrop-blur-sm bg-emerald-500/15 border-emerald-500/25 transition-all duration-300">
        {isAdmin ? (
          <Shield className="w-3.5 h-3.5 text-violet-400" />
        ) : (
          <User className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className="font-mono font-bold text-[11px] text-emerald-400 max-w-[100px] truncate">
          {user?.email?.split('@')[0] || 'User'}
        </span>
      </div>

      {/* Logout */}
      <button
        onClick={signOut}
        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-all"
        title="Logout"
      >
        <LogOut className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  );
};

export default CreditDisplay;
