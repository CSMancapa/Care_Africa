import { supabase } from "@/config/supabase";

/**
 * Two-step sign-in (2FA): password + a code from an authenticator app.
 * Required for everyone at a practice (decision of 21 Nov 2026), except
 * practices Care Africa has exempted (the shared demo login). The database
 * enforces it too (migration 0008): without the second step, no practice
 * data is visible.
 */

export type TwoStepStatus = "ok" | "setup" | "verify";

let cache: { token: string; status: TwoStepStatus } | null = null;

/** Forget the cached answer, e.g. after setting up or verifying. */
export function clearTwoStepCache() {
  cache = null;
}

async function isRequired(): Promise<boolean> {
  const { data, error } = await supabase.rpc("my_mfa_requirement");
  // Before migration 0008 is applied the function doesn't exist: don't lock
  // anyone out.
  if (error) return false;
  return !!data;
}

/** What the signed-in person still has to do before using the app. */
export async function getTwoStepStatus(): Promise<TwoStepStatus> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return "ok";
  if (cache?.token === token) return cache.status;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  let status: TwoStepStatus = "ok";
  if (aal?.currentLevel !== "aal2") {
    if (aal?.nextLevel === "aal2") status = "verify"; // has an authenticator: ask for the code
    else if (await isRequired()) status = "setup"; // must add one first
  }
  cache = { token, status };
  return status;
}

/** Their verified authenticator app, if any. */
export async function getAuthenticator() {
  const { data } = await supabase.auth.mfa.listFactors();
  return data?.totp?.[0] ?? null;
}

/**
 * Check a 6-digit code from the authenticator app (upgrades the session).
 * During setup, pass the new (not yet confirmed) authenticator's id.
 */
export async function verifyAuthenticatorCode(code: string, factorId?: string) {
  const id = factorId ?? (await getAuthenticator())?.id;
  if (!id) throw new Error("No authenticator app is set up for this login");
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code: code.trim() });
  if (error) throw new Error(friendlyError(error.message));
  clearTwoStepCache();
}

/** Use one recovery code instead (each works once). */
export async function verifyRecoveryCode(code: string) {
  const { error } = await supabase.auth.mfa.recoveryCodes.verify({ code });
  if (error) {
    const e = error as { code?: string; message: string };
    if (e.code === "mfa_recovery_codes_locked") {
      throw new Error("Too many wrong codes. Wait a few minutes and try again, or ask your practice admin to reset your two-step sign-in.");
    }
    throw new Error(e.code === "mfa_verification_failed" ? "That recovery code didn't work. It may already have been used." : e.message);
  }
  clearTwoStepCache();
}

export type RecoveryCodesResult = { codes: string[] } | { unavailable: true };

/** Make a first set of recovery codes, or a fresh set replacing the old one. */
export async function makeRecoveryCodes(): Promise<RecoveryCodesResult> {
  const api = supabase.auth.mfa.recoveryCodes;
  let res = await api.generate({ friendlyName: "Recovery codes" });
  if ((res.error as { code?: string } | null)?.code === "mfa_verified_factor_exists") {
    res = await api.regenerate();
  }
  if (res.error) {
    const code = (res.error as { code?: string }).code ?? "";
    if (/not_enabled/.test(code)) return { unavailable: true };
    throw new Error(res.error.message);
  }
  return { codes: res.data.codes };
}

export async function getRecoveryCodesStatus(): Promise<{ total: number; remaining: number } | null> {
  try {
    const { data, error } = await supabase.auth.mfa.recoveryCodes.getStatus();
    if (error || !data) return null;
    return { total: data.total, remaining: data.remaining };
  } catch {
    return null;
  }
}

/** Show codes as blocks of four: k4m9-x7qp-2ab8-ht3z. */
export function formatRecoveryCode(code: string) {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

function friendlyError(message: string) {
  if (/invalid totp|invalid code|expired/i.test(message)) {
    return "That code didn't work. Codes change every 30 seconds, so use the one showing now.";
  }
  return message;
}

/**
 * The QR code as an image address. The library returns the SVG pasted
 * straight after "data:image/svg+xml;utf-8,", which breaks on characters
 * such as "#"; encode it properly.
 */
export function qrImageSrc(qr: string) {
  const prefix = "data:image/svg+xml;utf-8,";
  const svg = qr.startsWith(prefix) ? qr.slice(prefix.length) : qr.startsWith("<svg") ? qr : null;
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : qr;
}
