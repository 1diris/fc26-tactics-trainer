export type YouthAction = "promote" | "keep" | "loan" | "release" | "watch";

export type YouthAdviceInput = {
  age: number | null;
  overall: number | null;
  potential_min: number | null;
  potential_max: number | null;
};

export const ADVICE_LABEL: Record<YouthAction, string> = {
  promote: "Promote",
  keep: "Keep & develop",
  loan: "Loan out",
  release: "Release / Sell",
  watch: "Keep watching",
};

/** Deterministic academy recommendation from age, OVR and potential. */
export function youthAdvice(p: YouthAdviceInput): { action: YouthAction; reason: string } {
  const ovr = p.overall ?? 0;
  const age = p.age ?? 0;
  const pot = p.potential_max ?? p.potential_min ?? ovr;

  if (ovr >= 70) return { action: "promote", reason: `OVR ${ovr} · first-team ready` };
  if (ovr >= 65 && pot >= 80) return { action: "promote", reason: `OVR ${ovr} · POT ${pot}` };
  if (pot < 70) return { action: "release", reason: `POT ${pot} · low ceiling` };
  if (age >= 18 && ovr < 58 && pot < 75)
    return { action: "release", reason: `${age} yrs · OVR ${ovr} too low` };
  if (pot >= 80) return { action: "keep", reason: `POT ${pot} · not ready yet` };
  if (age >= 17 && ovr < 62 && pot >= 75)
    return { action: "loan", reason: `${age} yrs · needs minutes` };
  return { action: "watch", reason: `POT ${pot} · borderline` };
}
