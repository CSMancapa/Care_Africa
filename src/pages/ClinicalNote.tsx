import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Check, Loader2, Lock, PenLine, Printer, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/Dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormFields, FormView } from "@/components/forms/FormRenderer";
import { usePractice } from "@/context/PracticeContext";
import { useModules } from "@/lib/modules";
import { canSeeClinical } from "@/lib/roles";
import { getTemplate } from "@/lib/forms/templates";
import { missingRequired, type Answers, type FormTemplate } from "@/lib/forms/types";
import { getPatient } from "@/lib/db/patients";
import { addAddendum, createNote, deleteDraft, getNote, saveDraft, signNote, type Note } from "@/lib/db/clinical";
import { logExport, logRecordView } from "@/lib/audit";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * /patients/:patientId/notes/new?template=…  and  /patients/:patientId/notes/:noteId
 * Write a note (drafts save automatically), sign it to lock it, then add
 * addenda for anything later. Signed notes can be printed.
 */
export default function ClinicalNote() {
  const { patientId = "", noteId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { practice } = usePractice();
  const { hasFullClinical } = useModules();

  const [note, setNote] = useState<Note | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [patientName, setPatientName] = useState("");
  const [id, setId] = useState<string | undefined>(noteId);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [save, setSave] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [confirmSign, setConfirmSign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [body, setBody] = useState("");
  const creating = useRef<Promise<string> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: u }, p] = await Promise.all([
        import("@/config/supabase").then(({ supabase }) => supabase.auth.getUser()),
        getPatient(patientId),
      ]);
      setMe(u.user?.id ?? null);
      setPatientName(p.name);
      if (noteId) {
        const n = await getNote(noteId);
        setNote(n);
        setTemplate(n.template);
        setAnswers(n.answers);
        setId(n.id);
      } else {
        const t = getTemplate(params.get("template") ?? "");
        if (!t) throw new Error("Choose a template from the member's record");
        setTemplate(t);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't open the note");
    } finally {
      setLoading(false);
    }
  }, [noteId, patientId]);

  useEffect(() => {
    load();
    if (patientId) logRecordView(patientId, "clinical_record");
  }, [load]);

  const editable = !note || (note.status === "draft" && note.authorId === me);

  // Save drafts automatically a moment after typing stops.
  const persist = useCallback(async (next: Answers) => {
    if (!practice || !template) return;
    setSave("saving");
    try {
      if (!id) {
        creating.current ??= createNote(practice.id, patientId, template, next);
        const newId = await creating.current;
        setId(newId);
        window.history.replaceState(null, "", `/patients/${patientId}/notes/${newId}`);
      } else {
        await saveDraft(id, next);
      }
      setSave("saved");
      setDirty(false);
    } catch (error) {
      setSave("error");
      toast.error(error instanceof Error ? error.message : "Couldn't save the draft");
    }
  }, [practice?.id, template, id, patientId]);

  useEffect(() => {
    if (!dirty || !editable) return;
    const t = setTimeout(() => persist(answers), 1500);
    return () => clearTimeout(t);
  }, [answers, dirty, editable, persist]);

  // Warn before leaving with unsaved typing.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const tryToSign = () => {
    if (!template) return;
    const missing = missingRequired(template, answers);
    if (missing.length) {
      setInvalid(new Set(missing.map((f) => f.id)));
      document.getElementById(`field-${missing[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error(`Fill in ${missing.map((f) => f.label.toLowerCase()).slice(0, 3).join(", ")}${missing.length > 3 ? "…" : ""} before signing`);
      return;
    }
    setInvalid(new Set());
    setConfirmSign(true);
  };

  const sign = async () => {
    if (!practice || !template) return;
    setBusy(true);
    try {
      let noteIdToOpen = id;
      if (!noteIdToOpen) noteIdToOpen = await createNote(practice.id, patientId, template, answers, true);
      else await signNote(noteIdToOpen, answers);
      setDirty(false);
      setConfirmSign(false);
      toast.success("Note signed and locked");
      navigate(`/patients/${patientId}/notes/${noteIdToOpen}`, { replace: true });
      setNote(await getNote(noteIdToOpen));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't sign the note");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id) return navigate(`/patients/${patientId}/record`);
    if (!window.confirm("Delete this draft? This can't be undone.")) return;
    try {
      await deleteDraft(id);
      setDirty(false);
      toast.success("Draft deleted");
      navigate(`/patients/${patientId}/record`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't delete");
    }
  };

  const addend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;
    setBusy(true);
    try {
      await addAddendum(note.id, reason, body);
      setReason("");
      setBody("");
      setNote(await getNote(note.id));
      toast.success("Addendum added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add the addendum");
    } finally {
      setBusy(false);
    }
  };

  const print = async () => {
    if (practice) await logExport(practice.id, "clinical");
    window.print();
  };

  if (!practice) return <DashboardLayout><div /></DashboardLayout>;
  if (!canSeeClinical(practice.role) || !hasFullClinical) {
    return (
      <DashboardLayout>
        <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
          <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-semibold text-ink">Clinical notes aren't available to you here.</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to={`/patients/${patientId}/record`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-ink print:hidden">
          <ArrowLeft className="h-4 w-4" /> {patientName ? `${patientName}'s record` : "Back to record"}
        </Link>

        {loading || !template ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {patientName} · {practice.name}
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">{template.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {note
                    ? note.status === "signed"
                      ? `Signed by ${note.signedByName} on ${format(new Date(note.signedAt!), "d MMMM yyyy 'at' HH:mm")}`
                      : `Draft by ${note.authorName}, started ${format(new Date(note.createdAt), "d MMM yyyy, HH:mm")}`
                    : id
                    ? "Draft, saved automatically as you type. Only you can see it until you sign."
                    : "New note. It saves as a draft as you type."}
                </p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                {editable ? (
                  <>
                    <span className="mr-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {save === "saving" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                        : save === "saved" && !dirty ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Draft saved</>
                        : save === "error" ? <span className="text-red-600">Not saved</span>
                        : dirty ? "Unsaved changes" : null}
                    </span>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-red-600 hover:text-red-700" onClick={remove}>
                      <Trash2 className="h-4 w-4" /> {id ? "Delete draft" : "Discard"}
                    </Button>
                    <Button onClick={tryToSign} className="gap-2">
                      <Lock className="h-4 w-4" /> Sign and lock
                    </Button>
                  </>
                ) : note?.status === "signed" ? (
                  <Button variant="outline" onClick={print} className="gap-2">
                    <Printer className="h-4 w-4" /> Print
                  </Button>
                ) : null}
              </div>
            </div>

            {note && note.status === "draft" && note.authorId !== me && (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">This is {note.authorName}'s draft. Only they can edit or sign it.</p>
            )}

            {/* Body */}
            <Card className="p-6 sm:p-8">
              {editable ? (
                <FormFields
                  template={template}
                  answers={answers}
                  onChange={(next) => {
                    setAnswers(next);
                    setDirty(true);
                    // Clear red marks as fields get filled in.
                    if (invalid.size) {
                      const still = new Set(missingRequired(template, next).map((f) => f.id));
                      setInvalid(new Set([...invalid].filter((id) => still.has(id))));
                    }
                  }}
                  invalidIds={invalid}
                />
              ) : (
                <FormView template={template} answers={answers} />
              )}
            </Card>

            {/* Addenda */}
            {note?.status === "signed" && (
              <section className="space-y-3">
                <h2 className="text-base font-bold text-ink">Addenda</h2>
                {note.addenda.length === 0 && (
                  <p className="text-sm text-muted-foreground">None. Signed notes can't be edited; add an addendum for anything later.</p>
                )}
                {note.addenda.map((a) => (
                  <Card key={a.id} className="p-5">
                    <p className="text-xs text-muted-foreground">
                      {a.authorName} · {format(new Date(a.createdAt), "d MMM yyyy, HH:mm")} · <span className="font-medium text-ink">Reason: {a.reason}</span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{a.body}</p>
                  </Card>
                ))}
                <Card className="p-5 print:hidden">
                  <form onSubmit={addend} className="space-y-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink"><PenLine className="h-4 w-4" /> Add an addendum</p>
                    <div className="space-y-1.5">
                      <Label htmlFor="reason">Reason</Label>
                      <Input id="reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Lab results received, correction, late entry" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="body">Addendum</Label>
                      <Textarea id="body" required rows={3} value={body} onChange={(e) => setBody(e.target.value)} className="rounded-lg bg-card" />
                    </div>
                    <Button type="submit" disabled={busy || !reason.trim() || !body.trim()}>
                      {busy ? "Adding…" : "Add addendum"}
                    </Button>
                  </form>
                </Card>
              </section>
            )}
          </>
        )}
      </div>

      <Dialog open={confirmSign} onOpenChange={setConfirmSign}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign and lock this note?</DialogTitle>
            <DialogDescription>
              Once signed, the note can't be changed or deleted, by anyone. Anything you need to add later goes in an
              addendum, with the date and a reason.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmSign(false)}>Keep editing</Button>
            <Button onClick={sign} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Sign note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
