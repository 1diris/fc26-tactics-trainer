import { positionFit, type Fit, type Formation } from "./formations";
import { defaultRole, type SlotRole } from "./roles";
import type { SquadRow } from "./squad";

export type LineupEntry = {
  slotId: string;
  slotPosition: string;
  row: SquadRow | null;
  fit: Fit | null;
};

export type LineupSuggestion = {
  entries: LineupEntry[];
  lineup: Record<string, string | null>;
  /** Suggested default role/focus per slot. */
  roles: Record<string, SlotRole>;
  totalOvr: number;
  avgOvr: number | null;
  naturalCount: number;
  okCount: number;
  outCount: number;
  emptyCount: number;
  /** Positions in the formation with no natural player available in the squad. */
  missingNatural: string[];
  /** Human readable reasons why a perfect XI isn't possible. */
  reasons: string[];
};

const FIT_WEIGHT: Record<Fit, number> = { natural: 100_000, ok: 10_000, out: 0 };

/** Hungarian algorithm (JV variant) maximising total score of slot -> player. */
function solveAssignment(cost: number[][], n: number, m: number): number[] {
  // cost is n x m (minimisation). Returns assignment for each row (-1 if none).
  const INF = Number.POSITIVE_INFINITY;
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0);
  const way = new Array(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(INF);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1]![j - 1]! - u[i0]! - v[j]!;
        if (cur < minv[j]!) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j]! < delta) {
          delta = minv[j]!;
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]!] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0]!;
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }

  const result = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j] > 0) result[p[j]! - 1] = j - 1;
  }
  return result;
}

export function suggestLineup(formation: Formation, rows: SquadRow[]): LineupSuggestion {
  const slots = formation.slots;
  const players = rows.filter((row) => row.player?.id);

  const score = (slotPosition: string, row: SquadRow) => {
    const fit = positionFit(slotPosition, row.position);
    return FIT_WEIGHT[fit] + (row.current?.overall ?? 40);
  };

  let assignment: number[] = [];
  if (players.length > 0) {
    const n = slots.length;
    const m = Math.max(players.length, n);
    const cost: number[][] = [];
    for (let i = 0; i < n; i++) {
      const rowCost: number[] = [];
      for (let j = 0; j < m; j++) {
        const player = players[j];
        rowCost.push(player ? -score(slots[i]!.position, player) : 0);
      }
      cost.push(rowCost);
    }
    assignment = solveAssignment(cost, n, m);
  }

  const entries: LineupEntry[] = slots.map((slot, index) => {
    const playerIndex = assignment[index] ?? -1;
    const row = playerIndex >= 0 ? (players[playerIndex] ?? null) : null;
    return {
      slotId: slot.id,
      slotPosition: slot.position,
      row,
      fit: row ? positionFit(slot.position, row.position) : null,
    };
  });

  const lineup: Record<string, string | null> = {};
  for (const entry of entries) lineup[entry.slotId] = entry.row?.player.id ?? null;

  const roles: Record<string, SlotRole> = {};
  for (const slot of slots) roles[slot.id] = defaultRole(slot.position);

  const ovrValues = entries
    .map((entry) => entry.row?.current?.overall)
    .filter((value): value is number => typeof value === "number");
  const totalOvr = ovrValues.reduce((sum, value) => sum + value, 0);
  const naturalCount = entries.filter((entry) => entry.fit === "natural").length;
  const okCount = entries.filter((entry) => entry.fit === "ok").length;
  const outCount = entries.filter((entry) => entry.fit === "out").length;
  const emptyCount = entries.filter((entry) => !entry.row).length;

  const missingNatural = [
    ...new Set(
      slots
        .filter((slot) => !players.some((row) => positionFit(slot.position, row.position) === "natural"))
        .map((slot) => slot.position),
    ),
  ];

  const reasons: string[] = [];
  if (emptyCount > 0) {
    reasons.push(
      `Du har kun ${players.length} spillere i truppen, så ${emptyCount} plads(er) står tomme.`,
    );
  }
  if (outCount > 0) {
    const outSlots = entries
      .filter((entry) => entry.fit === "out")
      .map((entry) => entry.slotPosition);
    reasons.push(
      `${outCount} spiller(e) står ude af position (${outSlots.join(", ")}), fordi ingen ledige spillere dækker de pladser.`,
    );
    if (missingNatural.length > 0) {
      reasons.push(
        `Truppen mangler helt naturlige spillere til: ${missingNatural.join(", ")}. Overvej at hente spillere der på Transfermarkedet.`,
      );
    }
  }

  return {
    entries,
    lineup,
    roles,
    totalOvr,
    avgOvr: ovrValues.length > 0 ? Math.round(totalOvr / ovrValues.length) : null,
    naturalCount,
    okCount,
    outCount,
    emptyCount,
    missingNatural,
    reasons,
  };
}
