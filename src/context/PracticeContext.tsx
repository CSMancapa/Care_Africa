import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/config/supabase";
import { applyBrand, resetBrand } from "@/lib/branding";

export type PracticeRole = "staff" | "doctor" | "practice_admin";

export interface CurrentPractice {
  id: string;
  name: string;
  logo_url: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  /** Practice type id, see src/lib/practiceTypes.ts. */
  category: string;
  /** Subscription plan and modules, see src/lib/modules.ts. */
  plan: "starter" | "practice" | "network";
  clinical_records: "off" | "intake" | "full";
  claims_enabled: boolean;
  role: PracticeRole;
}

interface PracticeContextValue {
  practice: CurrentPractice | null;
  /** Every practice this user works at (a locum can belong to several). */
  practices: CurrentPractice[];
  loading: boolean;
  switchPractice: (practiceId: string) => void;
  refresh: () => Promise<void>;
}

const PracticeContext = createContext<PracticeContextValue | undefined>(undefined);

const SELECTED_KEY = "care-africa:selected-practice";

/**
 * Loads the signed-in user's practice through practice_members (the new
 * schema's link between users and practices), then themes the app in that
 * practice's brand colours. Resets to Care Africa's colours on logout.
 */
export function PracticeProvider({ children }: { children: React.ReactNode }) {
  const [practices, setPractices] = useState<CurrentPractice[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try { return localStorage.getItem(SELECTED_KEY); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setPractices([]);
      setLoading(false);
      return;
    }

    const query = (practiceColumns: string) =>
      supabase
        .from("practice_members")
        .select(`role, practice:practices(${practiceColumns})`)
        .eq("profile_id", session.user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

    const BASE = "id, name, logo_url, brand_primary_color, brand_accent_color";
    let { data, error } = await query(`${BASE}, category, plan, clinical_records, claims_enabled`);
    if (error && /does not exist/i.test(error.message)) {
      // The modules migration (0006) isn't applied yet: carry on without
      // modules rather than locking everyone out.
      console.warn("Practice modules not available yet; apply migration 0006.");
      ({ data, error } = await query(BASE));
    }

    if (error) {
      console.error("Could not load practice membership:", error);
      setPractices([]);
    } else {
      setPractices(
        (data ?? [])
          // Supabase types an embedded row as an object or an array depending on the relation.
          .map((m: any) => {
            const p = Array.isArray(m.practice) ? m.practice[0] : m.practice;
            return p ? { ...p, role: m.role as PracticeRole } : null;
          })
          .filter(Boolean) as CurrentPractice[]
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setLoading(true);
        load();
      }
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const practice = practices.find((p) => p.id === selectedId) ?? practices[0] ?? null;

  // Theme the app and the browser tab for the current practice.
  useEffect(() => {
    if (practice) {
      applyBrand({ primary: practice.brand_primary_color, accent: practice.brand_accent_color });
      document.title = `${practice.name} · Care Africa`;
    } else {
      resetBrand();
      document.title = "Care Africa";
    }
  }, [practice?.id, practice?.name, practice?.brand_primary_color, practice?.brand_accent_color]);

  const switchPractice = (practiceId: string) => {
    setSelectedId(practiceId);
    try { localStorage.setItem(SELECTED_KEY, practiceId); } catch { /* storage unavailable */ }
  };

  return (
    <PracticeContext.Provider value={{ practice, practices, loading, switchPractice, refresh: load }}>
      {children}
    </PracticeContext.Provider>
  );
}

export function usePractice(): PracticeContextValue {
  const ctx = useContext(PracticeContext);
  if (!ctx) throw new Error("usePractice must be used inside <PracticeProvider>");
  return ctx;
}
