import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "../components/Dashboard/DashboardLayout";
import {
  Award,
  Users,
  Clock,
  Calendar,
  CalendarPlus,
  UserPlus,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Gift,
  CheckCircle2,

  Inbox,
  FileHeart,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, formatDistanceToNow, isSameDay, isSameMonth } from "date-fns";
import { listAppointments, updateAppointmentStatus } from "@/lib/db/appointments";
import { createPatient, listPatients } from "@/lib/db/patients";
import { listRecentClaims, rewardMetrics, type RecentClaim } from "@/lib/db/rewards";
import { listOrders, type OrderSummary } from "@/lib/db/sales";
import { Appointment } from "@/types/appointment";
import { useCurrentPractice } from "@/hooks/useCurrentPractice";
import { usePractice } from "@/context/PracticeContext";
import { isSetupCompleted } from "@/lib/db/practiceSettings";
import { Patient } from "@/types/patient";
import AddPatientModal from "@/components/Patient/AddPatientModal";
import { OnboardingCard } from "@/components/OnboardingCard";
import { WaitingTimer } from "@/components/Appointment/WaitingTimer";
import { RandIcon } from "@/components/icons/RandIcon";
import { formatRandCompact } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useModules } from "@/lib/modules";
import { canSeeClinical } from "@/lib/roles";

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) => (
  <Card className="p-5 transition-shadow hover:shadow-lift">
    <div className="flex items-start justify-between">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-[18px] w-[18px] text-primary" />
      </span>
    </div>
    {loading ? (
      <div className="mt-3 h-8 w-24 animate-pulse rounded-md bg-muted" />
    ) : (
      <p className="tabular mt-2 text-[28px] font-bold leading-tight tracking-tight text-ink">{value}</p>
    )}
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </Card>
);

const STATUS_STYLE: Record<string, { label: string; dot: string; pill: string }> = {
  scheduled: { label: "Scheduled", dot: "bg-slate-400", pill: "bg-slate-100 text-slate-700" },
  arrived: { label: "Arrived", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700" },
  waiting: { label: "Waiting", dot: "bg-yellow-500", pill: "bg-yellow-50 text-yellow-800" },
  "in-room": { label: "In room", dot: "bg-teal-500", pill: "bg-teal-50 text-teal-700" },
  completed: { label: "Completed", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelled", dot: "bg-red-400", pill: "bg-red-50 text-red-700" },
};

/** The next step for a visit, as one button. */
const NEXT_STEP: Partial<Record<Appointment["status"], { to: Appointment["status"]; label: string }>> = {
  scheduled: { to: "arrived", label: "Check in" },
  arrived: { to: "waiting", label: "To waiting room" },
  waiting: { to: "in-room", label: "Call in" },
  "in-room": { to: "completed", label: "Complete" },
};

function serviceNames(a: Appointment) {
  return a.services
    .map((s) => (typeof s === "string" ? s : s?.name))
    .filter(Boolean)
    .join(", ");
}

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatWaitTime(minutes: number): string {
  if (minutes < 0) return "—";
  if (minutes === 0) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

const EmptyState = ({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-8 ring-primary/[0.04]">
      <Icon className="h-6 w-6 text-primary" />
    </span>
    <h3 className="mt-5 text-base font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{body}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const practiceId = useCurrentPractice();
  const { practice } = usePractice();
  const { hasClinical } = useModules();
  const showRecordLinks = hasClinical && canSeeClinical(practice?.role);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [recentClaims, setRecentClaims] = useState<RecentClaim[]>([]);
  const [totalClaims, setTotalClaims] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const now = new Date();

  const loadDashboard = async () => {
    if (!practiceId) {
      setAppointments([]);
      setPatients([]);
      return;
    }
    setLoading(true);
    try {
      const [appts, members, claims, metrics, sales] = await Promise.all([
        listAppointments(practiceId),
        listPatients(practiceId),
        listRecentClaims(practiceId, 6),
        rewardMetrics(practiceId),
        listOrders(practiceId).catch(() => [] as OrderSummary[]),
      ]);
      setAppointments(appts as any);
      setPatients(members);
      setRecentClaims(claims.items);
      setTotalClaims(metrics.totalClaims);
      setOrders(sales);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [practiceId]);

  useEffect(() => {
    if (!practiceId) return;
    isSetupCompleted(practiceId)
      .then(setSetupCompleted)
      .catch((error) => console.error("Error loading practice setup status:", error));
  }, [practiceId]);

  const handleUpdateStatus = async (id: string, newStatus: Appointment["status"]) => {
    setBusyId(id);
    try {
      const { appointment, pointsAwarded } = await updateAppointmentStatus(id, newStatus);
      setAppointments((prev) => prev.map((apt) => (apt.id === id ? (appointment as any) : apt)));
      toast.success(
        newStatus === "completed" && pointsAwarded > 0
          ? `Visit completed. ${appointment.patient} earned ${pointsAwarded} points`
          : `${appointment.patient}: ${STATUS_STYLE[newStatus]?.label ?? newStatus}`
      );
      if (newStatus === "completed") loadDashboard();
    } catch (error: any) {
      console.error("Error updating appointment status:", error);
      toast.error(error?.message || "Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  const handleAddPatient = async (patientData: any) => {
    if (!practiceId) return;
    try {
      const created = await createPatient(practiceId, patientData);
      setPatients((prev) => [...prev, created]);
      toast.success("Member added");
      loadDashboard();
    } catch (error: any) {
      console.error("Error adding patient:", error);
      toast.error(error?.message || "Failed to add member");
    }
  };

  /* ---------- derived figures ---------- */

  const today = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(new Date(a.time), now) && a.status !== "requested" && a.status !== "cancelled")
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()),
    [appointments]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { scheduled: 0, arrived: 0, waiting: 0, "in-room": 0, completed: 0 };
    today.forEach((a) => {
      if (a.status in c) c[a.status] += 1;
    });
    return c;
  }, [today]);

  const requests = appointments.filter((a) => a.status === "requested").length;
  const activeMembers = patients.filter((p) => p.status === "active").length;

  const avgWait = useMemo(() => {
    const waits = appointments
      .map((a) => a.wait_duration)
      .filter((w): w is string => !!w)
      .map((w) => {
        const [m, s] = w.split(":").map(Number);
        return m + s / 60;
      });
    return waits.length ? Math.round(waits.reduce((x, y) => x + y, 0) / waits.length) : -1;
  }, [appointments]);

  const monthOrders = orders.filter((o) => isSameMonth(new Date(o.createdAt), now));
  const monthSales = monthOrders.reduce((sum, o) => sum + o.total, 0);

  const firstName = practice?.name ?? "your practice";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{format(now, "EEEE, d MMMM yyyy")}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{greeting(now)}</h1>
            <p className="mt-1 text-muted-foreground">Here's how {firstName} is doing today.</p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="outline" className="gap-2" onClick={() => setIsAddPatientModalOpen(true)}>
              <UserPlus className="h-4 w-4" /> New member
            </Button>
            <Button className="gap-2" onClick={() => navigate("/appointments")}>
              <CalendarPlus className="h-4 w-4" /> Book appointment
            </Button>
          </div>
        </div>

        {!setupCompleted && <OnboardingCard />}

        {requests > 0 && (
          <button
            onClick={() => navigate("/appointments")}
            className="flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-left transition-colors hover:bg-primary/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Inbox className="h-4 w-4" />
            </span>
            <p className="flex-1 text-sm">
              <span className="font-semibold text-ink">
                {requests} online booking {requests === 1 ? "request" : "requests"}
              </span>{" "}
              <span className="text-muted-foreground">waiting for you to confirm.</span>
            </p>
            <span className="flex items-center gap-1 text-sm font-semibold text-primary">
              Review <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        )}

        {/* Headline figures */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Today's appointments"
            value={String(today.length)}
            icon={Calendar}
            loading={loading}
            hint={
              today.length
                ? `${counts.completed} done · ${today.length - counts.completed} to go`
                : "Nothing booked yet"
            }
          />
          <StatCard
            label="In the waiting room"
            value={String(counts.arrived + counts.waiting)}
            icon={Clock}
            loading={loading}
            hint={`Average wait ${formatWaitTime(avgWait)}`}
          />
          <StatCard
            label="Sales this month"
            value={formatRandCompact(monthSales)}
            icon={RandIcon}
            loading={loading}
            hint={`${monthOrders.length} ${monthOrders.length === 1 ? "order" : "orders"} in ${format(now, "MMMM")}`}
          />
          <StatCard
            label="Active members"
            value={activeMembers.toLocaleString("en-ZA")}
            icon={Users}
            loading={loading}
            hint={`${totalClaims} ${totalClaims === 1 ? "reward" : "rewards"} claimed so far`}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Today's queue */}
          <Card className="overflow-hidden xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-ink">Today's queue</h2>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  {(["scheduled", "arrived", "waiting", "in-room", "completed"] as const).map((s) => (
                    <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn("h-2 w-2 rounded-full", STATUS_STYLE[s].dot)} />
                      {STATUS_STYLE[s].label}
                      <span className="tabular font-semibold text-ink">{counts[s]}</span>
                    </span>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/appointments")}>
                All appointments <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3 p-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : today.length ? (
              <ul className="divide-y divide-border">
                {today.map((a) => {
                  const style = STATUS_STYLE[a.status] ?? STATUS_STYLE.scheduled;
                  const next = NEXT_STEP[a.status];
                  const services = serviceNames(a);
                  return (
                    <li key={a.id} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-muted/40">
                      <div className="w-14 shrink-0">
                        <p className="tabular text-sm font-semibold text-ink">{format(new Date(a.time), "HH:mm")}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{a.patient}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[services, a.doctor_name].filter(Boolean).join(" · ") || "No services listed"}
                        </p>
                      </div>
                      {showRecordLinks && a.patient_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 gap-1.5 text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/patients/${a.patient_id}/record`)}
                          title="Open clinical record"
                        >
                          <FileHeart className="h-4 w-4" /> Record
                        </Button>
                      )}
                      {a.status === "waiting" && a.wait_start_time && (
                        <WaitingTimer status={a.status} wait_start_time={a.wait_start_time} />
                      )}
                      <span className={cn("hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex", style.pill)}>
                        {style.label}
                      </span>
                      <div className="w-[136px] shrink-0 text-right">
                        {next ? (
                          <Button
                            size="sm"
                            variant={a.status === "in-room" ? "default" : "outline"}
                            className="h-8 w-full"
                            disabled={busyId === a.id}
                            onClick={() => handleUpdateStatus(a.id, next.to)}
                          >
                            {next.label}
                          </Button>
                        ) : (
                          <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="No appointments today"
                body="Book a visit and it will show up here, with check-in and waiting-room times."
                action={
                  <Button className="gap-2" onClick={() => navigate("/appointments")}>
                    <CalendarPlus className="h-4 w-4" /> Book appointment
                  </Button>
                }
              />
            )}
          </Card>

          {/* Rewards activity */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-bold text-ink">Rewards activity</h2>
              <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/rewards")}>
                Rewards <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
            {loading ? (
              <div className="space-y-3 p-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : recentClaims.length ? (
              <ul className="divide-y divide-border">
                {recentClaims.map((claim) => (
                  <li key={claim.id} className="flex items-start gap-3 px-6 py-3.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/25">
                      <Gift className="h-4 w-4 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{claim.reward_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {claim.patient_name} · {claim.points_used} pts
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          claim.is_redeemed ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {claim.is_redeemed ? "Used" : "Not used yet"}
                      </span>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Award}
                title="No rewards claimed yet"
                body="Set up rewards so members can spend the points they earn on every visit."
                action={
                  <Button variant="outline" className="gap-2" onClick={() => navigate("/rewards")}>
                    <Award className="h-4 w-4" /> Set up rewards
                  </Button>
                }
              />
            )}
          </Card>
        </div>

        <AddPatientModal
          isOpen={isAddPatientModalOpen}
          onClose={() => setIsAddPatientModalOpen(false)}
          onAdd={handleAddPatient}
          onSuccess={loadDashboard}
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
