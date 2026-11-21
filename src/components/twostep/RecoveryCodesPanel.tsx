import { useState } from "react";
import { Check, Copy, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatRecoveryCode } from "@/lib/twoStep";

/**
 * Shows a new set of recovery codes once, with ways to keep them. Each code
 * gets someone back in once if they lose their phone.
 */
export function RecoveryCodesPanel({ codes, email }: { codes: string[]; email?: string }) {
  const [copied, setCopied] = useState(false);
  const pretty = codes.map(formatRecoveryCode);
  const text =
    `Care Africa recovery codes${email ? ` for ${email}` : ""}\n` +
    `Made ${new Date().toLocaleDateString("en-ZA")}. Each code works once.\n\n` +
    pretty.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Download or print them instead.");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "care-africa-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    const w = window.open("", "_blank", "width=480,height=640");
    if (!w) return;
    w.document.write(
      `<pre style="font: 15px/1.8 ui-monospace, monospace; padding: 24px">${text.replace(/</g, "&lt;")}</pre>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="space-y-3">
      <ol className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3.5 font-mono text-[13px] text-ink">
        {pretty.map((c, i) => (
          <li key={c} className="flex gap-2 whitespace-nowrap">
            <span className="w-5 text-right text-muted-foreground/60">{i + 1}.</span>
            <span className="tracking-wide">{c}</span>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-1.5">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download} className="gap-1.5">
          <Download className="h-4 w-4" /> Download
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={print} className="gap-1.5">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>
    </div>
  );
}
