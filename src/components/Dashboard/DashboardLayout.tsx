import { DashboardSidebar } from "./DashboardSidebar";
import { POWERED_BY_TEXT } from "@/lib/branding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useLocation } from "react-router-dom";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="pl-64 min-h-screen flex flex-col print:pl-0">
        <div className="mx-auto w-full max-w-[1400px] flex-1 px-8 py-8 xl:px-10">
          <ErrorBoundary resetKey={location.pathname}>{children}</ErrorBoundary>
        </div>
        <footer className="mx-auto w-full max-w-[1400px] px-8 py-5 text-center text-xs text-muted-foreground/80 xl:px-10">
          {POWERED_BY_TEXT}
        </footer>
      </main>
    </div>
  );
}
