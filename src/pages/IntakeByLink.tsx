import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { IntakeFormFill } from "@/components/intake/IntakeFormFill";
import { applyBrand } from "@/lib/branding";
import { getTemplate } from "@/lib/forms/templates";
import { getIntakeLink, submitIntakeLink, type IntakeLinkInfo } from "@/lib/db/clinical";
import { POWERED_BY_TEXT } from "@/lib/branding";

const DEAD: Record<string, { title: string; body: string }> = {
  invalid: { title: "This link isn't valid", body: "Check that you opened the whole link, or ask the practice to send it again." },
  expired: { title: "This link has expired", body: "Ask the practice to send you a new one." },
  cancelled: { title: "This link is no longer active", body: "The practice may have sent you a newer one." },
  completed: { title: "You've already sent this form", body: "Thank you! There's nothing more to do." },
};

/**
 * /intake/:token — a member fills in a form the practice sent them, on
 * their own phone, without logging in. Shown in the practice's colours.
 */
export default function IntakeByLink() {
  const { token = "" } = useParams();
  const [info, setInfo] = useState<IntakeLinkInfo | null>(null);
  const [done, setDone] = useState(false);
  const page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getIntakeLink(token)
      .then((i) => {
        setInfo(i);
        if (i.practice_name) document.title = `${i.practice_name} · Form`;
      })
      .catch(() => setInfo({ status: "invalid" }));
  }, [token]);

  // The practice's colours, on this page only (the app resets its own
  // colours when nobody is signed in).
  useEffect(() => {
    if (page.current && (info?.brand_primary_color || info?.brand_accent_color)) {
      applyBrand({ primary: info.brand_primary_color, accent: info.brand_accent_color }, page.current);
    }
  }, [info, done]);

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const template = info.template_key ? getTemplate(info.template_key) : undefined;
  const status = info.status === "pending" && !template ? "invalid" : info.status;

  return (
    <div ref={page} className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          {info.logo_url ? (
            <img src={info.logo_url} alt="" className="h-10 w-10 rounded-lg bg-white object-contain ring-1 ring-border" />
          ) : info.practice_name ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
              {info.practice_name.slice(0, 1)}
            </span>
          ) : null}
          <p className="text-lg font-bold text-ink">{info.practice_name ?? "Care Africa"}</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        {done ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">Thank you{info.first_name ? `, ${info.first_name}` : ""}!</h1>
            <p className="mt-2 text-lg text-muted-foreground">{info.practice_name} has your form. You can close this page.</p>
          </div>
        ) : status !== "pending" ? (
          <div className="py-16 text-center">
            {status === "completed" ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            ) : (
              <TriangleAlert className="mx-auto h-12 w-12 text-amber-500" />
            )}
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">{(DEAD[status] ?? DEAD.invalid).title}</h1>
            <p className="mt-2 text-muted-foreground">{(DEAD[status] ?? DEAD.invalid).body}</p>
          </div>
        ) : (
          template && (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">
                {info.first_name ? `Hi ${info.first_name},` : "Hello,"}
              </h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {info.practice_name} has asked you to fill in this form before your visit. It takes a few minutes.
              </p>
              <h2 className="mt-8 text-xl font-bold text-ink">{template.title}</h2>
              <div className="mt-6">
                <IntakeFormFill
                  template={template}
                  practiceName={info.practice_name ?? "the practice"}
                  onSubmit={async (answers, consent, name) => {
                    await submitIntakeLink(token, template, answers, consent, name);
                    setDone(true);
                    window.scrollTo({ top: 0 });
                  }}
                />
              </div>
            </>
          )
        )}
      </main>
      <footer className="pb-8 text-center text-xs text-muted-foreground/80">{POWERED_BY_TEXT}</footer>
    </div>
  );
}
