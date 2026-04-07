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
      const { data: { session } } = await supabase.auth.getSession();
      setIsValid(!!session);
      setIsChecking(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsValid(!!session);
      setIsChecking(false);
    });

    return () => subscription.unsubscribe();
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
