import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormFields } from "@/components/forms/FormRenderer";
import { consentText as makeConsent } from "@/lib/forms/templates";
import { missingRequired, type Answers, type FormTemplate } from "@/lib/forms/types";

/**
 * An intake form as the client sees it: the questions, then their consent
 * and typed name. Used on a practice device and from an emailed/WhatsApp link.
 */
export function IntakeFormFill({
  template,
  practiceName,
  defaultName,
  onSubmit,
}: {
  template: FormTemplate;
  practiceName: string;
  defaultName?: string;
  onSubmit: (answers: Answers, consentText: string, signedName: string) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState(defaultName ?? "");
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const consent = makeConsent(template, practiceName);

  // The member's name may arrive after the form opens.
  useEffect(() => {
    if (defaultName) setName((n) => n || defaultName);
  }, [defaultName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = missingRequired(template, answers);
    if (missing.length) {
      setInvalid(new Set(missing.map((f) => f.id)));
      document.getElementById(`field-${missing[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error(missing.length === 1 ? `Please answer: ${missing[0].label}` : `Please answer the ${missing.length} questions marked in red`);
      return;
    }
    setInvalid(new Set());
    if (!agreed) return toast.error("Please tick the box to agree");
    if (name.trim().length < 2) return toast.error("Please type your full name");
    setBusy(true);
    try {
      await onSubmit(answers, consent, name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send the form");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-10">
      <FormFields
        template={template}
        answers={answers}
        onChange={(next) => {
          setAnswers(next);
          if (invalid.size) {
            const still = new Set(missingRequired(template, next).map((f) => f.id));
            setInvalid(new Set([...invalid].filter((id) => still.has(id))));
          }
        }}
        invalidIds={invalid}
        large
      />

      <section className="space-y-4 rounded-2xl border border-border bg-muted/40 p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
          <ShieldCheck className="h-5 w-5 text-primary" /> Your consent
        </h3>
        <p className="text-[15px] leading-relaxed text-ink/90">{consent}</p>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-[15px]">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-5 w-5 accent-[hsl(var(--primary))]" />
          I agree
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="signed-name" className="text-[15px] font-semibold text-ink">Type your full name to sign</Label>
          <Input id="signed-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-12 text-base" />
        </div>
      </section>

      <Button type="submit" disabled={busy} className="h-12 w-full text-base">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send to {practiceName} <ArrowRight className="h-5 w-5" /></>}
      </Button>
    </form>
  );
}
