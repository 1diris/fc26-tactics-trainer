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
 describe("updated Manquepierda definition", () => {
  test("starting European competition is Europa League", () => { expect(challenge.startingPoint.europe).toBe("UEFA Europa League"); });
  test("five seasons run from 25/26 through 29/30", () => { expect(challenge.seasonGoals.map(s => s.label)).toEqual(["25/26", "26/27", "27/28", "28/29", "29/30"]); });
  test("season-one European goal is manual and awards three points", () => { const goal = challenge.seasonGoals[0].goals.find(g => g.id === "s1g2"); expect(goal?.verify).toEqual({ method: "manual" }); expect(goal?.points).toBe(3); });
  test("season-two qualification requires top four and awards three points", () => { const goal = challenge.seasonGoals[1].goals.find(g => g.id === "s2g1"); expect(goal?.verify).toEqual({ method: "auto", metric: "league_position", operator: "<=", value: 4 }); expect(goal?.points).toBe(3); expect(evaluate({ screen_ok: true, club_visible: true, confidence: 1, value: 4, details: "" }, goal.verify)).toBe("approved"); expect(evaluate({ screen_ok: true, club_visible: true, confidence: 1, value: 5, details: "" }, goal.verify)).toBe("not_met"); });
  test("rank intervals and maximum remain unchanged", () => { expect(challenge.maxPoints).toBe(64); expect(challenge.ranks.map(r => [r.min, r.max])).toEqual([[0,15],[16,31],[32,47],[48,null]]); for (const [points, title] of [[0,"Fyret i oktober"],[15,"Fyret i oktober"],[16,"Solid manager"],[31,"Solid manager"],[32,"Heliópolis-helt"],[47,"Heliópolis-helt"],[48,"Bedre end Pellegrini"],[64,"Bedre end Pellegrini"],[65,"Bedre end Pellegrini"]]) expect(currentRank(challenge, points)?.title).toBe(title); });
  test("existing completion IDs retain their three-point scores without mutation", () => { const saved = { s1g2: { completed: true, source: "manual" }, s2g1: { completed: true, source: "auto" } }; const before = JSON.stringify(saved); expect(score(challenge, saved, 0)).toBe(6); expect(JSON.stringify(saved)).toBe(before); expect(challenge.seasonGoals.map(s => s.goals.map(g => g.id))).toEqual([["s1g1","s1g2","s1g3","s1g4","s1g5","s1g6"],["s2g1","s2g2","s2g3","s2g4","s2g5"],["s3g1","s3g2","s3g3","s3g4"],["s4g1","s4g2","s4g3","s4g4"],["s5g1","s5g2","s5g3","s5g4"]]); });
 });
