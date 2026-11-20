import { useEffect, useState } from "react";
import {
  Award,
  Calendar,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Package,
  ShoppingBag,
  ChevronsUpDown,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/config/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePractice, type PracticeRole } from "@/context/PracticeContext";

const sections = [
  {
    label: null,
    items: [{ title: "Dashboard", icon: LayoutDashboard, path: "/" }],
  },
  {
    label: "Front desk",
    items: [
      { title: "Appointments", icon: Calendar, path: "/appointments" },
      { title: "Members", icon: Users, path: "/patients" },
    ],
  },
  {
    label: "Loyalty & retail",
    items: [
      { title: "Rewards", icon: Award, path: "/rewards" },
      { title: "Inventory", icon: Package, path: "/inventory" },
      { title: "Sales", icon: ShoppingBag, path: "/sales" },
    ],
  },
];

const ROLE_LABEL: Record<PracticeRole, string> = {
  practice_admin: "Practice admin",
  doctor: "Practitioner",
  staff: "Staff",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { practice, practices, loading, switchPractice } = usePractice();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out");
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to sign out");
    }
  };

  const NavButton = ({ title, icon: Icon, path }: { title: string; icon: React.ComponentType<{ className?: string }>; path: string }) => {
    const isActive = location.pathname === path;
    return (
      <button
        onClick={() => navigate(path)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-ink"
        )}
      >
        {isActive && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
        <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-primary" : "text-muted-foreground group-hover:text-ink")} />
        <span>{title}</span>
      </button>
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Practice identity, in the practice's own colours */}
      <div className="px-4 pt-5 pb-4">
        <div className="relative flex items-center gap-3 rounded-xl border border-border bg-background/60 p-2.5">
          {practice?.logo_url ? (
            <img src={practice.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain ring-1 ring-border" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {practice ? initials(practice.name) : "CA"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            ) : (
              <p className="truncate text-sm font-bold text-ink" title={practice?.name}>
                {practice?.name ?? "Care Africa"}
              </p>
            )}
            <p className="truncate text-xs text-muted-foreground">
              {practice ? ROLE_LABEL[practice.role] : " "}
            </p>
          </div>
          {practices.length > 1 && (
            <>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              <label htmlFor="practice-switch" className="sr-only">Switch practice</label>
              <select
                id="practice-switch"
                value={practice?.id}
                onChange={(e) => switchPractice(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {practices.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        {sections.map((section, i) => (
          <div key={i} className={cn(i > 0 && "mt-6")}>
            {section.label && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavButton key={item.path} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings and account */}
      <div className="border-t border-border p-4 space-y-3">
        <NavButton title="Settings" icon={Settings} path="/settings" />
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-ink">
            {email ? email[0]!.toUpperCase() : "·"}
          </span>
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={email ?? undefined}>
            {email ?? " "}
          </p>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
