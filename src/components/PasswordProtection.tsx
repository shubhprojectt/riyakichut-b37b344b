import { type ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import HackerLoader from "@/components/HackerLoader";
import { supabase } from "@/integrations/supabase/client";

interface PasswordProtectionProps {
  children: ReactNode;
}

const PasswordProtection = ({ children }: PasswordProtectionProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const token = sessionStorage.getItem('siteSessionToken');
      if (!token) {
        setIsChecking(false);
        setIsValid(false);
        return;
      }

      try {
        const { data } = await supabase.functions.invoke('auth-verify', {
          body: { sessionToken: token }
        });
        if (data?.valid) {
          setIsValid(true);
        } else {
          sessionStorage.removeItem('siteSessionToken');
          setIsValid(false);
        }
      } catch {
        // If verify fails, still allow if token exists (offline mode)
        setIsValid(true);
      }
      setIsChecking(false);
    };

    checkSession();
  }, []);

  if (isChecking) {
    return <HackerLoader />;
  }

  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PasswordProtection;
