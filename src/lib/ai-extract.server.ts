const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.7-flash";

export type ExtractedPlayer = {
  name: string;
  position: string | null;
  overall: number | null;
  potential: number | null;
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

const SYSTEM_PROMPT = `Du er en dataudtrækker for et fodbold-management værktøj.
Du får et screenshot fra en spilkarriere (trupliste, spillerkort eller statistikoversigt).
Læs ALLE synlige spillere ud af billedet. Gæt ikke felter du ikke kan se — brug null.

Svar KUN med JSON på formen:
{"players":[{
 "name": string,
 "position": string|null,           // fx "ST", "CB", "GK"
 "overall": number|null,            // OVR / samlet rating
 "potential": number|null,          // POT hvis synlig
 "age": number|null,
 "market_value": number|null,       // i euro, fx 25.5m => 25500000
 "wage": number|null,               // euro pr. uge
 "contract_until": string|null,     // fx "2029" eller "30-06-2029"
 "preferred_foot": string|null,     // "Højre" eller "Venstre"
 "nationality": string|null,
 "shirt_number": number|null,
 "form": number|null,               // 1-10 hvis synlig
 "stats": object,                   // synlige statistikker, fx {"kampe":12,"maal":7,"assists":3,"snit":7.4}
 "uncertain_fields": string[]       // felter du er usikker på
}]}
Ingen forklaring, ingen markdown-kodeblok.`;

export async function extractPlayersFromImage(
  dataUrl: string,
): Promise<{ players: ExtractedPlayer[]; raw: unknown }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI er ikke konfigureret for dette projekt.");

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
              text: "Læs alle spillere og deres data ud af dette screenshot.",
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
      throw new Error("For mange forespørgsler til AI lige nu. Prøv igen om et øjeblik.");
    }
    if (response.status === 402) {
      throw new Error(`AI-kreditter er opbrugt: ${message}`);
    }
    if (response.status === 403) {
      throw new Error(`AI er blokeret for dette workspace: ${message}`);
    }
    throw new Error(`AI-fejl (${response.status}): ${message}`);
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
    throw new Error("AI kunne ikke læse billedet som spillerdata. Prøv et tydeligere screenshot.");
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
