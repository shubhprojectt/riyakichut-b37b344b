import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CreditDisplay = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Logout */}
      <button
        onClick={handleLogout}
        className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-all"
        title="Logout"
      >
        <LogOut className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  );
};

export default CreditDisplay;
