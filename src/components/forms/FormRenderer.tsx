import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  VITALS,
  isAnswered,
  type AnswerValue,
  type Answers,
  type Field,
  type FormTemplate,
  type Row,
  type Vitals,
  type YesNoAnswer,
} from "@/lib/forms/types";

/* -------------------------------------------------------------------- */
/* Filling in                                                            */
/* -------------------------------------------------------------------- */

function Required() {
  return <span className="ml-0.5 text-red-600" aria-hidden>*</span>;
}

function FieldInput({
  field,
  value,
  onChange,
  invalid,
  large,
}: {
  field: Field;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  invalid?: boolean;
  large?: boolean;
}) {
  const id = `f-${field.id}`;
  const h = large ? "h-12 text-base" : "";
  const label = (
    <Label htmlFor={id} className={cn("text-sm font-semibold text-ink", large && "text-[15px]")}>
      {field.label}
      {field.required && <Required />}
    </Label>
  );
  const help = field.help && <p className="text-xs text-muted-foreground">{field.help}</p>;
  const ring = invalid ? "border-red-400 ring-4 ring-red-100" : "";

  switch (field.type) {
    case "text":
    case "date":
    case "time":
    case "number":
      return (
        <div className="space-y-1.5">
          {label}
          <div className="flex items-center gap-2">
            <Input
              id={id}
              type={field.type === "number" ? "number" : field.type}
              inputMode={field.type === "number" ? "decimal" : undefined}
              placeholder={"placeholder" in field ? field.placeholder : undefined}
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              className={cn(h, ring, field.type === "date" || field.type === "time" ? "max-w-[220px]" : "")}
            />
            {field.type === "number" && field.unit && <span className="text-sm text-muted-foreground">{field.unit}</span>}
          </div>
          {help}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-1.5">
          {label}
          <Textarea
            id={id}
            rows={field.rows ?? 3}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={cn("rounded-lg bg-card", large && "text-base", ring)}
          />
          {help}
        </div>
      );

    case "select":
      return (
        <div className="space-y-1.5">
          {label}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={id}>
            {field.options.map((o) => {
              const on = value === o;
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange(on ? undefined : o)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-all",
                    large && "px-4 py-2 text-[15px]",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40",
                    invalid && !on && "border-red-300"
                  )}
                >
                  {o}
                </button>
              );
            })}
          </div>
          <span id={id} className="sr-only">{field.label}</span>
          {help}
        </div>
      );

    case "checkboxes": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (o: string) => {
        if (o === field.noneOption) return onChange(selected.includes(o) ? [] : [o]);
        const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected.filter((x) => x !== field.noneOption), o];
        onChange(next);
      };
      return (
        <fieldset className="space-y-2">
          <legend className={cn("mb-1.5 text-sm font-semibold text-ink", large && "text-[15px]")}>
            {field.label}
            {field.required && <Required />}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {field.options.map((o) => {
              const on = selected.includes(o);
              return (
                <label
                  key={o}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    large && "py-3 text-[15px]",
                    on ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(o)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                  {o}
                </label>
              );
            })}
          </div>
          {help}
        </fieldset>
      );
    }

    case "yesno": {
      const v = (value as YesNoAnswer) ?? {};
      const showDetails = field.detailsLabel && v.answer === (field.detailsWhen ?? "yes");
      return (
        <div className="space-y-2">
          <p className={cn("text-sm font-semibold text-ink", large && "text-[15px]")}>
            {field.label}
            {field.required && <Required />}
          </p>
          <div className="flex gap-2" role="radiogroup" aria-label={field.label}>
            {(["yes", "no"] as const).map((a) => {
              const on = v.answer === a;
              return (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onChange({ ...v, answer: on ? undefined : a })}
                  className={cn(
                    "min-w-[80px] rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all",
                    large && "min-w-[96px] py-2.5 text-[15px]",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40",
                    invalid && !v.answer && "border-red-300"
                  )}
                >
                  {a}
                </button>
              );
            })}
          </div>
          {showDetails && (
            <Textarea
              rows={2}
              aria-label={field.detailsLabel}
              placeholder={field.detailsLabel}
              value={v.details ?? ""}
              onChange={(e) => onChange({ ...v, details: e.target.value })}
              className={cn("rounded-lg bg-card", large && "text-base", invalid && !(v.details ?? "").trim() && "border-red-400 ring-4 ring-red-100")}
            />
          )}
          {help}
        </div>
      );
    }

    case "vitals": {
      const v = (value as Vitals) ?? {};
      return (
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-semibold text-ink">{field.label}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {VITALS.map((m) => (
              <label key={m.id} className="rounded-lg border border-border bg-card px-3 py-2">
                <span className="block text-[11px] font-medium text-muted-foreground">{m.label}</span>
                <span className="flex items-baseline gap-1">
                  <input
                    inputMode="decimal"
                    value={v[m.id] ?? ""}
                    onChange={(e) => onChange({ ...v, [m.id]: e.target.value.replace(/[^\d.,/]/g, "") })}
                    className="tabular w-full bg-transparent text-base font-semibold text-ink outline-none"
                    aria-label={`${m.label} (${m.unit})`}
                  />
                  <span className="text-[11px] text-muted-foreground">{m.unit}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    case "rows": {
      const rows = Array.isArray(value) && (value as Row[]).length ? (value as Row[]) : [{}];
      const set = (i: number, col: string, val: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [col]: val } : r)));
      return (
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-semibold text-ink">
            {field.label}
            {field.required && <Required />}
          </legend>
          <div className={cn("space-y-2 rounded-xl border border-border bg-muted/30 p-3", invalid && "border-red-300")}>
            {rows.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(field.columns.length, 5)}, minmax(0, 1fr))` }}>
                  {field.columns.map((c) => (
                    <Input
                      key={c.id}
                      type={c.type === "date" ? "date" : "text"}
                      aria-label={c.label}
                      placeholder={c.placeholder ?? c.label}
                      value={r[c.id] ?? ""}
                      onChange={(e) => set(i, c.id, e.target.value)}
                      className="h-9 text-sm"
                      title={c.label}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground"
                  aria-label="Remove row"
                  disabled={rows.length === 1 && !Object.values(r).some(Boolean)}
                  onClick={() => onChange(rows.length === 1 ? [] : rows.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <p className="hidden text-[11px] text-muted-foreground sm:block">{field.columns.map((c) => c.label).join(" · ")}</p>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-primary" onClick={() => onChange([...rows, {}])}>
                <Plus className="h-4 w-4" /> {field.addLabel}
              </Button>
            </div>
          </div>
        </fieldset>
      );
    }
  }
}

/** The template as a form to fill in. */
export function FormFields({
  template,
  answers,
  onChange,
  invalidIds,
  large,
}: {
  template: FormTemplate;
  answers: Answers;
  onChange: (next: Answers) => void;
  /** Fields to highlight as still needed. */
  invalidIds?: Set<string>;
  /** Bigger targets, for clients filling in on a tablet or phone. */
  large?: boolean;
}) {
  return (
    <div className="space-y-8">
      {template.sections.map((s) => (
        <section key={s.id} className="space-y-5">
          <div className="border-b border-border pb-2">
            <h3 className={cn("text-base font-bold text-ink", large && "text-lg")}>{s.title}</h3>
            {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
          </div>
          {s.fields.map((f) => (
            <div key={f.id} id={`field-${f.id}`}>
              <FieldInput
                field={f}
                value={answers[f.id]}
                onChange={(v) => onChange({ ...answers, [f.id]: v })}
                invalid={invalidIds?.has(f.id)}
                large={large}
              />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Reading back                                                          */
/* -------------------------------------------------------------------- */

function formatDate(v: string) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : format(d, "d MMM yyyy");
}

function AnswerView({ field, value }: { field: Field; value: AnswerValue }) {
  switch (field.type) {
    case "date":
      return <>{formatDate(value as string)}</>;
    case "checkboxes":
      return <>{(value as string[]).join(", ")}</>;
    case "yesno": {
      const v = value as YesNoAnswer;
      return (
        <>
          <span className={cn("font-semibold", v.answer === "yes" ? "text-ink" : "text-muted-foreground")}>
            {v.answer === "yes" ? "Yes" : "No"}
          </span>
          {v.details && <span className="whitespace-pre-wrap">: {v.details}</span>}
        </>
      );
    }
    case "vitals": {
      const v = value as Vitals;
      return (
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          {VITALS.filter((m) => v[m.id]).map((m) => (
            <span key={m.id} className="tabular">
              <span className="text-muted-foreground">{m.label}</span> {v[m.id]} {m.unit}
            </span>
          ))}
        </span>
      );
    }
    case "rows": {
      const rows = (value as Row[]).filter((r) => Object.values(r).some((x) => String(x ?? "").trim()));
      return (
        <div className="mt-1 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {field.columns.map((c) => (
                  <th key={c.id} className="px-3 py-2 font-medium">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  {field.columns.map((c) => (
                    <td key={c.id} className="px-3 py-2">{c.type === "date" && r[c.id] ? formatDate(r[c.id]) : r[c.id] || "–"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return <span className="whitespace-pre-wrap">{String(value)}</span>;
  }
}

/** A filled-in form, read-only. Only answered questions are shown. */
export function FormView({ template, answers }: { template: FormTemplate; answers: Answers }) {
  const sections = template.sections
    .map((s) => ({ ...s, fields: s.fields.filter((f) => isAnswered(f, answers[f.id])) }))
    .filter((s) => s.fields.length);

  if (!sections.length) return <p className="text-sm text-muted-foreground">Nothing was filled in.</p>;

  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <section key={s.id}>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">{s.title}</h4>
          <dl className="space-y-2.5">
            {s.fields.map((f) => (
              <div key={f.id} className={cn(f.type === "rows" || f.type === "vitals" ? "" : "grid gap-x-6 sm:grid-cols-[220px_1fr]")}>
                <dt className="text-sm text-muted-foreground">{f.label}</dt>
                <dd className="text-sm text-ink">
                  <AnswerView field={f} value={answers[f.id]} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
