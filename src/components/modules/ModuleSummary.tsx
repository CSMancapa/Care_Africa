import { ClipboardList, FileHeart, Check, Minus } from "lucide-react";
import { RandIcon } from "@/components/icons/RandIcon";
import { cn } from "@/lib/utils";
import { MODULE_RELEASED, type PracticeModules } from "@/lib/modules";
import { CLINICAL_LEVEL_COPY, CORE_FEATURES } from "@/lib/moduleCopy";

function Soon() {
  return (
    <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      Coming soon
    </span>
  );
}

/** A read-only list of what a set of modules gives a practice. */
export function ModuleSummary({ modules, claimsRecommended }: { modules: PracticeModules; claimsRecommended?: boolean }) {
  const clinicalReleased =
    modules.clinicalRecords === "full" ? MODULE_RELEASED.clinicalNotes : MODULE_RELEASED.intake;
  const claimsOn = modules.claims || !!claimsRecommended;

  return (
    <ul className="space-y-3 text-sm">
      {CORE_FEATURES.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </span>
          <span className="flex-1 text-ink">{label}</span>
          <Check className="h-4 w-4 text-emerald-600" />
        </li>
      ))}

      <li className="flex items-center gap-3">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", modules.clinicalRecords === "off" ? "bg-muted" : "bg-primary/10")}>
          {modules.clinicalRecords === "full" ? (
            <FileHeart className="h-4 w-4 text-primary" />
          ) : (
            <ClipboardList className={cn("h-4 w-4", modules.clinicalRecords === "off" ? "text-muted-foreground" : "text-primary")} />
          )}
        </span>
        <span className={cn("flex flex-1 flex-wrap items-center gap-x-2 gap-y-1", modules.clinicalRecords === "off" ? "text-muted-foreground" : "text-ink")}>
          {CLINICAL_LEVEL_COPY[modules.clinicalRecords].title}
          {modules.clinicalRecords !== "off" && !clinicalReleased && <Soon />}
        </span>
        {modules.clinicalRecords === "off" ? <Minus className="h-4 w-4 text-muted-foreground" /> : <Check className="h-4 w-4 text-emerald-600" />}
      </li>

      <li className="flex items-center gap-3">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", claimsOn ? "bg-primary/10" : "bg-muted")}>
          <RandIcon className={cn("h-4 w-4", claimsOn ? "text-primary" : "text-muted-foreground")} />
        </span>
        <span className={cn("flex flex-1 flex-wrap items-center gap-x-2 gap-y-1", claimsOn ? "text-ink" : "text-muted-foreground")}>
          Medical-aid claims
          {claimsOn && !MODULE_RELEASED.claims && <Soon />}
        </span>
        {claimsOn ? <Check className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
      </li>
    </ul>
  );
}
