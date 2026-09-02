import type { SlotRole } from "./roles";

export type TacticPayload = {
  formation: string;
  lineup: Record<string, string | null>;
  roles: Record<string, SlotRole>;
  settings: Record<string, string | number>;
};

function toBase64(value: string): string {
  if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(value)));
  return value;
}

function fromBase64(value: string): string {
  if (typeof atob === "function") return decodeURIComponent(escape(atob(value)));
  return value;
}

/** Encode the current tactic as a shareable code. */
export function encodeTactic(payload: TacticPayload): string {
  const compact = {
    f: payload.formation,
    l: payload.lineup,
    r: payload.roles,
    s: payload.settings,
  };
  return `fc26-${toBase64(JSON.stringify(compact)).replace(/=+$/, "")}`;
}

/** Decode a tactic code. Returns null when the code is not valid. */
export function decodeTactic(code: string): TacticPayload | null {
  const raw = code.trim().replace(/^#/, "");
  if (!raw.toLowerCase().startsWith("fc26-")) return null;
  const body = raw.slice(5);
  try {
    const padded = body + "=".repeat((4 - (body.length % 4)) % 4);
    const parsed = JSON.parse(fromBase64(padded)) as {
      f?: unknown;
      l?: unknown;
      r?: unknown;
      s?: unknown;
    };
    if (typeof parsed.f !== "string") return null;
    return {
      formation: parsed.f,
      lineup: (parsed.l as Record<string, string | null>) ?? {},
      roles: (parsed.r as Record<string, SlotRole>) ?? {},
      settings: (parsed.s as Record<string, string | number>) ?? {},
    };
  } catch {
    return null;
  }
}
