/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { getChallenge, compare, evaluate, score, currentRank, MAX_UPLOADS, MAX_IMAGES } from "./catalogue";
const challenge = getChallenge("betis-manquepierda");
describe("Manquepierda rules", () => {
  test("all goals award exactly 64 maximum points", () => { expect(challenge.seasonGoals.flatMap((season) => season.goals).reduce((sum, goal) => sum + goal.points, 0)).toBe(64); });
  test("each p3 penalty deducts five points without clamping", () => { expect(score(challenge, {}, 2)).toBe(-10); });
  test("age must be strictly below 26", () => { expect(compare(26, "<", 26)).toBe(false); expect(compare(25.9, "<", 26)).toBe(true); });
  test("wage ceiling includes 60000 euros", () => { expect(compare(60000, "<=", 60000)).toBe(true); expect(compare(60001, "<=", 60000)).toBe(false); });
  test("Spanish-speaking share must reach 50 percent", () => { expect(compare(0.5, ">=", 0.5)).toBe(true); expect(compare(0.49, ">=", 0.5)).toBe(false); });
  test("season-one budget must exceed 30 million euros", () => { expect(compare(30000000, ">", 30000000)).toBe(false); expect(compare(30000001, ">", 30000000)).toBe(true); });
  test("weekly wage total must be below 1.2 million euros", () => { expect(compare(1200000, "<", 1200000)).toBe(false); expect(compare(1199999, "<", 1200000)).toBe(true); });
  test("approved evidence requires confidence at least 0.8", () => { const reading = { screen_ok: true, club_visible: true, value: 4, details: "", confidence: 0.8 }; expect(evaluate(reading, { method: "auto", operator: "<=", value: 6 })).toBe("approved"); expect(evaluate({ ...reading, confidence: 0.79 }, { method: "auto", operator: "<=", value: 6 })).toBe("pending"); });
  test("wrong screen or invisible club never approves", () => { const reading = { screen_ok: true, club_visible: true, value: 1, details: "", confidence: 1 }; expect(evaluate({ ...reading, screen_ok: false }, { method: "auto", operator: "==", value: 1 })).toBe("pending"); expect(evaluate({ ...reading, club_visible: false }, { method: "auto", operator: "==", value: 1 })).toBe("pending"); });
  test("only the named trophies count", () => { expect(compare("Copa del Rey", "in", ["Copa del Rey", "UEFA Europa League"])).toBe(true); expect(compare("La Liga", "in", ["Copa del Rey", "UEFA Europa League"])).toBe(false); });
  test("uploads allow at most three images and five attempts", () => { expect(MAX_IMAGES).toBe(3); expect(MAX_UPLOADS).toBe(5); });
  test("highest rank begins at 48 points", () => { expect(currentRank(challenge, 47)?.title).toBe("Heliópolis-helt"); expect(currentRank(challenge, 48)?.title).toBe("Bedre end Pellegrini"); });
});