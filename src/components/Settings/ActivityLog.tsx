import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import {
  CalendarClock,
  ChevronDown,
  Download,
  FileHeart,
  Loader2,
  Lock,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RandIcon } from "@/components/icons/RandIcon";
import { usePractice } from "@/context/PracticeContext";
import { ROLE_INFO } from "@/lib/roles";
import { listTeam, type TeamMember } from "@/lib/db/team";
import { getActivity, type ActivityCategory, type ActivityEntry } from "@/lib/db/activity";
import { logExport } from "@/lib/audit";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: ActivityCategory; label: string; icon: React.ComponentType<{ className?: string }>; tone: string }[] = [
  { id: "security", label: "Sign-ins & security", icon: ShieldCheck, tone: "bg-slate-100 text-slate-700" },
  { id: "team", label: "Team", icon: Users, tone: "bg-indigo-50 text-indigo-700" },
  { id: "clinical", label: "Clinical records", icon: FileHeart, tone: "bg-rose-50 text-rose-700" },
  { id: "members", label: "Members", icon: UserRound, tone: "bg-primary/10 text-primary" },
  { id: "appointments", label: "Appointments", icon: CalendarClock, tone: "bg-teal-50 text-teal-700" },
  { id: "sales", label: "Sales & stock", icon: RandIcon, tone: "bg-amber-50 text-amber-700" },
  { id: "settings", label: "Settings", icon: Settings2, tone: "bg-muted text-ink" },
];
const CATEGORY = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<ActivityCategory, (typeof CATEGORIES)[number]>;

function dayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE d MMMM yyyy");
}

/** "Chrome on Windows" from a browser's user-agent text. */
function device(ua: string | null) {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : null;
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : null;
  return [browser, os].filter(Boolean).join(" on ") || ua.slice(0, 60);
}

function show(v: unknown) {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function EntryRow({ e }: { e: ActivityEntry }) {
  const [open, setOpen] = useState(false);
  const cat = CATEGORY[e.category];
  const Icon = cat.icon;
  const values = e.details?.values ?? {};
  // Don't repeat the person as "team member" on their own sign-in events.
  const target = e.target_name && e.target_name !== e.actor_name && e.target_name !== e.actor_email ? e.target_name : null;
  const hasMore = !!(e.ip || e.user_agent || e.details?.changed?.length || Object.keys(values).length);

  return (
    <li className="px-6 py-3">
      <button
        type="button"
        onClick={() => hasMore && setOpen((o) => !o)}
        className={cn("flex w-full items-start gap-4 text-left", hasMore && "cursor-pointer")}
        aria-expanded={hasMore ? open : undefined}
      >
        <span className="tabular w-11 shrink-0 pt-1.5 text-xs font-medium text-muted-foreground">
          {format(new Date(e.occurred_at), "HH:mm")}
        </span>
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cat.tone)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink">
            <span className="font-semibold">{e.actor_name}</span>
            {e.actor_role && (
              <span className="ml-1.5 text-xs text-muted-foreground">· {ROLE_INFO[e.actor_role]?.label ?? e.actor_role}</span>
            )}
          </span>
          <span className="block text-sm text-ink/90">{e.description}</span>
          {(e.patient_name || target) && (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {e.patient_name && <>Member: <span className="font-medium text-ink/80">{e.patient_name}</span></>}
              {e.patient_name && target && " · "}
              {target && <>Team member: <span className="font-medium text-ink/80">{target}</span></>}
            </span>
          )}
        </span>
        {hasMore && (
          <ChevronDown className={cn("mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        )}
      </button>

      {open && (
        <dl className="mt-3 ml-[100px] grid gap-x-6 gap-y-1.5 rounded-lg bg-muted/50 px-4 py-3 text-xs sm:grid-cols-[max-content_1fr]">
          {Object.entries(values).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-medium capitalize text-muted-foreground">{k.replace(/_/g, " ")}</dt>
              <dd className="text-ink">
                {v && typeof v === "object" && "from" in (v as object)
                  ? `${show((v as { from: unknown }).from)} → ${show((v as { to: unknown }).to)}`
                  : show(v)}
              </dd>
            </div>
          ))}
          {!!e.details?.changed?.length && !Object.keys(values).length && (
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Fields changed</dt>
              <dd className="text-ink">{e.details.changed.map((c) => c.replace(/_/g, " ")).join(", ")}</dd>
            </div>
          )}
          {e.category === "clinical" && (
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Content</dt>
              <dd className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" /> Clinical details are never copied into the log
              </dd>
            </div>
          )}
          {e.ip && (
            <div className="contents">
              <dt className="font-medium text-muted-foreground">IP address</dt>
              <dd className="font-mono text-ink">{e.ip}</dd>
            </div>
          )}
          {e.user_agent && (
            <div className="contents">
              <dt className="font-medium text-muted-foreground">Device</dt>
              <dd className="text-ink" title={e.user_agent}>{device(e.user_agent)}</dd>
            </div>
          )}
          <div className="contents">
            <dt className="font-medium text-muted-foreground">Recorded by</dt>
            <dd className="text-ink">{e.source === "app" ? "The Care Africa app" : "The database (can't be skipped)"}</dd>
          </div>
        </dl>
      )}
    </li>
  );
}

/** Settings → Activity log (practice admins only). */
export function ActivityLog() {
  const { practice } = usePractice();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [category, setCategory] = useState<ActivityCategory | "">("");
  const [actorId, setActorId] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const requestId = useRef(0);
  const PAGE = 50;

  const filters = useMemo(
    () => ({ category: category || null, actorId: actorId || null, search: query || null }),
    [category, actorId, query]
  );

  // Search as you type, after a short pause.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!practice) return;
    const id = ++requestId.current;
    setLoading(true);
    try {
      const rows = await getActivity(practice.id, filters, undefined, PAGE);
      if (id !== requestId.current) return;
      setEntries(rows);
      setHasMore(rows.length === PAGE);
    } catch (error) {
      if (id === requestId.current) toast.error(error instanceof Error ? error.message : "Couldn't load the activity log");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [practice?.id, filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (practice) listTeam(practice.id).then(setTeam).catch(() => setTeam([]));
  }, [practice?.id]);

  if (!practice) return null;
  if (practice.role !== "practice_admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity log</CardTitle>
          <CardDescription>Only a practice admin can see the activity log.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const loadMore = async () => {
    const last = entries[entries.length - 1];
    if (!last) return;
    setLoadingMore(true);
    try {
      const rows = await getActivity(practice.id, filters, last.id, PAGE);
      setEntries((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: ActivityEntry[] = [];
      let before: number | undefined;
      // Up to 10 000 entries with the current filters.
      for (let i = 0; i < 20; i++) {
        const rows = await getActivity(practice.id, filters, before, 500);
        all.push(...rows);
        if (rows.length < 500) break;
        before = rows[rows.length - 1].id;
      }
      const header = ["Date", "Time", "Person", "Email", "Role", "Category", "What happened", "Member", "Team member", "Details", "IP address", "Device", "Recorded by"];
      const lines = all.map((e) => {
        const d = new Date(e.occurred_at);
        const values = e.details?.values
          ? Object.entries(e.details.values)
              .map(([k, v]) => (v && typeof v === "object" && "from" in (v as object) ? `${k}: ${show((v as { from: unknown }).from)} → ${show((v as { to: unknown }).to)}` : `${k}: ${show(v)}`))
              .join("; ")
          : e.details?.changed?.join(", ") ?? "";
        return [
          format(d, "yyyy-MM-dd"), format(d, "HH:mm:ss"), e.actor_name, e.actor_email, e.actor_role ? ROLE_INFO[e.actor_role]?.label : "",
          CATEGORY[e.category].label, e.description, e.patient_name, e.target_name, values, e.ip, device(e.user_agent),
          e.source === "app" ? "App" : "Database",
        ].map(csvCell).join(",");
      });
      const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-log-${practice.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      await logExport(practice.id, "activity_log", all.length);
      toast.success(`Exported ${all.length.toLocaleString("en-ZA")} entries`);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't export");
    } finally {
      setExporting(false);
    }
  };

  // Group by day.
  const groups: { day: string; items: ActivityEntry[] }[] = [];
  for (const e of entries) {
    const day = dayLabel(new Date(e.occurred_at));
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }

  const selectClass =
    "h-10 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg">Activity log</CardTitle>
          <CardDescription className="mt-1 max-w-xl">
            A permanent record of who did what at {practice.name}. Nobody can change or delete it, including you and
            Care Africa.
          </CardDescription>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={exporting || loading || entries.length === 0}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-wrap gap-2 border-y border-border bg-background/60 px-6 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by member, person or action"
              className="pl-9"
              aria-label="Search the activity log"
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory | "")} className={selectClass} aria-label="Type of activity">
            <option value="">All activity</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select value={actorId} onChange={(e) => setActorId(e.target.value)} className={selectClass} aria-label="Person">
            <option value="">Everyone</option>
            {team.map((m) => (
              <option key={m.profileId} value={m.profileId}>{m.name || m.email}{m.isActive ? "" : " (former)"}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-2 p-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-ink">Nothing found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query || category || actorId ? "Try different filters." : "Activity will appear here as your team works."}
            </p>
          </div>
        ) : (
          <div>
            {groups.map((g) => (
              <section key={g.day}>
                <h3 className="sticky top-0 z-[1] border-b border-border bg-card/95 px-6 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground backdrop-blur">
                  {g.day}
                </h3>
                <ul className="divide-y divide-border">
                  {g.items.map((e) => (
                    <EntryRow key={e.id} e={e} />
                  ))}
                </ul>
              </section>
            ))}
            {hasMore && (
              <div className="border-t border-border p-4 text-center">
                <Button variant="ghost" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Show older activity"}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
