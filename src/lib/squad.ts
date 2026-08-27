import { KEY_POSITIONS, normalizePosition } from "./football";

export type Season = { id: string; label: string; sort_order: number; notes: string | null };

export type Player = {
  id: string;
  name: string;
  primary_position: string | null;
  preferred_foot: string | null;
  nationality: string | null;
  shirt_number: number | null;
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
};

export function sortedSeasons(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => a.sort_order - b.sort_order);
}

export function buildSquad(
  seasons: Season[],
  players: Player[],
  snapshots: Snapshot[],
  seasonId: string | null,
): SquadRow[] {
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
      return {
        player,
        current,
        previous,
        position: normalizePosition(current?.position ?? player.primary_position),
        ovrDelta,
        valueDelta,
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
      title: "Position mangler",
      message: `Du har ingen naturlig spiller på ${position}.`,
    });
  }

  const thin = KEY_POSITIONS.filter(
    (position) => withData.filter((row) => row.position === position).length === 1,
  );
  for (const position of thin.slice(0, 2)) {
    warnings.push({
      tone: "warn",
      title: "Ingen backup",
      message: `Kun én naturlig ${position} i truppen.`,
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
        title: "Kontrakt",
        message: `${expiring.length} ${expiring.length === 1 ? "spiller har" : "spillere har"} kontraktudløb inden for næste sæson.`,
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
      title: "Udvikling",
      message: `${topRiser.player.name} er steget fra ${topRiser.previous.overall} → ${topRiser.current.overall} OVR.`,
    });
  }

  const fallers = rows.filter((row) => (row.ovrDelta ?? 0) <= -1);
  if (fallers.length > 0) {
    warnings.push({
      tone: "warn",
      title: "Faldende rating",
      message: `${fallers.length} ${fallers.length === 1 ? "spiller er" : "spillere er"} faldet i overall siden sidste sæson.`,
    });
  }

  return warnings;
}
