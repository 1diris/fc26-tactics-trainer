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
  {
    name: "4-2-1-3",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "ldm", position: "CDM", x: 36, y: 42 },
      { id: "rdm", position: "CDM", x: 64, y: 42 },
      { id: "cam", position: "CAM", x: 50, y: 62 },
      { id: "lw", position: "LW", x: 14, y: 82 },
      { id: "st", position: "ST", x: 50, y: 88 },
      { id: "rw", position: "RW", x: 86, y: 82 },
    ],
  },
  {
    name: "4-3-2-1",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "cdm", position: "CDM", x: 50, y: 42 },
      { id: "lcm", position: "CM", x: 28, y: 54 },
      { id: "rcm", position: "CM", x: 72, y: 54 },
      { id: "lcf", position: "CF", x: 32, y: 74 },
      { id: "rcf", position: "CF", x: 68, y: 74 },
      { id: "st", position: "ST", x: 50, y: 90 },
    ],
  },
  {
    name: "4-1-2-1-2",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "cdm", position: "CDM", x: 50, y: 38 },
      { id: "lcm", position: "CM", x: 24, y: 54 },
      { id: "rcm", position: "CM", x: 76, y: 54 },
      { id: "cam", position: "CAM", x: 50, y: 68 },
      { id: "lst", position: "ST", x: 36, y: 88 },
      { id: "rst", position: "ST", x: 64, y: 88 },
    ],
  },
  {
    name: "4-4-1-1",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "lm", position: "LM", x: 12, y: 52 },
      { id: "lcm", position: "CM", x: 38, y: 48 },
      { id: "rcm", position: "CM", x: 62, y: 48 },
      { id: "rm", position: "RM", x: 88, y: 52 },
      { id: "cf", position: "CF", x: 50, y: 72 },
      { id: "st", position: "ST", x: 50, y: 90 },
    ],
  },
  {
    name: "4-5-1",
    slots: [
      gk,
      { id: "lb", position: "LB", x: 12, y: 26 },
      { id: "lcb", position: "CB", x: 36, y: 20 },
      { id: "rcb", position: "CB", x: 64, y: 20 },
      { id: "rb", position: "RB", x: 88, y: 26 },
      { id: "lm", position: "LM", x: 10, y: 58 },
      { id: "lcm", position: "CM", x: 30, y: 52 },
      { id: "ccm", position: "CM", x: 50, y: 50 },
      { id: "rcm", position: "CM", x: 70, y: 52 },
      { id: "rm", position: "RM", x: 90, y: 58 },
      { id: "st", position: "ST", x: 50, y: 88 },
    ],
  },
  {
    name: "3-4-2-1",
    slots: [
      gk,
      { id: "lcb", position: "CB", x: 26, y: 20 },
      { id: "ccb", position: "CB", x: 50, y: 18 },
      { id: "rcb", position: "CB", x: 74, y: 20 },
      { id: "lm", position: "LM", x: 10, y: 50 },
      { id: "lcm", position: "CM", x: 36, y: 46 },
      { id: "rcm", position: "CM", x: 64, y: 46 },
      { id: "rm", position: "RM", x: 90, y: 50 },
      { id: "lcam", position: "CAM", x: 34, y: 72 },
      { id: "rcam", position: "CAM", x: 66, y: 72 },
      { id: "st", position: "ST", x: 50, y: 90 },
    ],
  },
  {
    name: "5-3-2",
    slots: [
      gk,
      { id: "lwb", position: "LWB", x: 8, y: 32 },
      { id: "lcb", position: "CB", x: 30, y: 20 },
      { id: "ccb", position: "CB", x: 50, y: 18 },
      { id: "rcb", position: "CB", x: 70, y: 20 },
      { id: "rwb", position: "RWB", x: 92, y: 32 },
      { id: "lcm", position: "CM", x: 28, y: 54 },
      { id: "ccm", position: "CM", x: 50, y: 50 },
      { id: "rcm", position: "CM", x: 72, y: 54 },
      { id: "lst", position: "ST", x: 36, y: 86 },
      { id: "rst", position: "ST", x: 64, y: 86 },
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

export type SelectSetting = {
  kind: "select";
  key: string;
  label: string;
  options: readonly string[];
  /** Index of the default option. */
  defaultIndex: number;
};

export type SliderSetting = {
  kind: "slider";
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  /** Labels shown at each end of the slider. */
  minLabel: string;
  maxLabel: string;
};

export type TacticSetting = SelectSetting | SliderSetting;

export const ATTACK_SETTINGS: readonly TacticSetting[] = [
  {
    kind: "select",
    key: "buildUp",
    label: "Opbygning",
    options: ["Balanceret", "Kort pasningsspil", "Langt spil", "Kontraangreb"],
    defaultIndex: 0,
  },
  {
    kind: "select",
    key: "chanceCreation",
    label: "Chanceskabelse",
    options: ["Balanceret", "Direkte", "Kombinationsspil", "Kant-fokus"],
    defaultIndex: 0,
  },
  {
    kind: "slider",
    key: "width",
    label: "Bredde",
    min: 1,
    max: 10,
    step: 1,
    defaultValue: 5,
    minLabel: "Smal",
    maxLabel: "Bred",
  },
  {
    kind: "slider",
    key: "playersInBox",
    label: "Spillere i feltet",
    min: 1,
    max: 6,
    step: 1,
    defaultValue: 3,
    minLabel: "Få",
    maxLabel: "Mange",
  },
  {
    kind: "slider",
    key: "corners",
    label: "Hjørnespark",
    min: 1,
    max: 5,
    step: 1,
    defaultValue: 2,
    minLabel: "Få",
    maxLabel: "Mange",
  },
  {
    kind: "slider",
    key: "freeKicks",
    label: "Frispark",
    min: 1,
    max: 5,
    step: 1,
    defaultValue: 2,
    minLabel: "Få",
    maxLabel: "Mange",
  },
];

export const DEFENCE_SETTINGS: readonly TacticSetting[] = [
  {
    kind: "select",
    key: "defensiveApproach",
    label: "Forsvarsstil",
    options: ["Balanceret", "Dybt", "Aggressivt pres", "Højt pres"],
    defaultIndex: 0,
  },
  {
    kind: "slider",
    key: "defensiveWidth",
    label: "Bredde",
    min: 1,
    max: 10,
    step: 1,
    defaultValue: 5,
    minLabel: "Smal",
    maxLabel: "Bred",
  },
  {
    kind: "slider",
    key: "depth",
    label: "Forsvarslinjens højde",
    min: 1,
    max: 10,
    step: 1,
    defaultValue: 5,
    minLabel: "Dyb",
    maxLabel: "Høj",
  },
  {
    kind: "slider",
    key: "aggression",
    label: "Aggression i pres",
    min: 1,
    max: 10,
    step: 1,
    defaultValue: 5,
    minLabel: "Passiv",
    maxLabel: "Aggressiv",
  },
];

export const TACTIC_SETTING_GROUPS = [
  { key: "attack", label: "Angreb", settings: ATTACK_SETTINGS },
  { key: "defence", label: "Forsvar", settings: DEFENCE_SETTINGS },
] as const;

export type TacticSettings = Record<string, string | number>;

export function defaultSettings(): TacticSettings {
  const entries: [string, string | number][] = [];
  for (const group of TACTIC_SETTING_GROUPS) {
    for (const setting of group.settings) {
      entries.push([
        setting.key,
        setting.kind === "select"
          ? (setting.options[setting.defaultIndex] ?? setting.options[0]!)
          : setting.defaultValue,
      ]);
    }
  }
  return Object.fromEntries(entries);
}
