import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, RotateCcw } from "lucide-react";
import { supabase } from "@/config/supabase";
import { usePractice } from "@/context/PracticeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_BRAND,
  POWERED_BY_TEXT,
  isHexColor,
  readableTextOn,
  resolveBrand,
} from "@/lib/branding";

const LOGO_BUCKET = "practice-branding";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function ColorField({
  id, label, help, value, onChange, disabled,
}: {
  id: string; label: string; help: string; value: string;
  onChange: (v: string) => void; disabled: boolean;
}) {
  const valid = isHexColor(value);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          disabled={disabled}
          className="h-10 w-14 cursor-pointer rounded border border-border bg-background p-1 disabled:cursor-not-allowed"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="#RRGGBB"
          maxLength={7}
          disabled={disabled}
          className="w-32 font-mono uppercase"
          aria-invalid={!valid}
        />
      </div>
      <p className={valid ? "text-xs text-muted-foreground" : "text-xs text-red-600"}>
        {valid ? help : "Enter a colour as # followed by 6 characters, e.g. #0F766E"}
      </p>
    </div>
  );
}

export function BrandingSettings() {
  const { practice, refresh } = usePractice();
  const isAdmin = practice?.role === "practice_admin";

  const [primary, setPrimary] = useState<string>(DEFAULT_BRAND.primary);
  const [accent, setAccent] = useState<string>(DEFAULT_BRAND.accent);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!practice) return;
    setPrimary(practice.brand_primary_color ?? DEFAULT_BRAND.primary);
    setAccent(practice.brand_accent_color ?? DEFAULT_BRAND.accent);
    setLogoUrl(practice.logo_url);
  }, [practice?.id, practice?.brand_primary_color, practice?.brand_accent_color, practice?.logo_url]);

  if (!practice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Your account isn’t linked to a practice yet, so there’s no branding to set.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const bothValid = isHexColor(primary) && isHexColor(accent);
  const preview = resolveBrand({ primary, accent });

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error("Use a PNG, JPG, WebP or SVG image");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("The logo must be 2 MB or smaller");
      return;
    }
    try {
      setUploading(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${practice.id}/logo-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast.success("Logo uploaded. Save to apply it.");
    } catch (err) {
      console.error("Logo upload failed:", err);
      toast.error("Couldn’t upload the logo");
    } finally {
      setUploading(false);
    }
  };

  const save = async (values: { primary: string | null; accent: string | null; logo: string | null }) => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("practices")
        .update({
          brand_primary_color: values.primary,
          brand_accent_color: values.accent,
          logo_url: values.logo,
        })
        .eq("id", practice.id);
      if (error) throw error;
      await refresh();
      toast.success("Branding saved");
    } catch (err) {
      console.error("Saving branding failed:", err);
      toast.error("Couldn’t save branding");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () =>
    save({ primary: null, accent: null, logo: logoUrl });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Your logo and colours appear across the app for everyone at {practice.name}.
          Status colours, such as red for errors and alerts, stay the same so they always mean the same thing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {!isAdmin && (
          <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
            Only a practice admin can change branding.
          </p>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-background">
                  {logoUrl ? (
                    <img src={logoUrl} alt={`${practice.name} logo`} className="h-14 w-14 object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={!isAdmin || uploading} asChild>
                    <label className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        accept={LOGO_TYPES.join(",")}
                        className="sr-only"
                        onChange={handleLogo}
                        disabled={!isAdmin || uploading}
                      />
                    </label>
                  </Button>
                  {logoUrl && (
                    <Button variant="ghost" size="sm" disabled={!isAdmin} onClick={() => setLogoUrl(null)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Square PNG or SVG works best. 2 MB maximum.</p>
            </div>

            <ColorField
              id="brand-primary"
              label="Main colour"
              help="Buttons, menu highlights and your practice name."
              value={primary}
              onChange={setPrimary}
              disabled={!isAdmin}
            />
            <ColorField
              id="brand-accent"
              label="Accent colour"
              help="Badges and highlights."
              value={accent}
              onChange={setAccent}
              disabled={!isAdmin}
            />

            {bothValid && preview.primaryAdjusted && (
              <p className="text-xs text-muted-foreground">
                Your main colour is very light, so it’s shown slightly darker ({preview.primary}) to keep
                menu items and links readable on white.
              </p>
            )}
          </div>

          {/* Live preview, drawn with the chosen colours before saving */}
          <div className="rounded-lg border border-border overflow-hidden" aria-label="Branding preview">
            <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
              {logoUrl && <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />}
              <span className="font-bold" style={{ color: preview.primary }}>{practice.name}</span>
            </div>
            <div className="space-y-4 bg-background p-4">
              <div
                className="rounded-md px-3 py-2 text-sm font-medium"
                style={{ color: preview.primary, backgroundColor: `${preview.primary}26` }}
              >
                Appointments (active menu item)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="rounded-md px-4 py-2 text-sm font-medium"
                  style={{ backgroundColor: preview.primary, color: readableTextOn(preview.primary) }}
                >
                  Book appointment
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: preview.accent, color: readableTextOn(preview.accent) }}
                >
                  120 points
                </span>
              </div>
              <p className="border-t border-border pt-3 text-center text-xs text-muted-foreground">
                {POWERED_BY_TEXT}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={resetToDefault} disabled={!isAdmin || saving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Use Care Africa colours
          </Button>
          <Button
            onClick={() => save({ primary: primary.toUpperCase(), accent: accent.toUpperCase(), logo: logoUrl })}
            disabled={!isAdmin || saving || !bothValid}
          >
            {saving ? "Saving…" : "Save branding"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
