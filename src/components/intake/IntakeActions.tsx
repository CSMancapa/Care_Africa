import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, ClipboardList, Copy, Link2, Mail, MessageCircle, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePractice } from "@/context/PracticeContext";
import { templatesFor } from "@/lib/forms/templates";
import type { FormTemplate } from "@/lib/forms/types";
import { createIntakeLink } from "@/lib/db/clinical";

/** "082 555 0142" → "27825550142" for WhatsApp links. */
function waNumber(phone?: string | null) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return "27" + digits.slice(1);
  return digits;
}

/**
 * The two ways to get an intake form filled in: hand a practice device to
 * the client now, or send them a link to do it before the visit.
 */
export function IntakeActions({
  patient,
  onSent,
  size = "sm",
}: {
  patient: { id: string; name: string; email?: string | null; phone?: string | null };
  onSent?: () => void;
  size?: "sm" | "default";
}) {
  const navigate = useNavigate();
  const { practice } = usePractice();
  const [sent, setSent] = useState<{ template: FormTemplate; link: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const options = templatesFor("intake", practice?.category);

  const sendLink = async (template: FormTemplate) => {
    try {
      const { link, expiresAt } = await createIntakeLink(patient.id, template);
      setSent({ template, link, expiresAt });
      onSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the link");
    }
  };

  const first = patient.name.split(" ")[0];
  const message = sent
    ? `Hi ${first}, please fill in this short form for ${practice?.name} before your visit: ${sent.link} (it works until ${format(new Date(sent.expiresAt), "d MMMM")}).`
    : "";

  const menu = (label: string, icon: React.ReactNode, onPick: (t: FormTemplate) => void, title: string) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size} className="gap-1.5">
          {icon} {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map(({ template, suggested }) => (
          <DropdownMenuItem key={template.key} onClick={() => onPick(template)} className="flex-col items-start gap-0.5">
            <span className="font-medium">
              {template.title}
              {suggested && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Suggested</span>}
            </span>
            <span className="text-xs text-muted-foreground">{template.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {menu("Fill in on this device", <Tablet className="h-4 w-4" />, (t) => navigate(`/patients/${patient.id}/intake/new?template=${t.key}`), `Hand the device to ${first}`)}
        {menu("Send a form", <ClipboardList className="h-4 w-4" />, sendLink, `Send ${first} a link`)}
      </div>

      <Dialog open={!!sent} onOpenChange={(o) => !o && setSent(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send "{sent?.template.title}" to {first}</DialogTitle>
            <DialogDescription>
              {first} fills it in on their phone; no login needed. The link works once, until{" "}
              {sent && format(new Date(sent.expiresAt), "d MMMM yyyy")}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
            <Link2 className="ml-1 h-4 w-4 shrink-0 text-muted-foreground" />
            <input readOnly value={sent?.link ?? ""} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Form link" />
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(sent?.link ?? "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  toast.error("Couldn't copy. Select the link and copy it yourself.");
                }
              }}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="gap-2">
              <a href={`https://wa.me/${waNumber(patient.phone)}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" className="gap-2" disabled={!patient.email}>
              <a href={`mailto:${patient.email ?? ""}?subject=${encodeURIComponent(`A form from ${practice?.name}`)}&body=${encodeURIComponent(message)}`}>
                <Mail className="h-4 w-4" /> Email
              </a>
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setSent(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
