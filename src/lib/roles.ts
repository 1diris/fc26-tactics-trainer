export type RoleFocus = "Defend" | "Balanced" | "Attack";

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
): Role => (wants ? { id, label, focuses, description, wants } : { id, label, focuses, description });

export const ROLES_BY_POSITION: Record<string, Role[]> = {
  GK: [
    role("gk", "Goalkeeper", ["Balanced", "Defend"], "Stays on the line and focuses on saves."),
    role(
      "sweeper-keeper",
      "Sweeper Keeper",
      ["Balanced", "Attack"],
      "Comes off the line, sweeps up behind the defence and starts build-up play.",
    ),
  ],
  RB: [
    role("fullback", "Fullback", ["Defend", "Balanced"], "Holds position and covers the flank."),
    role(
      "attacking-fullback",
      "Attacking Fullback",
      ["Balanced", "Attack"],
      "Overlaps down the wing and delivers crosses.",
      ["RWB", "RM", "RW"],
    ),
    role(
      "falseback",
      "Falseback",
      ["Defend", "Balanced"],
      "Tucks inside during build-up as an extra midfielder.",
      ["CB", "CDM", "CM"],
    ),
    role(
      "wingback",
      "Wing Back",
      ["Balanced", "Attack"],
      "Plays almost like a winger with high work rate.",
      ["RWB", "RM", "RW"],
    ),
  ],
  LB: [
    role("fullback", "Fullback", ["Defend", "Balanced"], "Holds position and covers the flank."),
    role(
      "attacking-fullback",
      "Attacking Fullback",
      ["Balanced", "Attack"],
      "Overlaps down the wing and delivers crosses.",
      ["LWB", "LM", "LW"],
    ),
    role(
      "falseback",
      "Falseback",
      ["Defend", "Balanced"],
      "Tucks inside during build-up as an extra midfielder.",
      ["CB", "CDM", "CM"],
    ),
    role(
      "wingback",
      "Wing Back",
      ["Balanced", "Attack"],
      "Plays almost like a winger with high work rate.",
      ["LWB", "LM", "LW"],
    ),
  ],
  RWB: [
    role("wingback", "Wing Back", ["Defend", "Balanced"], "Covers the entire flank up and down."),
    role(
      "attacking-wingback",
      "Attacking Wing Back",
      ["Balanced", "Attack"],
      "Presses high up the pitch and acts as an extra winger.",
      ["RM", "RW"],
    ),
  ],
  LWB: [
    role("wingback", "Wing Back", ["Defend", "Balanced"], "Covers the entire flank up and down."),
    role(
      "attacking-wingback",
      "Attacking Wing Back",
      ["Balanced", "Attack"],
      "Presses high up the pitch and acts as an extra winger.",
      ["LM", "LW"],
    ),
  ],
  CB: [
    role("defender", "Defender", ["Defend", "Balanced"], "Stays in the backline and covers the box."),
    role(
      "stopper",
      "Stopper",
      ["Defend", "Balanced"],
      "Steps out aggressively and cuts out passes.",
    ),
    role(
      "ball-playing",
      "Ball-Playing Defender",
      ["Balanced", "Attack"],
      "Carries the ball forward and plays through the build-up.",
      ["CDM", "CM"],
    ),
  ],
  CDM: [
    role("holding", "Holding", ["Defend", "Balanced"], "Sits in front of the backline and covers the gaps."),
    role(
      "centre-half",
      "Centre-Half",
      ["Defend", "Balanced"],
      "Drops into the backline and acts as an extra defender.",
      ["CB"],
    ),
    role(
      "deep-lying-playmaker",
      "Deep-Lying Playmaker",
      ["Balanced", "Attack"],
      "Directs play from deep with long and short passes.",
      ["CM"],
    ),
  ],
  CM: [
    role(
      "box-to-box",
      "Box-to-Box",
      ["Defend", "Balanced", "Attack"],
      "Covers the entire pitch both with and without the ball.",
    ),
    role("holding", "Holding", ["Defend", "Balanced"], "Sits behind the ball and shields the backline."),
    role(
      "deep-lying-playmaker",
      "Deep-Lying Playmaker",
      ["Balanced", "Attack"],
      "Drops deep and starts attacks.",
      ["CDM"],
    ),
    role(
      "playmaker",
      "Playmaker",
      ["Balanced", "Attack"],
      "Looks for the ball high up the pitch and creates chances.",
      ["CAM"],
    ),
    role(
      "half-winger",
      "Half-Winger",
      ["Balanced", "Attack"],
      "Drifts wide and creates width.",
      ["RM", "LM", "RW", "LW"],
    ),
  ],
  CAM: [
    role(
      "playmaker",
      "Playmaker",
      ["Balanced", "Attack"],
      "Controls the final third and finds the last passes.",
    ),
    role(
      "shadow-striker",
      "Shadow Striker",
      ["Balanced", "Attack"],
      "Makes runs into the box and finishes like an extra striker.",
      ["ST", "CF"],
    ),
    role(
      "half-winger",
      "Half-Winger",
      ["Balanced", "Attack"],
      "Drifts wide and attacks the half-spaces.",
      ["RM", "LM", "RW", "LW"],
    ),
    role(
      "classic-10",
      "Classic 10",
      ["Balanced"],
      "Stays between the lines and waits for the ball.",
    ),
  ],
  RM: [
    role("winger", "Winger", ["Balanced", "Attack"], "Holds width and attacks the byline."),
    role(
      "wide-midfielder",
      "Wide Midfielder",
      ["Defend", "Balanced"],
      "Tracks back to help the fullback.",
    ),
    role(
      "inside-forward",
      "Inside Forward",
      ["Balanced", "Attack"],
      "Cuts inside and looks for shots on goal.",
      ["RW", "CF", "ST", "CAM"],
    ),
  ],
  LM: [
    role("winger", "Winger", ["Balanced", "Attack"], "Holds width and attacks the byline."),
    role(
      "wide-midfielder",
      "Wide Midfielder",
      ["Defend", "Balanced"],
      "Tracks back to help the fullback.",
    ),
    role(
      "inside-forward",
      "Inside Forward",
      ["Balanced", "Attack"],
      "Cuts inside and looks for shots on goal.",
      ["LW", "CF", "ST", "CAM"],
    ),
  ],
  RW: [
    role("winger", "Winger", ["Balanced", "Attack"], "Stays wide and goes around the fullback."),
    role(
      "inside-forward",
      "Inside Forward",
      ["Balanced", "Attack"],
      "Cuts inside towards goal and finishes.",
      ["CF", "ST", "CAM"],
    ),
    role(
      "inverted-winger",
      "Inverted Winger",
      ["Balanced", "Attack"],
      "Drifts into the half-space and combines centrally.",
      ["CAM", "CM"],
    ),
    role(
      "wide-playmaker",
      "Wide Playmaker",
      ["Balanced"],
      "Drops deep and directs play from the flank.",
      ["CAM", "CM"],
    ),
  ],
  LW: [
    role("winger", "Winger", ["Balanced", "Attack"], "Stays wide and goes around the fullback."),
    role(
      "inside-forward",
      "Inside Forward",
      ["Balanced", "Attack"],
      "Cuts inside towards goal and finishes.",
      ["CF", "ST", "CAM"],
    ),
    role(
      "inverted-winger",
      "Inverted Winger",
      ["Balanced", "Attack"],
      "Drifts into the half-space and combines centrally.",
      ["CAM", "CM"],
    ),
    role(
      "wide-playmaker",
      "Wide Playmaker",
      ["Balanced"],
      "Drops deep and directs play from the flank.",
      ["CAM", "CM"],
    ),
  ],
  CF: [
    role(
      "false-9",
      "False 9",
      ["Balanced"],
      "Drops between the lines and draws defenders with them.",
      ["CAM", "CM"],
    ),
    role(
      "shadow-striker",
      "Shadow Striker",
      ["Balanced", "Attack"],
      "Attacks the space behind the lead striker.",
      ["ST"],
    ),
    role("classic-9", "Classic 9", ["Balanced", "Attack"], "Stays high and finishes chances."),
  ],
  ST: [
    role(
      "advanced-forward",
      "Advanced Forward",
      ["Balanced", "Attack"],
      "Presses the backline and runs in behind.",
    ),
    role("poacher", "Poacher", ["Attack"], "Lives in the box and hunts for chances.", ["CF"]),
    role(
      "target-forward",
      "Target Forward",
      ["Defend", "Balanced"],
      "Holds the ball up high and wins duels.",
    ),
    role(
      "complete-forward",
      "Complete Forward",
      ["Balanced", "Attack"],
      "Combines finishing with build-up play and pressing.",
      ["CF", "CAM"],
    ),
  ],
};

export type RoleMastery = "base" | "+" | "++";

export type SlotRole = { role: string; focus: RoleFocus; mastery?: RoleMastery };

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
  if (!first) return { role: "balanced", focus: "Balanced" };
  return { role: first.id, focus: first.focuses.includes("Balanced") ? "Balanced" : first.focuses[0]! };
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
    const mastery: RoleMastery =
      current?.mastery === "+" || current?.mastery === "++" ? current.mastery : "base";
    const found = findRole(slot.position, current?.role);
    if (found) {
      const focus =
        current?.focus && found.focuses.includes(current.focus) ? current.focus : found.focuses[0]!;
      next[slot.id] = { role: found.id, focus, mastery };
    } else {
      next[slot.id] = { ...defaultRole(slot.position), mastery };
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
  return `${found.label} typically needs a player who can also play ${found.wants.join("/")}.`;
}
