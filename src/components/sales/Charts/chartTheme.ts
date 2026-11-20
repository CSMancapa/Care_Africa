import { usePractice } from "@/context/PracticeContext";
import { resolveBrand } from "@/lib/branding";

/** Chart colours: the practice's brand colour first, then calm neutrals. */
export function useChartColors(): string[] {
  const { practice } = usePractice();
  const { primary } = resolveBrand({
    primary: practice?.brand_primary_color,
    accent: practice?.brand_accent_color,
  });
  return [primary, "#0F766E", "#F2B544", "#64748B", "#A3A3A3"];
}

export const axisStyle = { fontSize: 12, fill: "#71717A" };
