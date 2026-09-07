import { KEY_POSITIONS, normalizePosition } from "./football";
import { estimateCareerValue, originalPotential, type FcOriginal } from "./valuation";

export type Season = { id: string; label: string; sort_order: number; notes: string | null };

export type Player = {
  id: string;
  name: string;
  primary_position: string | null;
  preferred_foot: string | null;
  nationality: string | null;
  shirt_number: number | null;
  fc_player_id?: string | null;
  fc_match_source?: string | null;
};

export type Snapshot = {
  id: string;
  player_id: string;
  season_id: string;
  overall: number | null;
  potential: number | null;
  age: number | null;
  position: string | null;
  market_value: number | null;
  wage: number | null;
  contract_until: string | null;
  form: number | null;
  stats: unknown;
};

export type SquadRow = {
  player: Player;
  current: Snapshot | null;
  previous: Snapshot | null;
  position: string | null;
  ovrDelta: number | null;
  valueDelta: number | null;
  /** Original FC 26 data, when the player is linked to the shared database. */
  fc: FcOriginal | null;
  /** Original potential from FC 26 (falls back to imported potential). */
  potential: number | null;
  /** Deterministic career valuation based on original value + current OVR/age. */
  estimatedValue: number | null;
};

export function sortedSeasons(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => a.sort_order - b.sort_order);
}

export function buildSquad(
  seasons: Season[],
  players: Player[],
  snapshots: Snapshot[],
  seasonId: string | null,
  fcPlayers: FcOriginal[] = [],
): SquadRow[] {
  const fcById = new Map(fcPlayers.map((entry) => [entry.id, entry]));
  const ordered = sortedSeasons(seasons);
  const index = ordered.findIndex((season) => season.id === seasonId);
  const previousSeason = index > 0 ? ordered[index - 1] : undefined;

  return players
    .map((player) => {
      const current =
        snapshots.find((s) => s.player_id === player.id && s.season_id === seasonId) ?? null;
      const previous = previousSeason
        ? (snapshots.find((s) => s.player_id === player.id && s.season_id === previousSeason.id) ??
          null)
        : null;
      const ovrDelta =
        current?.overall != null && previous?.overall != null
          ? current.overall - previous.overall
          : null;
      const valueDelta =
        current?.market_value != null && previous?.market_value != null
          ? current.market_value - previous.market_value
          : null;
      const position = normalizePosition(current?.position ?? player.primary_position);
      const fc = player.fc_player_id ? (fcById.get(player.fc_player_id) ?? null) : null;
      return {
        player,
        current,
        previous,
        position,
        ovrDelta,
        valueDelta,
        fc,
        potential: originalPotential(fc, current?.potential),
        estimatedValue: estimateCareerValue({
          currentOverall: current?.overall,
          currentAge: current?.age,
          snapshotValue: current?.market_value,
          position,
          fc,
        }),
      };
    })
    .filter((row) => row.current !== null || row.previous !== null || true);
}

export type Warning = {
  tone: "danger" | "warn" | "success";
  title: string;
  message: string;
};

export function averageOf(values: (number | null | undefined)[]): number | null {
  const numbers = values.filter((value): value is number => typeof value === "number");
  if (numbers.length === 0) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function contractYear(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(19|20)\d{2}/);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function seasonStartYear(label: string): number | null {
  const match = label.match(/(19|20)\d{2}/);
  return match ? Number.parseInt(match[0], 10) : null;
}

export function buildWarnings(rows: SquadRow[], seasonLabel: string | null): Warning[] {
  const warnings: Warning[] = [];
  const withData = rows.filter((row) => row.current !== null);

  // Missing natural cover per key position.
  const covered = new Set(withData.map((row) => row.position).filter(Boolean) as string[]);
  const missing = KEY_POSITIONS.filter((position) => !covered.has(position));
  for (const position of missing.slice(0, 3)) {
    warnings.push({
      tone: "danger",
      title: "Position missing",
      message: `You have no natural player at ${position}.`,
    });
  }

  const thin = KEY_POSITIONS.filter(
    (position) => withData.filter((row) => row.position === position).length === 1,
  );
  for (const position of thin.slice(0, 2)) {
    warnings.push({
      tone: "warn",
      title: "No backup",
      message: `Only one natural ${position} in the squad.`,
    });
  }

  // Contracts expiring.
  const startYear = seasonLabel ? seasonStartYear(seasonLabel) : null;
  if (startYear) {
    const expiring = withData.filter((row) => {
      const year = contractYear(row.current?.contract_until);
      return year !== null && year <= startYear + 1;
    });
    if (expiring.length > 0) {
      warnings.push({
        tone: "warn",
        title: "Contract",
        message: `${expiring.length} ${expiring.length === 1 ? "player has" : "players have"} a contract expiring within the next season.`,
      });
    }
  }

  const risers = rows
    .filter((row) => (row.ovrDelta ?? 0) >= 2)
    .sort((a, b) => (b.ovrDelta ?? 0) - (a.ovrDelta ?? 0));
  const topRiser = risers[0];
  if (topRiser?.previous?.overall != null && topRiser.current?.overall != null) {
    warnings.push({
      tone: "success",
      title: "Growth",
      message: `${topRiser.player.name} has risen from ${topRiser.previous.overall} → ${topRiser.current.overall} OVR.`,
    });
  }

  const fallers = rows.filter((row) => (row.ovrDelta ?? 0) <= -1);
  if (fallers.length > 0) {
    warnings.push({
      tone: "warn",
      title: "Declining rating",
      message: `${fallers.length} ${fallers.length === 1 ? "player has" : "players have"} dropped in overall since last season.`,
    });
  }

  return warnings;
}
