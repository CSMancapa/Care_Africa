import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CodeInput } from "@/components/twostep/CodeInput";
import { IntakeFormFill } from "@/components/intake/IntakeFormFill";
import { usePractice } from "@/context/PracticeContext";
import { canSeeClinical } from "@/lib/roles";
import { getTemplate } from "@/lib/forms/templates";
import { getPatient } from "@/lib/db/patients";
import { submitIntakeInPractice } from "@/lib/db/clinical";
import { getAuthenticator, verifyAuthenticatorCode } from "@/lib/twoStep";

/**
 * /patients/:patientId/intake/new?template=…
 * A full-screen form to hand to the client on a practice tablet or PC.
 * Nothing else in the app is reachable from here: leaving needs the staff
 * member's authenticator code, so a client can't wander into the system.
 */
export default function IntakeOnDevice() {
  const { patientId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { practice } = usePractice();
  const template = getTemplate(params.get("template") ?? "");

  const [patientName, setPatientName] = useState("");
  const [done, setDone] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [needsCode, setNeedsCode] = useState(true);
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    getPatient(patientId).then((p) => setPatientName(p.name)).catch(() => setPatientName(""));
    getAuthenticator().then((f) => setNeedsCode(!!f));
  }, [patientId]);

  // Keep the client on this page: the browser's back button reopens it.
  useEffect(() => {
    if (!exitOpen) window.history.pushState(null, "", window.location.href);
    const stay = () => {
      window.history.pushState(null, "", window.location.href);
      setExitOpen(true);
    };
    window.addEventListener("popstate", stay);
    return () => window.removeEventListener("popstate", stay);
  }, []);

  const back = practice && canSeeClinical(practice.role) ? `/patients/${patientId}/record` : "/patients";

  const leave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (needsCode) {
      setChecking(true);
      try {
        await verifyAuthenticatorCode(code);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "That code didn't work");
        setCode("");
        return;
      } finally {
        setChecking(false);
      }
    }
    navigate(back, { replace: true });
  };

  if (!practice || !template || template.kind !== "intake") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <p className="font-semibold text-ink">This form isn't available.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/patients")}>Back to members</Button>
        </div>
      </div>
    );
  }

  const first = patientName.split(" ")[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          {practice.logo_url ? (
            <img src={practice.logo_url} alt="" className="h-9 w-9 rounded-lg bg-white object-contain ring-1 ring-border" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {practice.name.slice(0, 1)}
            </span>
          )}
          <p className="flex-1 font-bold text-ink">{practice.name}</p>
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setExitOpen(true)}>
            <LogOut className="h-4 w-4" /> Staff
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        {done ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">Thank you{first ? `, ${first}` : ""}!</h1>
            <p className="mt-2 text-lg text-muted-foreground">Please hand the device back to reception.</p>
            <Button variant="outline" className="mt-10" onClick={() => setExitOpen(true)}>Staff: back to Care Africa</Button>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">{first ? `Hi ${first},` : "Welcome,"}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              please fill in this form so we can look after you safely. It takes a few minutes.
            </p>
            <h2 className="mt-8 text-xl font-bold text-ink">{template.title}</h2>
            <div className="mt-6">
              <IntakeFormFill
                template={template}
                practiceName={practice.name}
                defaultName={patientName}
                onSubmit={async (answers, consent, name) => {
                  await submitIntakeInPractice(practice.id, patientId, template, answers, consent, name);
                  setDone(true);
                  window.scrollTo({ top: 0 });
                }}
              />
            </div>
          </>
        )}
      </main>

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={leave}>
            <DialogHeader>
              <DialogTitle>Staff only</DialogTitle>
              <DialogDescription>
                {needsCode
                  ? "Enter the code from your authenticator app to go back to Care Africa."
                  : "Go back to Care Africa?"}
                {!done && " The form hasn't been sent yet."}
              </DialogDescription>
            </DialogHeader>
            {needsCode && <div className="py-4"><CodeInput value={code} onChange={setCode} /></div>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setExitOpen(false)}>Stay here</Button>
              <Button type="submit" disabled={checking || (needsCode && code.length !== 6)}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Back to Care Africa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
