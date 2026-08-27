import { POSITION_LABELS, normalizePosition } from "./football";
import type { SquadRow } from "./squad";

/** Positions we analyse depth for, with the number of bodies a squad wants. */
export const ANALYSED_POSITIONS: readonly { position: string; required: number }[] = [
  { position: "GK", required: 2 },
  { position: "RB", required: 2 },
  { position: "CB", required: 4 },
  { position: "LB", required: 2 },
  { position: "CDM", required: 2 },
  { position: "CM", required: 3 },
  { position: "CAM", required: 2 },
  { position: "RW", required: 2 },
  { position: "LW", required: 2 },
  { position: "ST", required: 2 },
];

/**
 * Positions whose natural players can reasonably cover the key position.
 * Used for the "kan spille positionen" count.
 */
const COVER_SOURCES: Record<string, readonly string[]> = {
  GK: [],
  RB: ["RWB", "RM", "CB", "RW"],
  LB: ["LWB", "LM", "CB", "LW"],
  CB: ["CDM", "RB", "LB"],
  CDM: ["CM", "CB"],
  CM: ["CDM", "CAM", "RM", "LM"],
  CAM: ["CM", "CF", "RW", "LW", "RM", "LM"],
  RW: ["RM", "RWB", "CAM", "LW", "CF"],
  LW: ["LM", "LWB", "CAM", "RW", "CF"],
  ST: ["CF", "RW", "LW", "CAM"],
};

export type NeedPriority = "high" | "medium" | "low";

export type PositionNeed = {
  position: string;
  label: string;
  required: number;
  naturalCount: number;
  capableCount: number;
  depth: number;
  bestOverall: number | null;
  averageOverall: number | null;
  priority: NeedPriority;
  reason: string;
  /** Filter suggestion for the transfer market. */
  suggestion: {
    minOverall: number;
    maxOverall: number;
    minPotential: number | null;
    maxAge: number | null;
  };
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Rough measure of the club's level: average OVR of its 11 best players. */
export function clubLevel(rows: SquadRow[]): number | null {
  const ratings = rows
    .map((row) => row.current?.overall)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => b - a)
    .slice(0, 11);
  const value = average(ratings);
  return value == null ? null : Math.round(value);
}

/** Average age of the squad, used to keep suggestions in the same age profile. */
export function squadAge(rows: SquadRow[]): number | null {
  const ages = rows
    .map((row) => row.current?.age)
    .filter((value): value is number => typeof value === "number");
  const value = average(ages);
  return value == null ? null : Math.round(value);
}

/**
 * Analyses the current squad and returns every analysed position ordered by
 * how badly it needs reinforcement.
 */
export function analyseSquadNeeds(rows: SquadRow[]): PositionNeed[] {
  const withData = rows.filter((row) => row.current !== null || row.position !== null);
  const level = clubLevel(rows) ?? 70;
  const avgAge = squadAge(rows);

  const needs = ANALYSED_POSITIONS.map(({ position, required }) => {
    const natural = withData.filter((row) => normalizePosition(row.position) === position);
    const sources = COVER_SOURCES[position] ?? [];
    const capable = withData.filter((row) => {
      const pos = normalizePosition(row.position);
      return pos != null && pos !== position && sources.includes(pos);
    });

    const naturalRatings = natural
      .map((row) => row.current?.overall)
      .filter((value): value is number => typeof value === "number");
    const bestOverall = naturalRatings.length > 0 ? Math.max(...naturalRatings) : null;
    const averageValue = average(naturalRatings);
    const averageOverall = averageValue == null ? null : Math.round(averageValue);
    const depth = natural.length + capable.length * 0.5;

    let priority: NeedPriority;
    let reason: string;
    const qualityGap = bestOverall == null ? null : bestOverall - level;

    if (natural.length === 0) {
      priority = "high";
      reason =
        capable.length > 0
          ? `Ingen naturlig spiller — kun ${capable.length} der kan dække positionen.`
          : "Ingen spiller i truppen kan dække positionen.";
    } else if (qualityGap != null && qualityGap <= -5) {
      priority = "high";
      reason = `Bedste spiller er ${Math.abs(qualityGap)} OVR under klubbens niveau (${level}).`;
    } else if (depth < required - 1) {
      priority = "high";
      reason = `Kun ${natural.length} naturlig${natural.length === 1 ? "" : "e"} spiller${
        natural.length === 1 ? "" : "e"
      } — truppen mangler dybde (${required} anbefalet).`;
    } else if (depth < required) {
      priority = "medium";
      reason = `Tynd dybde: ${natural.length} naturlig${natural.length === 1 ? "" : "e"} + ${
        capable.length
      } der kan dække (${required} anbefalet).`;
    } else if (qualityGap != null && qualityGap < 0) {
      priority = "medium";
      reason = `Dækket, men bedste spiller (${bestOverall}) er under klubbens niveau (${level}).`;
    } else {
      priority = "low";
      reason = `Godt dækket: ${natural.length} naturlige, bedste ${bestOverall ?? "–"} OVR.`;
    }

    const baseline = bestOverall ?? level;
    const minOverall =
      priority === "high" ? clamp(Math.max(level - 2, baseline - 1), 40, 95) : clamp(baseline, 40, 95);

    return {
      position,
      label: POSITION_LABELS[position] ?? position,
      required,
      naturalCount: natural.length,
      capableCount: capable.length,
      depth: Math.round(depth * 10) / 10,
      bestOverall,
      averageOverall,
      priority,
      reason,
      suggestion: {
        minOverall,
        maxOverall: clamp(minOverall + 12, minOverall, 99),
        minPotential: clamp(Math.max(level + 2, minOverall + 2), 40, 99),
        maxAge: avgAge == null ? null : clamp(avgAge + 4, 21, 36),
      },
    } satisfies PositionNeed;
  });

  const rank: Record<NeedPriority, number> = { high: 0, medium: 1, low: 2 };
  return needs.sort(
    (a, b) =>
      rank[a.priority] - rank[b.priority] ||
      a.depth - b.depth ||
      (a.bestOverall ?? 0) - (b.bestOverall ?? 0),
  );
}

export const PRIORITY_META: Record<NeedPriority, { dot: string; label: string; tone: string }> = {
  high: {
    dot: "🔴",
    label: "Høj prioritet",
    tone: "border-destructive/50 bg-destructive/10 text-destructive",
  },
  medium: {
    dot: "🟡",
    label: "Medium prioritet",
    tone: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  },
  low: {
    dot: "🟢",
    label: "Lav prioritet",
    tone: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  },
};
