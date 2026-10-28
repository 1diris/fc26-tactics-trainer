import betis from "./betis-manquepierda.json";

export type Verify = { method: string; metric?: string; operator?: string; value?: number | string | string[] };
export type Goal = { id: string; text: string; points: number; category: string; verify: Verify };
export type Rule = { id: string; title: string; description: string; type: string; verify: Verify };
export type Challenge = {
  id: string; title: string; subtitle: string; game: string; club: string; league: string;
  seasons: number; difficulty: string; tags: string[]; description: string;
  startingPoint: { ovr: number; transferBudget: string; formation: string; europe?: string };
  screens: Record<string, { label: string; hint: string }>;
  metrics: Record<string, { screen: string; type: string; extract: string }>;
  rules: Rule[]; seasonGoals: { season: number; label: string; theme: string; goals: Goal[] }[];
  penalties: { id: string; trigger: string; consequence: string; points: number }[];
  ranks: { min: number; max: number | null; title: string }[]; maxPoints: number;
};
export const challenges: Challenge[] = [betis];
export function getChallenge(id: string) {
  const challenge = challenges.find((item) => item.id === id);
  if (!challenge) throw new Error("Challenge not found.");
  return challenge;
}
export type Reading = { screen_ok: boolean; club_visible: boolean; value: number | string | null; details: string; confidence: number };
export type Completion = { completed: boolean; source: "manual" | "auto" };
export function compare(value: Reading["value"], operator: string | undefined, target: Verify["value"]) {
  if (value === null) return false;
  if (operator === "in") return Array.isArray(target) && typeof value === "string" && target.includes(value);
  if (operator === "==") return value === target;
  if (typeof value !== "number" || typeof target !== "number" || !Number.isFinite(value)) return false;
  switch (operator) { case "<": return value < target; case "<=": return value <= target; case ">": return value > target; case ">=": return value >= target; default: return false; }
}
export function evaluate(reading: Reading, verify: Verify) {
  if (!reading.screen_ok || !reading.club_visible || reading.confidence < 0.8 || reading.value === null) return "pending";
  return compare(reading.value, verify.operator, verify.value) ? "approved" : "not_met";
}
export function score(challenge: Challenge, completions: Record<string, Completion>, penalties: number) {
  return challenge.seasonGoals.flatMap((season) => season.goals).reduce((total, goal) => total + (completions[goal.id]?.completed ? goal.points : 0), 0) + penalties * (challenge.penalties.find((penalty) => penalty.id === "p3")?.points ?? 0);
}
export function currentRank(challenge: Challenge, points: number) {
  return challenge.ranks.find((rank) => points >= rank.min && (rank.max === null || points <= rank.max)) ?? challenge.ranks[0];
}
export const MAX_UPLOADS = 5;
export const MAX_IMAGES = 3;