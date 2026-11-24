import { findMatchingPlayerIndex, type MatchablePlayer } from "./player-matching";

/** Squad players that no imported row matches — candidates for removal. */
export function missingFromImport<T extends MatchablePlayer>(
  squad: T[],
  imported: MatchablePlayer[],
): T[] {
  return squad.filter((player) => findMatchingPlayerIndex(imported, player) < 0);
}
