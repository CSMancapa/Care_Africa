import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePractice } from "@/context/PracticeContext";
import { saveModules } from "@/lib/db/practiceSettings";
import { getPracticeType } from "@/lib/practiceTypes";
import {
  MODULE_RELEASED,
  PLAN_LIMITS,
  PLAN_NAMES,
  clinicalAllowed,
  recommendedModules,
  type ClinicalLevel,
  type PracticeModules,
} from "@/lib/modules";
import { CLINICAL_LEVEL_COPY, CORE_FEATURES } from "@/lib/moduleCopy";
import { cn } from "@/lib/utils";

const LEVELS: ClinicalLevel[] = ["off", "intake", "full"];

function SoonBadge() {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      Coming soon
    </span>
  );
}

/**
 * Settings → Modules. The practice admin chooses which parts of Care Africa
 * the practice uses. The plan sets the limits (the database enforces them
 * too); the practice type only suggests defaults.
 */
export function ModulesSettings() {
  const { practice, refresh } = usePractice();
  const [draft, setDraft] = useState<PracticeModules | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (practice?.plan) {
      setDraft({ clinicalRecords: practice.clinical_records, claims: practice.claims_enabled });
    }
  }, [practice?.id, practice?.plan, practice?.clinical_records, practice?.claims_enabled]);

  if (!practice) return null;

  if (!practice.plan || !draft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>
            Modules need a database update (migration 0006) before they can be set here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isAdmin = practice.role === "practice_admin";
  const plan = practice.plan;
  const type = getPracticeType(practice.category);
  const recommended = recommendedModules(practice.category, plan);
  const dirty =
    draft.clinicalRecords !== practice.clinical_records || draft.claims !== practice.claims_enabled;
  const matchesRecommended =
    draft.clinicalRecords === recommended.clinicalRecords && draft.claims === recommended.claims;

  const save = async () => {
    try {
      setSaving(true);
      await saveModules(practice.id, draft);
      await refresh();
      toast.success("Modules updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update modules");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Plan and practice type */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-6 pt-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <type.icon className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">
              {type.name} · <span className="font-semibold text-ink">{PLAN_NAMES[plan]} plan</span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Your practice type suggests a starting point. Switch modules on or off to suit how you work.
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              className="gap-2"
              disabled={matchesRecommended || saving}
              onClick={() => setDraft(recommended)}
            >
              <RotateCcw className="h-4 w-4" />
              Use recommended settings
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Always on */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            Included for every practice
          </CardTitle>
          <CardDescription>The heart of Care Africa. Always on.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-3">
            {CORE_FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-3 text-sm">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 font-medium text-ink">{label}</span>
                <Check className="h-4 w-4 text-emerald-600" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Clinical records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Clinical records</CardTitle>
          <CardDescription>How much clinical information you keep about each patient or client.</CardDescription>
        </CardHeader>
        <CardContent>
          <div role="radiogroup" aria-label="Clinical records" className="grid gap-3 md:grid-cols-3">
            {LEVELS.map((level) => {
              const allowed = clinicalAllowed(plan, level);
              const selected = draft.clinicalRecords === level;
              const released =
                level === "off" || (level === "intake" ? MODULE_RELEASED.intake : MODULE_RELEASED.clinicalNotes);
              const isRecommended = recommended.clinicalRecords === level;
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!isAdmin || !allowed}
                  onClick={() => setDraft({ ...draft, clinicalRecords: level })}
                  className={cn(
                    "relative flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                    selected ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border bg-card",
                    isAdmin && allowed && !selected && "hover:border-primary/40 hover:bg-muted/40",
                    (!isAdmin || !allowed) && !selected && "opacity-60",
                    !allowed && "cursor-not-allowed"
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                        selected ? "border-primary" : "border-input"
                      )}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-ink">{CLINICAL_LEVEL_COPY[level].title}</span>
                    {!allowed && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{CLINICAL_LEVEL_COPY[level].body}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {isRecommended && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                        Recommended
                      </span>
                    )}
                    {!released && <SoonBadge />}
                    {!allowed && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        Practice plan
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {type.group === "cash_clinical" && draft.clinicalRecords !== "full" && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Treatments like injectables and IV drips are clinical procedures. Practices offering them are usually
              expected to keep full records: consent, the prescriber's order, products and batch numbers, and any reactions.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Claims */}
      <Card>
        <CardContent className="flex flex-wrap items-start gap-4 p-6 pt-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-ink">Medical-aid claims</p>
              {!MODULE_RELEASED.claims && <SoonBadge />}
              {!PLAN_LIMITS[plan].claims && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Practice plan
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Send claims to medical aids from a completed visit, and track what's been paid.
              {type.defaults.claims && " Recommended for your type of practice."}
            </p>
          </div>
          <Switch
            checked={draft.claims}
            disabled={!isAdmin || !PLAN_LIMITS[plan].claims || !MODULE_RELEASED.claims}
            onCheckedChange={(v) => setDraft({ ...draft, claims: v })}
            aria-label="Medical-aid claims"
          />
        </CardContent>
      </Card>

      {isAdmin ? (
        <div className="flex items-center justify-end gap-3">
          {dirty && <span className="text-sm text-muted-foreground">You have unsaved changes</span>}
          {dirty && (
            <Button
              variant="ghost"
              onClick={() => setDraft({ clinicalRecords: practice.clinical_records, claims: practice.claims_enabled })}
            >
              Undo
            </Button>
          )}
          <Button disabled={!dirty || saving} onClick={save}>
            {saving ? "Saving…" : "Save modules"}
          </Button>
        </div>
      ) : (
        <p className="text-right text-sm text-muted-foreground">Only a practice admin can change modules.</p>
      )}
    </div>
  );
}
