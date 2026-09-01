import { findMatchingPlayerIndex } from "@/lib/player-matching";
import type { Player, Snapshot } from "@/lib/squad";

export type DiffField =
  | "position"
  | "overall"
  | "potential"
  | "age"
  | "market_value"
  | "wage"
  | "contract_until";

export type DiffChange = {
  field: DiffField;
  before: string | number | null;
  after: string | number | null;
};

export type DraftDiff = {
  status: "new" | "updated";
  playerId: string | null;
  playerName: string | null;
  changes: DiffChange[];
  /** Quick lookup of changed fields for cell highlighting. */
  changed: Set<DiffField>;
};

type DiffableDraft = {
  name: string;
  shirt_number?: number | null | undefined;
  position?: string | null | undefined;
  overall?: number | null | undefined;
  potential?: number | null | undefined;
  age?: number | null | undefined;
  market_value?: number | null | undefined;
  wage?: number | null | undefined;
  contract_until?: string | null | undefined;
};

const NUMERIC_FIELDS: DiffField[] = ["overall", "potential", "age", "market_value", "wage"];

/**
 * Compares each reviewed draft against the squad as it is stored today, so the
 * user can see who is new and which numbers a follow-up screenshot changes.
 */
export function diffDrafts(
  drafts: DiffableDraft[],
  players: Player[],
  snapshots: Snapshot[],
  seasonId: string | null,
): DraftDiff[] {
  const snapshotByPlayer = new Map<string, Snapshot>();
  for (const snapshot of snapshots) {
    if (seasonId && snapshot.season_id !== seasonId) continue;
    snapshotByPlayer.set(snapshot.player_id, snapshot);
  }

  return drafts.map((draft) => {
    const index = findMatchingPlayerIndex(players, draft);
    const player = index >= 0 ? players[index] : undefined;
    if (!player) {
      return { status: "new", playerId: null, playerName: null, changes: [], changed: new Set() };
    }

    const snapshot = snapshotByPlayer.get(player.id) ?? null;
    const changes: DiffChange[] = [];

    const push = (field: DiffField, before: string | number | null, after: string | number | null) => {
      if (after === null || after === undefined) return; // AI kunne ikke læse feltet
      if (before === after) return;
      changes.push({ field, before: before ?? null, after });
    };

    for (const field of NUMERIC_FIELDS) {
      const after = draft[field as keyof DiffableDraft] as number | null | undefined;
      const before = (snapshot ? (snapshot[field as keyof Snapshot] as number | null) : null) ?? null;
      push(field, before, after ?? null);
    }

    push(
      "position",
      snapshot?.position ?? player.primary_position ?? null,
      draft.position ?? null,
    );
    push("contract_until", snapshot?.contract_until ?? null, draft.contract_until ?? null);

    return {
      status: "updated",
      playerId: player.id,
      playerName: player.name,
      changes,
      changed: new Set(changes.map((change) => change.field)),
    };
  });
}

export function diffCounts(diffs: DraftDiff[]) {
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const diff of diffs) {
    if (diff.status === "new") created += 1;
    else if (diff.changes.length > 0) updated += 1;
    else unchanged += 1;
  }
  return { created, updated, unchanged };
}
