import { DashboardSidebar } from "./DashboardSidebar";
import { POWERED_BY_TEXT } from "@/lib/branding";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="pl-64 min-h-screen flex flex-col">
        <div className="container p-8 flex-1">
          {children}
        </div>
        <footer className="container px-8 py-4 border-t border-border text-center text-xs text-muted-foreground">
          {POWERED_BY_TEXT}
        </footer>
      </main>
    </div>
  );
}
