export const POSITIONS = [
  "GK",
  "RB",
  "RWB",
  "CB",
  "LB",
  "LWB",
  "CDM",
  "CM",
  "CAM",
  "RM",
  "LM",
  "RW",
  "LW",
  "CF",
  "ST",
] as const;

export type Position = (typeof POSITIONS)[number];

export const POSITION_GROUPS: Record<string, readonly string[]> = {
  Målmand: ["GK"],
  Forsvar: ["RB", "RWB", "CB", "LB", "LWB"],
  Midtbane: ["CDM", "CM", "CAM", "RM", "LM"],
  Angreb: ["RW", "LW", "CF", "ST"],
};

/** Positions we expect at least one natural player for. */
export const KEY_POSITIONS: readonly string[] = ["GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "ST"];


export function normalizePosition(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().toUpperCase().replace(/\s+/g, "");
  const first = value.split(/[,/|-]/)[0] ?? value;
  const map: Record<string, string> = {
    GOALKEEPER: "GK",
    MV: "GK",
    SW: "CB",
    RCB: "CB",
    LCB: "CB",
    RDM: "CDM",
    LDM: "CDM",
    RCM: "CM",
    LCM: "CM",
    RS: "ST",
    LS: "ST",
    SS: "CF",
    RF: "RW",
    LF: "LW",
  };
  if (map[first]) return map[first]!;
  return (POSITIONS as readonly string[]).includes(first) ? first : first || null;
}

export function positionGroup(position: string | null | undefined): string {
  if (!position) return "Ukendt";
  for (const [group, list] of Object.entries(POSITION_GROUPS)) {
    if (list.includes(position)) return group;
  }
  return "Ukendt";
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `€${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(".0", "")}m`;
  }
  if (value >= 1000) return `€${Math.round(value / 1000)}k`;
  return `€${Math.round(value)}`;
}

export function formatWage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  if (value >= 1000) return `€${Math.round(value / 1000)}k/uge`;
  return `€${Math.round(value)}/uge`;
}

export function ovrTone(overall: number | null | undefined): string {
  if (!overall) return "text-muted-foreground";
  if (overall >= 84) return "text-primary";
  if (overall >= 76) return "text-foreground";
  if (overall >= 68) return "text-muted-foreground";
  return "text-muted-foreground";
}

/**
 * Normalised key used to recognise the same player across screenshots and
 * imports (case, accents, punctuation and extra spacing are ignored).
 */
export function playerKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'’`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
