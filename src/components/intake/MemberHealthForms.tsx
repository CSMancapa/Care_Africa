import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, CheckCircle2, Clock3, FileHeart, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IntakeActions } from "@/components/intake/IntakeActions";
import { usePractice } from "@/context/PracticeContext";
import { useModules } from "@/lib/modules";
import { canSeeClinical } from "@/lib/roles";
import { intakeOverview, type IntakeOverviewItem } from "@/lib/db/clinical";
import { cn } from "@/lib/utils";

const STATUS = {
  completed: { icon: CheckCircle2, label: "Completed", tone: "text-emerald-700 bg-emerald-50" },
  waiting: { icon: Clock3, label: "Waiting for them", tone: "text-amber-700 bg-amber-50" },
  expired: { icon: XCircle, label: "Link expired", tone: "text-muted-foreground bg-muted" },
  cancelled: { icon: XCircle, label: "Replaced", tone: "text-muted-foreground bg-muted" },
} as const;

/**
 * In the member's profile: their intake forms (status only, no answers, so
 * front desk can use it), ways to get one filled in, and, for practitioners
 * and admins, the way into the clinical record.
 */
export function MemberHealthForms({
  patient,
}: {
  patient: { id: string; name: string; email?: string | null; contact_number?: string | null };
}) {
  const navigate = useNavigate();
  const { practice } = usePractice();
  const { hasClinical } = useModules();
  const [items, setItems] = useState<IntakeOverviewItem[]>([]);
  const clinical = canSeeClinical(practice?.role);

  const load = useCallback(() => {
    intakeOverview(patient.id).then(setItems).catch(() => setItems([]));
  }, [patient.id]);

  useEffect(() => {
    if (hasClinical) load();
  }, [hasClinical, load]);

  if (!hasClinical) return null;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">Health forms{clinical ? " and clinical record" : ""}</h3>
          <p className="text-sm text-muted-foreground">
            {clinical ? "Answers are in the clinical record." : "Only practitioners and admins can read the answers."}
          </p>
        </div>
        {clinical && (
          <Button className="gap-2" onClick={() => navigate(`/patients/${patient.id}/record`)}>
            <FileHeart className="h-4 w-4" /> Open clinical record <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {items.slice(0, 6).map((i) => {
            const s = STATUS[i.status];
            return (
              <li key={`${i.kind}-${i.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{i.title}</span>
                <span className="text-xs text-muted-foreground">
                  {i.status === "completed" ? format(new Date(i.at), "d MMM yyyy") : i.status === "waiting" && i.expiresAt ? `sent ${format(new Date(i.at), "d MMM")}` : ""}
                </span>
                <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", s.tone)}>
                  <s.icon className="h-3.5 w-3.5" /> {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4">
        <IntakeActions patient={{ id: patient.id, name: patient.name, email: patient.email, phone: patient.contact_number }} onSent={load} />
      </div>
    </Card>
  );
}
