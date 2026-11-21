import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { differenceInYears, format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  FileHeart,
  FilePen,
  Lock,
  Plus,
} from "lucide-react";
import { DashboardLayout } from "@/components/Dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormView } from "@/components/forms/FormRenderer";
import { IntakeActions } from "@/components/intake/IntakeActions";
import { usePractice } from "@/context/PracticeContext";
import { useModules } from "@/lib/modules";
import { canSeeClinical } from "@/lib/roles";
import { templatesFor } from "@/lib/forms/templates";
import type { YesNoAnswer } from "@/lib/forms/types";
import { getPatient } from "@/lib/db/patients";
import { intakeOverview, listIntakeSubmissions, listNotes, type IntakeOverviewItem, type IntakeSubmission, type NoteSummary } from "@/lib/db/clinical";
import { logRecordView } from "@/lib/audit";
import type { Patient } from "@/types/patient";
import { cn } from "@/lib/utils";

type Tab = "all" | "notes" | "intake";

function age(dob?: string) {
  if (!dob) return null;
  const d = new Date(dob);
  return isNaN(d.getTime()) ? null : differenceInYears(new Date(), d);
}

/** Allergies anyone reported on an intake form, newest first. */
function allergyAlerts(subs: IntakeSubmission[]) {
  const out: { text: string; from: string; at: string }[] = [];
  for (const s of subs) {
    const a = s.answers?.allergies as YesNoAnswer | undefined;
    if (a?.answer === "yes") out.push({ text: a.details?.trim() || "Yes (no details given)", from: s.title, at: s.submittedAt });
  }
  return out.slice(0, 3);
}

/**
 * /patients/:patientId/record — a member's clinical record: notes and
 * intake forms. Practitioners and admins only; every visit is logged.
 */
export default function ClinicalRecord() {
  const { patientId = "" } = useParams();
  const navigate = useNavigate();
  const { practice } = usePractice();
  const { hasClinical, hasFullClinical } = useModules();
  const allowed = canSeeClinical(practice?.role);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [subs, setSubs] = useState<IntakeSubmission[]>([]);
  const [pending, setPending] = useState<IntakeOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!practice || !allowed) return;
    setLoading(true);
    try {
      const [p, n, s, o] = await Promise.all([
        getPatient(patientId),
        hasFullClinical ? listNotes(patientId) : Promise.resolve([]),
        listIntakeSubmissions(patientId),
        intakeOverview(patientId),
      ]);
      setPatient(p);
      setNotes(n);
      setSubs(s);
      setPending(o.filter((i) => i.kind === "link" && i.status === "waiting"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open the record");
    } finally {
      setLoading(false);
    }
  }, [patientId, practice?.id, allowed, hasFullClinical]);

  useEffect(() => {
    load();
    if (allowed && patientId) logRecordView(patientId, "clinical_record");
    import("@/config/supabase").then(({ supabase }) => supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)));
  }, [load]);

  const items = useMemo(() => {
    const all = [
      ...notes.map((n) => ({ type: "note" as const, at: n.signedAt ?? n.createdAt, note: n })),
      ...subs.map((s) => ({ type: "intake" as const, at: s.submittedAt, sub: s })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    return all.filter((i) => tab === "all" || (tab === "notes" ? i.type === "note" : i.type === "intake"));
  }, [notes, subs, tab]);

  if (!practice) return <DashboardLayout><div /></DashboardLayout>;

  if (!allowed || !hasClinical) {
    return (
      <DashboardLayout>
        <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 text-lg font-bold text-ink">
            {!hasClinical ? "Clinical records are switched off" : "Only practitioners and admins can open clinical records"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {!hasClinical ? "A practice admin can switch them on in Settings → Modules." : "Ask a practitioner if you need something from this record."}
          </p>
          <Button variant="outline" className="mt-6" onClick={() => navigate("/patients")}>Back to members</Button>
        </Card>
      </DashboardLayout>
    );
  }

  const years = age(patient?.dateOfBirth);
  const alerts = allergyAlerts(subs);
  const noteTemplates = templatesFor("clinical_note", practice.category);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link to="/patients" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Members
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Clinical record</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{patient?.name ?? (loading ? "…" : "Member")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[years !== null ? `${years} years old` : null, patient?.contact_number, patient?.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {patient && <IntakeActions patient={{ id: patient.id, name: patient.name, email: patient.email, phone: patient.contact_number }} onSent={load} size="default" />}
            {hasFullClinical && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" /> New note <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Choose a template</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {noteTemplates.map(({ template, suggested }) => (
                    <DropdownMenuItem
                      key={template.key}
                      onClick={() => navigate(`/patients/${patientId}/notes/new?template=${template.key}`)}
                      className="flex-col items-start gap-0.5"
                    >
                      <span className="font-medium">
                        {template.title}
                        {suggested && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Suggested</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">{template.description}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="text-sm">
              <p className="font-bold text-red-800">Allergies</p>
              {alerts.map((a, i) => (
                <p key={i} className="text-red-800">
                  {a.text} <span className="text-red-700/70">· {a.from}, {format(new Date(a.at), "d MMM yyyy")}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        {pending.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Waiting for {patient?.name.split(" ")[0] ?? "them"} to fill in: {pending.map((p) => p.title).join(", ")}.
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1.5 w-fit">
          {([
            ["all", "Everything"],
            ...(hasFullClinical ? [["notes", `Notes (${notes.length})`]] : []),
            ["intake", `Intake forms (${subs.length})`],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", tab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : items.length === 0 ? (
          <Card className="px-6 py-14 text-center">
            <FileHeart className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-semibold text-ink">Nothing on record yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasFullClinical ? "Start a note, or ask the member to fill in an intake form." : "Ask the member to fill in an intake form."}
            </p>
          </Card>
        ) : (
          <ol className="space-y-3">
            {items.map((i) =>
              i.type === "note" ? (
                <li key={`n-${i.note.id}`}>
                  <Link to={`/patients/${patientId}/notes/${i.note.id}`}>
                    <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-lift">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", i.note.status === "signed" ? "bg-primary/10 text-primary" : "bg-amber-50 text-amber-700")}>
                        <FilePen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{i.note.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.note.authorName} · {format(new Date(i.at), "d MMM yyyy, HH:mm")}
                          {i.note.addendaCount > 0 && ` · ${i.note.addendaCount} addend${i.note.addendaCount === 1 ? "um" : "a"}`}
                        </p>
                      </div>
                      {i.note.status === "signed" ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <Lock className="h-3 w-3" /> Signed
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Draft{i.note.authorId === me ? " (yours)" : ""}
                        </span>
                      )}
                    </Card>
                  </Link>
                </li>
              ) : (
                <li key={`s-${i.sub.id}`}>
                  <Card className="overflow-hidden">
                    <button onClick={() => setOpen(open === i.sub.id ? null : i.sub.id)} className="flex w-full items-center gap-4 p-4 text-left" aria-expanded={open === i.sub.id}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <ClipboardList className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{i.sub.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Filled in by {i.sub.signedName} {i.sub.source === "link" ? "from a link" : `in the practice${i.sub.collectedByName ? ` (with ${i.sub.collectedByName})` : ""}`} ·{" "}
                          {format(new Date(i.at), "d MMM yyyy, HH:mm")}
                        </p>
                      </div>
                      <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">Intake form</span>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open === i.sub.id && "rotate-180")} />
                    </button>
                    {open === i.sub.id && (
                      <div className="border-t border-border px-6 py-5">
                        <FormView template={i.sub.template} answers={i.sub.answers} />
                        <div className="mt-6 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                          <p className="font-semibold text-ink">Consent, signed "{i.sub.signedName}"</p>
                          <p className="mt-1">{i.sub.consentText}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                </li>
              )
            )}
          </ol>
        )}
      </div>
    </DashboardLayout>
  );
}
