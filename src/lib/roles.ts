export type RoleFocus = "Forsvar" | "Balanceret" | "Angreb";

export type Role = {
  id: string;
  label: string;
  focuses: RoleFocus[];
  description: string;
  /** Positions the player ideally also covers for this role to work well. */
  wants?: readonly string[];
};

const role = (
  id: string,
  label: string,
  focuses: RoleFocus[],
  description: string,
  wants?: readonly string[],
): Role => ({ id, label, focuses, description, wants });

export const ROLES_BY_POSITION: Record<string, Role[]> = {
  GK: [
    role("gk", "Målmand", ["Balanceret", "Forsvar"], "Bliver på stregen og fokuserer på redninger."),
    role(
      "sweeper-keeper",
      "Sweeper Keeper",
      ["Balanceret", "Angreb"],
      "Går højt op, rydder op bag kæden og starter opspil.",
    ),
  ],
  RB: [
    role("fullback", "Back", ["Forsvar", "Balanceret"], "Holder positionen og dækker kanten."),
    role(
      "attacking-fullback",
      "Angribende back",
      ["Balanceret", "Angreb"],
      "Overlapper kanten og leverer indlæg.",
      ["RWB", "RM", "RW"],
    ),
    role(
      "falseback",
      "Falsk back",
      ["Forsvar", "Balanceret"],
      "Rykker ind i midten i opspillet som ekstra midtbane.",
      ["CB", "CDM", "CM"],
    ),
    role(
      "wingback",
      "Wing Back",
      ["Balanceret", "Angreb"],
      "Spiller nærmest som en kant med høj løbekapacitet.",
      ["RWB", "RM", "RW"],
    ),
  ],
  LB: [
    role("fullback", "Back", ["Forsvar", "Balanceret"], "Holder positionen og dækker kanten."),
    role(
      "attacking-fullback",
      "Angribende back",
      ["Balanceret", "Angreb"],
      "Overlapper kanten og leverer indlæg.",
      ["LWB", "LM", "LW"],
    ),
    role(
      "falseback",
      "Falsk back",
      ["Forsvar", "Balanceret"],
      "Rykker ind i midten i opspillet som ekstra midtbane.",
      ["CB", "CDM", "CM"],
    ),
    role(
      "wingback",
      "Wing Back",
      ["Balanceret", "Angreb"],
      "Spiller nærmest som en kant med høj løbekapacitet.",
      ["LWB", "LM", "LW"],
    ),
  ],
  RWB: [
    role("wingback", "Wing Back", ["Forsvar", "Balanceret"], "Dækker hele kanten op og ned."),
    role(
      "attacking-wingback",
      "Angribende Wing Back",
      ["Balanceret", "Angreb"],
      "Presser højt op og agerer ekstra kantspiller.",
      ["RM", "RW"],
    ),
  ],
  LWB: [
    role("wingback", "Wing Back", ["Forsvar", "Balanceret"], "Dækker hele kanten op og ned."),
    role(
      "attacking-wingback",
      "Angribende Wing Back",
      ["Balanceret", "Angreb"],
      "Presser højt op og agerer ekstra kantspiller.",
      ["LM", "LW"],
    ),
  ],
  CB: [
    role("defender", "Forsvarer", ["Forsvar", "Balanceret"], "Bliver i kæden og dækker feltet."),
    role(
      "stopper",
      "Stopper",
      ["Forsvar", "Balanceret"],
      "Rykker aggressivt ud og bryder afleveringer.",
    ),
    role(
      "ball-playing",
      "Ball-Playing",
      ["Balanceret", "Angreb"],
      "Bærer bolden frem og spiller opspillet igennem.",
      ["CDM", "CM"],
    ),
  ],
  CDM: [
    role("holding", "Holding", ["Forsvar", "Balanceret"], "Sidder foran kæden og dækker hullerne."),
    role(
      "centre-half",
      "Centre-Half",
      ["Forsvar", "Balanceret"],
      "Falder ned i kæden og fungerer som ekstra forsvarer.",
      ["CB"],
    ),
    role(
      "deep-lying-playmaker",
      "Deep-Lying Playmaker",
      ["Balanceret", "Angreb"],
      "Dirigerer spillet dybt fra med lange og korte pasninger.",
      ["CM"],
    ),
  ],
  CM: [
    role(
      "box-to-box",
      "Box-to-Box",
      ["Forsvar", "Balanceret", "Angreb"],
      "Dækker hele banen både med og uden bold.",
    ),
    role("holding", "Holding", ["Forsvar", "Balanceret"], "Bliver bag bolden og afskærmer kæden."),
    role(
      "deep-lying-playmaker",
      "Deep-Lying Playmaker",
      ["Balanceret", "Angreb"],
      "Falder dybt og starter angrebene.",
      ["CDM"],
    ),
    role(
      "playmaker",
      "Playmaker",
      ["Balanceret", "Angreb"],
      "Søger bolden højt og skaber chancerne.",
      ["CAM"],
    ),
    role(
      "half-winger",
      "Half Winger",
      ["Balanceret", "Angreb"],
      "Trækker ud på kanten og skaber bredde.",
      ["RM", "LM", "RW", "LW"],
    ),
  ],
  CAM: [
    role(
      "playmaker",
      "Playmaker",
      ["Balanceret", "Angreb"],
      "Styrer sidste tredjedel og finder de sidste afleveringer.",
    ),
    role(
      "shadow-striker",
      "Shadow Striker",
      ["Balanceret", "Angreb"],
      "Løber med i feltet og afslutter som en ekstra angriber.",
      ["ST", "CF"],
    ),
    role(
      "half-winger",
      "Half Winger",
      ["Balanceret", "Angreb"],
      "Går ud på kanten og angriber i halvrummene.",
      ["RM", "LM", "RW", "LW"],
    ),
    role(
      "classic-10",
      "Klassisk 10'er",
      ["Balanceret"],
      "Bliver mellem linjerne og venter på bolden.",
    ),
  ],
  RM: [
    role("winger", "Winger", ["Balanceret", "Angreb"], "Holder bredden og angriber baglinjen."),
    role(
      "wide-midfielder",
      "Wide Midfielder",
      ["Forsvar", "Balanceret"],
      "Arbejder med tilbage og hjælper backen.",
    ),
    role(
      "inside-forward",
      "Inside Forward",
      ["Balanceret", "Angreb"],
      "Går ind i banen og søger afslutninger.",
      ["RW", "CF", "ST", "CAM"],
    ),
  ],
  LM: [
    role("winger", "Winger", ["Balanceret", "Angreb"], "Holder bredden og angriber baglinjen."),
    role(
      "wide-midfielder",
      "Wide Midfielder",
      ["Forsvar", "Balanceret"],
      "Arbejder med tilbage og hjælper backen.",
    ),
    role(
      "inside-forward",
      "Inside Forward",
      ["Balanceret", "Angreb"],
      "Går ind i banen og søger afslutninger.",
      ["LW", "CF", "ST", "CAM"],
    ),
  ],
  RW: [
    role("winger", "Winger", ["Balanceret", "Angreb"], "Bliver bred og går udenom backen."),
    role(
      "inside-forward",
      "Inside Forward",
      ["Balanceret", "Angreb"],
      "Skærer indad mod målet og afslutter.",
      ["CF", "ST", "CAM"],
    ),
    role(
      "inverted-winger",
      "Inverted Winger",
      ["Balanceret", "Angreb"],
      "Går ind i halvrummet og kombinerer i midten.",
      ["CAM", "CM"],
    ),
    role(
      "wide-playmaker",
      "Wide Playmaker",
      ["Balanceret"],
      "Falder ned og dirigerer spillet fra kanten.",
      ["CAM", "CM"],
    ),
  ],
  LW: [
    role("winger", "Winger", ["Balanceret", "Angreb"], "Bliver bred og går udenom backen."),
    role(
      "inside-forward",
      "Inside Forward",
      ["Balanceret", "Angreb"],
      "Skærer indad mod målet og afslutter.",
      ["CF", "ST", "CAM"],
    ),
    role(
      "inverted-winger",
      "Inverted Winger",
      ["Balanceret", "Angreb"],
      "Går ind i halvrummet og kombinerer i midten.",
      ["CAM", "CM"],
    ),
    role(
      "wide-playmaker",
      "Wide Playmaker",
      ["Balanceret"],
      "Falder ned og dirigerer spillet fra kanten.",
      ["CAM", "CM"],
    ),
  ],
  CF: [
    role(
      "false-9",
      "Falsk 9'er",
      ["Balanceret"],
      "Falder ned mellem linjerne og trækker forsvarere med.",
      ["CAM", "CM"],
    ),
    role(
      "shadow-striker",
      "Shadow Striker",
      ["Balanceret", "Angreb"],
      "Angriber rummet bag den forreste angriber.",
      ["ST"],
    ),
    role("classic-9", "Klassisk 9'er", ["Balanceret", "Angreb"], "Bliver højt og afslutter."),
  ],
  ST: [
    role(
      "advanced-forward",
      "Advanced Forward",
      ["Balanceret", "Angreb"],
      "Presser kæden og løber i dybden.",
    ),
    role("poacher", "Poacher", ["Angreb"], "Lever i feltet og jager afslutninger.", ["CF"]),
    role(
      "target-forward",
      "Target Forward",
      ["Forsvar", "Balanceret"],
      "Holder bolden højt og vinder dueller.",
    ),
    role(
      "complete-forward",
      "Komplet angriber",
      ["Balanceret", "Angreb"],
      "Kombinerer afslutninger med opspil og pres.",
      ["CF", "CAM"],
    ),
  ],
};

export type SlotRole = { role: string; focus: RoleFocus };

export function rolesFor(position: string): Role[] {
  return ROLES_BY_POSITION[position] ?? [];
}

export function findRole(position: string, roleId: string | undefined | null): Role | null {
  if (!roleId) return null;
  return rolesFor(position).find((item) => item.id === roleId) ?? null;
}

export function defaultRole(position: string): SlotRole {
  const list = rolesFor(position);
  const first = list[0];
  if (!first) return { role: "balanced", focus: "Balanceret" };
  return { role: first.id, focus: first.focuses.includes("Balanceret") ? "Balanceret" : first.focuses[0]! };
}

export function roleLabel(position: string, value: SlotRole | undefined | null): string {
  const found = findRole(position, value?.role);
  if (!found) return "—";
  return found.label;
}

/** Drop roles for slots that no longer exist and fill in defaults. */
export function normalizeRoles(
  slots: { id: string; position: string }[],
  raw: Record<string, SlotRole> | undefined | null,
): Record<string, SlotRole> {
  const next: Record<string, SlotRole> = {};
  for (const slot of slots) {
    const current = raw?.[slot.id];
    const found = findRole(slot.position, current?.role);
    if (found) {
      const focus =
        current?.focus && found.focuses.includes(current.focus) ? current.focus : found.focuses[0]!;
      next[slot.id] = { role: found.id, focus };
    } else {
      next[slot.id] = defaultRole(slot.position);
    }
  }
  return next;
}

/**
 * Soft hint when a role asks for coverage the player doesn't naturally have.
 * `covered` lists the positions the player can actually play.
 */
export function roleHint(
  position: string,
  value: SlotRole | undefined | null,
  covered: readonly string[],
): string | null {
  const found = findRole(position, value?.role);
  if (!found?.wants || found.wants.length === 0) return null;
  const ok = found.wants.some((want) => covered.includes(want));
  if (ok) return null;
  return `${found.label} kræver typisk en spiller der også kan ${found.wants.join("/")}.`;
}
