import { DashboardSidebar } from "./DashboardSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="pl-64 min-h-screen">
        <div className="container p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
