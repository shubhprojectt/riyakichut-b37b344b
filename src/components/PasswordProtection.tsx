import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import HackerLoader from "@/components/HackerLoader";

interface PasswordProtectionProps {
  children: ReactNode;
}

const PasswordProtection = ({ children }: PasswordProtectionProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <HackerLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PasswordProtection;
