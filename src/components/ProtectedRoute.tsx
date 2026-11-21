import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/config/supabase";
import { Loader2 } from "lucide-react";
import { getTwoStepStatus, type TwoStepStatus } from "@/lib/twoStep";
import { logSignInOnce } from "@/lib/audit";

/**
 * Lets someone in only when they're signed in AND have done two-step
 * sign-in where it's required. Otherwise sends them to sign in, to set up
 * their authenticator app, or to enter its code.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "signed-out" | TwoStepStatus>("loading");
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) setState("signed-out");
        return;
      }
      const status = await getTwoStepStatus();
      if (status === "ok") logSignInOnce();
      if (!cancelled) setState(status);
    };

    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "signed-out") return <Navigate to="/login" state={{ from: location }} replace />;
  if (state === "setup") return <Navigate to="/two-step/setup" state={{ from: location }} replace />;
  if (state === "verify") return <Navigate to="/two-step/verify" state={{ from: location }} replace />;

  return <>{children}</>;
}
