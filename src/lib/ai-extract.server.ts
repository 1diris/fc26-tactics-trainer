const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

export type ExtractedPlayer = {
  name: string;
  position: string | null;
  overall: number | null;
  potential: number | null;
  potential_min: number | null;
  potential_max: number | null;
  plan: string | null;
  is_youth: boolean;
  age: number | null;
  market_value: number | null;
  wage: number | null;
  contract_until: string | null;
  preferred_foot: string | null;
  nationality: string | null;
  shirt_number: number | null;
  form: number | null;
  stats: Record<string, string | number | boolean | null>;
  uncertain_fields: string[];
};

const SYSTEM_PROMPT = `You are a data extractor for a football management tool.
You receive a screenshot from a game career (squad list, player card or stats overview).
The image may be Danish, English, or another language, and it may show either the first-team
squad OR the youth academy/youth team. Read ALL visible players from the image, regardless of
the screenshot's language. Do not guess fields you cannot see — use null.

Respond ONLY with JSON in English in this shape:
{"players":[{
 "name": string,
 "position": string|null,           // e.g. "ST", "CB", "GK"
 "overall": number|null,            // OVR / overall rating
 "potential": number|null,          // POT if visible (single number)
 "potential_range": string|null,    // if POT is shown as a range, e.g. "80 - 94"
 "plan": string|null,               // growth plan if visible, e.g. "Balanced"
 "age": number|null,
 "market_value": number|null,       // in euros, e.g. 25.5m => 25500000
 "wage": number|null,               // euros per week
 "contract_until": string|null,     // e.g. "2029" or "30-06-2029"
 "preferred_foot": string|null,     // "Right" or "Left"
 "nationality": string|null,
 "shirt_number": number|null,
 "form": number|null,               // 1-10 if visible
 "stats": object,                   // visible stats, e.g. {"appearances":12,"goals":7,"assists":3,"average":7.4}
 "uncertain_fields": string[],      // fields you are unsure about
 "is_youth": boolean                // true if the player is on an academy/youth screen
}]}
Set "is_youth": true for players from an academy/youth team screen (typically age 13-18 and POT shown as a range).
No explanation, no markdown code block.`;

export async function extractPlayersFromImage(
  dataUrl: string,
): Promise<{ players: ExtractedPlayer[]; raw: unknown }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this project.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read all players and their data from this screenshot.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
      message = parsed.error?.message ?? parsed.message ?? body;
    } catch {
      /* keep raw body */
    }
    if (response.status === 429) {
      throw new Error("Too many requests to the AI right now. Try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error(`AI credits are exhausted: ${message}`);
    }
    if (response.status === 403) {
      throw new Error(`AI is blocked for this workspace: ${message}`);
    }
    throw new Error(`AI error (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: { players?: unknown };
  try {
    parsed = JSON.parse(cleaned) as { players?: unknown };
  } catch {
    throw new Error("AI could not read the image as player data. Try a clearer screenshot.");
  }

  const rawPlayers = Array.isArray(parsed.players) ? parsed.players : [];
  const players: ExtractedPlayer[] = rawPlayers
    .map((entry) => normalizeExtracted(entry as Record<string, unknown>))
    .filter((player): player is ExtractedPlayer => player !== null);

  return { players, raw: parsed };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^0-9.,kmM]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const multiplier = /m$/i.test(cleaned) ? 1_000_000 : /k$/i.test(cleaned) ? 1000 : 1;
  const numeric = Number.parseFloat(cleaned.replace(/[kmM]$/i, ""));
  return Number.isFinite(numeric) ? numeric * multiplier : null;
}

function toInt(value: unknown, min: number, max: number): number | null {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  const rounded = Math.round(numeric);
  return rounded >= min && rounded <= max ? rounded : null;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStats(value: unknown): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw === null) result[key] = null;
    else if (typeof raw === "number" || typeof raw === "string" || typeof raw === "boolean") {
      result[key] = raw;
    }
  }
  return result;
}

/** POT is shown in the academy as a range, e.g. "80 - 94". */
function parsePotentialRange(entry: Record<string, unknown>): {
  potential_min: number | null;
  potential_max: number | null;
} {
  const explicitMin = toInt(entry["potential_min"], 30, 99);
  const explicitMax = toInt(entry["potential_max"], 30, 99);
  if (explicitMin !== null || explicitMax !== null) {
    return { potential_min: explicitMin ?? explicitMax, potential_max: explicitMax ?? explicitMin };
  }
  const raw = toText(entry["potential_range"]) ?? toText(entry["potential"]);
  if (raw) {
    const parts = raw.match(/\d{2}/g);
    if (parts && parts.length >= 2) {
      const min = Number(parts[0]);
      const max = Number(parts[1]);
      if (min >= 30 && max <= 99 && min <= max) return { potential_min: min, potential_max: max };
    }
  }
  const single = toInt(entry["potential"], 30, 99);
  return { potential_min: single, potential_max: single };
}

function normalizeExtracted(entry: Record<string, unknown>): ExtractedPlayer | null {
  const name = toText(entry["name"]);
  if (!name) return null;
  const uncertain = Array.isArray(entry["uncertain_fields"])
    ? (entry["uncertain_fields"] as unknown[]).filter((f): f is string => typeof f === "string")
    : [];
  return {
    name,
    position: toText(entry["position"]),
    overall: toInt(entry["overall"], 30, 99),
    potential: toInt(entry["potential"], 30, 99),
    ...parsePotentialRange(entry),
    plan: toText(entry["plan"]),
    is_youth: entry["is_youth"] === true,
    age: toInt(entry["age"], 14, 50),
    market_value: toNumber(entry["market_value"]),
    wage: toNumber(entry["wage"]),
    contract_until: toText(entry["contract_until"]),
    preferred_foot: toText(entry["preferred_foot"]),
    nationality: toText(entry["nationality"]),
    shirt_number: toInt(entry["shirt_number"], 1, 99),
    form: toInt(entry["form"], 1, 10),
    stats: normalizeStats(entry["stats"]),
    uncertain_fields: uncertain,
  };
}
