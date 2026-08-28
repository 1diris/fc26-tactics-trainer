import { normalizePosition } from "./football";

/** Original, immutable FC 26 data for a player from the shared database. */
export type FcOriginal = {
  id: string;
  external_id: number;
  short_name: string;
  long_name: string | null;
  positions: string[];
  overall: number | null;
  potential: number | null;
  value_eur: number | null;
  wage_eur: number | null;
  age: number | null;
  club_name: string | null;
  league_name: string | null;
  face_url: string | null;
};

export type ValuationInput = {
  /** Current career values. */
  currentOverall: number | null | undefined;
  currentAge: number | null | undefined;
  /** Value the user's own import captured, used as fallback. */
  snapshotValue?: number | null | undefined;
  position?: string | null | undefined;
  fc: FcOriginal | null | undefined;
};

/** Multiplier per OVR point above/below the original rating. */
const OVR_STEP = 1.18;

/** Positional price weighting, mirroring how FC prices roles. */
const POSITION_FACTOR: Record<string, number> = {
  ST: 1.12,
  CF: 1.1,
  LW: 1.08,
  RW: 1.08,
  CAM: 1.06,
  CM: 1,
  LM: 1,
  RM: 1,
  CDM: 0.96,
  CB: 0.94,
  LB: 0.92,
  RB: 0.92,
  LWB: 0.92,
  RWB: 0.92,
  GK: 0.85,
};

function ageFactor(age: number | null | undefined, growthLeft: number): number {
  if (age == null) return 1;
  if (age <= 19) return 1.35 + Math.min(growthLeft, 12) * 0.02;
  if (age <= 23) return 1.2 + Math.min(growthLeft, 10) * 0.015;
  if (age <= 26) return 1.05;
  if (age <= 28) return 1;
  // Steady decline once past peak resale age.
  return Math.max(0.25, 1 - (age - 28) * 0.12);
}

function positionFactor(position: string | null | undefined, fc: FcOriginal | null | undefined) {
  const primary = normalizePosition(position) ?? normalizePosition(fc?.positions?.[0] ?? null);
  if (!primary) return 1;
  return POSITION_FACTOR[primary] ?? 1;
}

/** Rounds to a readable transfer-market figure. */
function roundValue(value: number): number {
  if (value >= 50_000_000) return Math.round(value / 1_000_000) * 1_000_000;
  if (value >= 5_000_000) return Math.round(value / 500_000) * 500_000;
  if (value >= 500_000) return Math.round(value / 100_000) * 100_000;
  return Math.max(10_000, Math.round(value / 10_000) * 10_000);
}

/**
 * Deterministic career valuation: start from the original FC 26 value and adjust
 * for current OVR, age, remaining potential and position. Same input always
 * yields the same output — no randomness.
 */
export function estimateCareerValue(input: ValuationInput): number | null {
  const { fc } = input;
  const baseValue = fc?.value_eur != null && fc.value_eur > 0 ? Number(fc.value_eur) : null;
  const baseOverall = fc?.overall ?? null;
  const currentOverall = input.currentOverall ?? null;

  if (baseValue === null || baseOverall === null || currentOverall === null) {
    // Not enough original data — fall back to whatever the user's import gave us.
    return input.snapshotValue ?? null;
  }

  const delta = currentOverall - baseOverall;
  const ovrMultiplier = Math.pow(OVR_STEP, delta);

  const originalPot = fc?.potential ?? null;
  const growthLeft = originalPot !== null ? Math.max(0, originalPot - currentOverall) : 0;
  const potentialMultiplier = 1 + Math.min(growthLeft, 12) * 0.015;

  const estimate =
    baseValue *
    ovrMultiplier *
    ageFactor(input.currentAge, growthLeft) *
    potentialMultiplier *
    positionFactor(input.position, fc);

  if (!Number.isFinite(estimate) || estimate <= 0) return input.snapshotValue ?? null;
  return roundValue(estimate);
}

/**
 * Original FC 26 potential, never overwritten by career development.
 * Falls back to the potential captured from the user's own screenshots.
 */
export function originalPotential(
  fc: FcOriginal | null | undefined,
  snapshotPotential: number | null | undefined,
): number | null {
  return fc?.potential ?? snapshotPotential ?? null;
}
