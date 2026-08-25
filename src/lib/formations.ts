export type Slot = {
  /** Stable slot id within the formation. */
  id: string;
  position: string;
  /** Percentages on a vertical pitch: 0 = own goal line, 100 = opponent goal. */
  x: number;
  y: number;
};

export type Formation = {
  name: string;
  slots: Slot[];
};

const gk: Slot = { id: "gk", position: "GK", x: 50, y: 6 };

export const FORMATIONS: Formation[] = [
  {
    name: "4-3-3",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "cdm", position: "CDM", x: 50, y: 44 },
      { id: "lcm", position: "CM", x: 28, y: 56 },
      { id: "rcm", position: "CM", x: 72, y: 56 },
      { id: "lw", position: "LW", x: 14, y: 80 },
      { id: "st", position: "ST", x: 50, y: 88 },
      { id: "rw", position: "RW", x: 86, y: 80 },
    ],
  },
  {
    name: "4-2-3-1",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "ldm", position: "CDM", x: 36, y: 44 },
      { id: "rdm", position: "CDM", x: 64, y: 44 },
      { id: "lm", position: "LM", x: 14, y: 68 },
      { id: "cam", position: "CAM", x: 50, y: 66 },
      { id: "rm", position: "RM", x: 86, y: 68 },
      { id: "st", position: "ST", x: 50, y: 88 },
    ],
  },
  {
    name: "4-4-2",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "lm", position: "LM", x: 12, y: 54 },
      { id: "lcm", position: "CM", x: 38, y: 50 },
      { id: "rcm", position: "CM", x: 62, y: 50 },
      { id: "rm", position: "RM", x: 88, y: 54 },
      { id: "lst", position: "ST", x: 36, y: 84 },
      { id: "rst", position: "ST", x: 64, y: 84 },
    ],
  },
  {
    name: "4-2-2-2",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "ldm", position: "CDM", x: 36, y: 44 },
      { id: "rdm", position: "CDM", x: 64, y: 44 },
      { id: "lcam", position: "CAM", x: 22, y: 68 },
      { id: "rcam", position: "CAM", x: 78, y: 68 },
      { id: "lst", position: "ST", x: 36, y: 88 },
      { id: "rst", position: "ST", x: 64, y: 88 },
    ],
  },
  {
    name: "3-5-2",
    slots: [
      gk,
      { id: "lcb", position: "CB", x: 26, y: 20 },
      { id: "ccb", position: "CB", x: 50, y: 18 },
      { id: "rcb", position: "CB", x: 74, y: 20 },
      { id: "lwb", position: "LWB", x: 10, y: 48 },
      { id: "cdm", position: "CDM", x: 50, y: 42 },
      { id: "lcm", position: "CM", x: 32, y: 60 },
      { id: "rcm", position: "CM", x: 68, y: 60 },
      { id: "rwb", position: "RWB", x: 90, y: 48 },
      { id: "lst", position: "ST", x: 38, y: 86 },
      { id: "rst", position: "ST", x: 62, y: 86 },
    ],
  },
  {
    name: "5-2-1-2",
    slots: [
      gk,
      { id: "lwb", position: "LWB", x: 8, y: 30 },
      { id: "lcb", position: "CB", x: 30, y: 20 },
      { id: "ccb", position: "CB", x: 50, y: 18 },
      { id: "rcb", position: "CB", x: 70, y: 20 },
      { id: "rwb", position: "RWB", x: 92, y: 30 },
      { id: "lcm", position: "CM", x: 34, y: 48 },
      { id: "rcm", position: "CM", x: 66, y: 48 },
      { id: "cam", position: "CAM", x: 50, y: 68 },
      { id: "lst", position: "ST", x: 34, y: 88 },
      { id: "rst", position: "ST", x: 66, y: 88 },
    ],
  },
  {
    name: "4-1-4-1",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "cdm", position: "CDM", x: 50, y: 40 },
      { id: "lm", position: "LM", x: 12, y: 62 },
      { id: "lcm", position: "CM", x: 38, y: 60 },
      { id: "rcm", position: "CM", x: 62, y: 60 },
      { id: "rm", position: "RM", x: 88, y: 62 },
      { id: "st", position: "ST", x: 50, y: 88 },
    ],
  },
];

export function findFormation(name: string): Formation {
  return FORMATIONS.find((formation) => formation.name === name) ?? FORMATIONS[0]!;
}

/** Related positions used to judge whether a player fits a slot. */
const RELATED: Record<string, readonly string[]> = {
  GK: ["GK"],
  RB: ["RB", "RWB", "RM"],
  RWB: ["RWB", "RB", "RM"],
  CB: ["CB", "CDM"],
  LB: ["LB", "LWB", "LM"],
  LWB: ["LWB", "LB", "LM"],
  CDM: ["CDM", "CM", "CB"],
  CM: ["CM", "CDM", "CAM"],
  CAM: ["CAM", "CM", "CF"],
  RM: ["RM", "RW", "RB"],
  LM: ["LM", "LW", "LB"],
  RW: ["RW", "RM", "CF"],
  LW: ["LW", "LM", "CF"],
  CF: ["CF", "ST", "CAM"],
  ST: ["ST", "CF"],
};

export type Fit = "natural" | "ok" | "out";

export function positionFit(slot: string, playerPosition: string | null | undefined): Fit {
  if (!playerPosition) return "out";
  if (slot === playerPosition) return "natural";
  return (RELATED[slot] ?? []).includes(playerPosition) ? "ok" : "out";
}

export const TACTIC_SETTINGS = [
  {
    key: "buildUp",
    label: "Opbygning",
    options: ["Balanceret", "Kort pasningsspil", "Langt spil", "Kontraangreb"],
  },
  {
    key: "chanceCreation",
    label: "Chanceskabelse",
    options: ["Balanceret", "Direkte", "Kombinationsspil", "Kant-fokus"],
  },
  {
    key: "defensiveApproach",
    label: "Forsvarsstil",
    options: ["Balanceret", "Højt pres", "Aggressivt pres", "Dyb blok"],
  },
  { key: "width", label: "Bredde", options: ["Smal", "Balanceret", "Bred"] },
  { key: "depth", label: "Forsvarslinje", options: ["Dyb", "Balanceret", "Høj"] },
  { key: "tempo", label: "Tempo", options: ["Roligt", "Balanceret", "Højt"] },
] as const;

export type TacticSettings = Record<string, string>;

export function defaultSettings(): TacticSettings {
  return Object.fromEntries(TACTIC_SETTINGS.map((item) => [item.key, item.options[1] ?? item.options[0]!]));
}
