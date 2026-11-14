import { Award, Calendar, Users, Clock, Settings, LogOut, Store, DollarSign } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/config/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePractice } from "@/context/PracticeContext";

const menuItems = [
  {
    title: "Dashboard",
    icon: Clock,
    path: "/",
  },
  {
    title: "Appointments",
    icon: Calendar,
    path: "/appointments",
  },
  {
    title: "Members",
    icon: Users,
    path: "/patients",
  },
  {
    title: "Rewards",
    icon: Award,
    path: "/rewards",
  },
  {
    title: "Inventory",
    icon: Store,
    path: "/inventory",
  },
  {
    title: "Sales",
    icon: DollarSign,
    path: "/sales",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
  },
 
];

export function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { practice, practices, loading, switchPractice } = usePractice();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card flex flex-col">
      {/* Practice brand: logo and name in the practice's own colours */}
      <div className="p-6 flex items-center gap-3 min-h-[88px]">
        {practice?.logo_url && (
          <img
            src={practice.logo_url}
            alt=""
            className="h-10 w-10 rounded-md object-contain shrink-0"
          />
        )}
        {loading ? (
          <div className="h-6 w-36 rounded bg-muted animate-pulse" />
        ) : (
          <h1 className="text-xl font-bold leading-tight text-primary break-words">
            {practice?.name ?? "Care Africa"}
          </h1>
        )}
      </div>

      {practices.length > 1 && (
        <div className="px-6 pb-4">
          <label htmlFor="practice-switch" className="sr-only">Switch practice</label>
          <select
            id="practice-switch"
            value={practice?.id}
            onChange={(e) => switchPractice(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            {practices.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.title}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-md transition-colors",
                  "hover:bg-primary/10 hover:text-primary",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium rounded-md transition-colors",
            "text-muted-foreground hover:bg-primary/10 hover:text-primary"
          )}
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
