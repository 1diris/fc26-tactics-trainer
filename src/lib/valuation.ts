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
 * Median FC 26 value (EUR) per overall rating, taken from the shared database.
 * Used as the base line when a career player has no FC 26 card at all
 * (youth players and regens created inside the game).
 */
const BASELINE_BY_OVERALL: Record<number, number> = {
  47: 110_000,
  48: 100_000,
  50: 100_000,
  52: 180_000,
  54: 230_000,
  56: 325_000,
  58: 425_000,
  60: 500_000,
  62: 775_000,
  64: 775_000,
  65: 950_000,
  66: 1_100_000,
  67: 1_200_000,
  68: 1_400_000,
  69: 1_600_000,
  70: 1_700_000,
  71: 1_900_000,
  72: 2_400_000,
  73: 3_100_000,
  74: 4_500_000,
  75: 6_000_000,
  76: 8_000_000,
  77: 11_000_000,
  78: 15_000_000,
  79: 18_500_000,
  80: 21_500_000,
  81: 25_500_000,
  82: 30_000_000,
  83: 36_500_000,
  84: 43_000_000,
  85: 52_500_000,
  86: 70_000_000,
  87: 83_500_000,
  88: 99_000_000,
  89: 111_000_000,
  90: 122_500_000,
};

const BASELINE_KEYS = Object.keys(BASELINE_BY_OVERALL)
  .map(Number)
  .sort((a, b) => a - b);

/** Interpolated median market value for a given overall rating. */
export function baselineValue(overall: number): number {
  const min = BASELINE_KEYS[0];
  const max = BASELINE_KEYS[BASELINE_KEYS.length - 1];
  if (overall <= min) return BASELINE_BY_OVERALL[min] * Math.pow(0.9, min - overall);
  if (overall >= max) return BASELINE_BY_OVERALL[max] * Math.pow(1.15, overall - max);

  let lower = min;
  let upper = max;
  for (const key of BASELINE_KEYS) {
    if (key <= overall) lower = key;
    if (key >= overall) {
      upper = key;
      break;
    }
  }
  if (lower === upper) return BASELINE_BY_OVERALL[lower];
  const ratio = (overall - lower) / (upper - lower);
  // Geometric interpolation — value grows exponentially with rating.
  return (
    BASELINE_BY_OVERALL[lower] *
    Math.pow(BASELINE_BY_OVERALL[upper] / BASELINE_BY_OVERALL[lower], ratio)
  );
}

/**
 * Deterministic career valuation: start from the original FC 26 value and adjust
 * for current OVR, age, remaining potential and position. Same input always
 * yields the same output — no randomness.
 *
 * Players without an FC 26 card fall back to the median value for their rating,
 * adjusted with the same age and position factors, so a value is always shown.
 */
export function estimateCareerValue(input: ValuationInput): number | null {
  const { fc } = input;
  const baseValue = fc?.value_eur != null && fc.value_eur > 0 ? Number(fc.value_eur) : null;
  const baseOverall = fc?.overall ?? null;
  const currentOverall = input.currentOverall ?? null;

  if (baseValue === null || baseOverall === null) {
    if (currentOverall === null) return input.snapshotValue ?? null;
    // No FC 26 card (youth/regen player) — model from the rating baseline.
    const estimate =
      baselineValue(currentOverall) *
      ageFactor(input.currentAge, 0) *
      positionFactor(input.position, fc);
    if (!Number.isFinite(estimate) || estimate <= 0) return input.snapshotValue ?? null;
    return roundValue(estimate);
  }

  if (currentOverall === null) {
    return roundValue(baseValue);
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
