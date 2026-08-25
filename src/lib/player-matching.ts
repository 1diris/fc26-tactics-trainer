import { playerKey } from "@/lib/football";

type MatchablePlayer = {
  name: string;
  shirt_number?: number | null;
};

function comparableName(name: string): string {
  return playerKey(name)
    .split(" ")
    .filter((part) => part.length > 1)
    .join(" ");
}

function namesMatch(left: string, right: string): boolean {
  const leftKey = playerKey(left);
  const rightKey = playerKey(right);
  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey || leftKey.replaceAll(" ", "") === rightKey.replaceAll(" ", "")) {
    return true;
  }

  // FC kan vise samme navn både med fornavn og med initial, fx
  // "T. Alexander-Arnold" og "Trent Alexander-Arnold".
  const leftComparable = comparableName(left);
  const rightComparable = comparableName(right);
  if (!leftComparable || !rightComparable) return false;
  return (
    leftComparable === rightComparable ||
    leftComparable.endsWith(` ${rightComparable}`) ||
    rightComparable.endsWith(` ${leftComparable}`)
  );
}

export function findMatchingPlayerIndex<T extends MatchablePlayer>(
  players: T[],
  candidate: MatchablePlayer,
): number {
  return players.findIndex((player) => {
    if (namesMatch(player.name, candidate.name)) return true;
    return Boolean(
      player.shirt_number &&
        candidate.shirt_number &&
        player.shirt_number === candidate.shirt_number &&
        comparableName(player.name).split(" ").at(-1) === comparableName(candidate.name).split(" ").at(-1),
    );
  });
}