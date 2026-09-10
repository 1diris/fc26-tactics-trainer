import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { findMatchingPlayerIndex } from "@/lib/player-matching";
import { normalizePosition } from "@/lib/football";

const FC_PLAYER_COLUMNS =
  "id, external_id, short_name, long_name, positions, overall, potential, value_eur, wage_eur, release_clause_eur, age, height_cm, weight_kg, club_name, league_name, league_level, nationality_name, preferred_foot, weak_foot, skill_moves, contract_until, pace, shooting, passing, dribbling, defending, physic, face_url";

const searchInput = z.object({
  query: z.string().max(120).optional(),
  positions: z.array(z.string().max(5)).max(8).optional(),
  minOverall: z.number().int().min(0).max(99).nullable().optional(),
  maxOverall: z.number().int().min(0).max(99).nullable().optional(),
  minPotential: z.number().int().min(0).max(99).nullable().optional(),
  maxPotential: z.number().int().min(0).max(99).nullable().optional(),
  minAge: z.number().int().min(14).max(80).nullable().optional(),
  maxAge: z.number().int().min(14).max(80).nullable().optional(),
  league: z.string().max(80).nullable().optional(),
  minValue: z.number().min(0).nullable().optional(),
  maxValue: z.number().min(0).nullable().optional(),
  minWage: z.number().min(0).nullable().optional(),
  maxWage: z.number().min(0).nullable().optional(),
  foot: z.enum(["Left", "Right"]).nullable().optional(),
  sort: z.enum(["overall", "potential", "value_asc", "value_desc", "age"]).optional(),
  preset: z
    .enum(["wonderkids", "gems", "bargains", "expiring", "free_agents"])
    .nullable()
    .optional(),
  page: z.number().int().min(0).max(200).optional(),
});

export type MarketSearchInput = z.infer<typeof searchInput>;
export type MarketPreset = NonNullable<NonNullable<MarketSearchInput["preset"]>>;

const PAGE_SIZE = 50;
/** Presets rank on a derived score, so we score a candidate pool server-side. */
const RANKED_PRESETS = new Set<string>(["wonderkids", "gems", "bargains"]);
const CANDIDATE_LIMIT = 400;

type Row = {
  overall: number | null;
  potential: number | null;
  value_eur: number | string | null;
  age: number | null;
};

function growth(row: Row): number {
  return (row.potential ?? 0) - (row.overall ?? 0);
}

/** Higher is better: quality per million euros of market value. */
function valueScore(row: Row, rating: number | null): number {
  const value = Number(row.value_eur ?? 0);
  if (!rating || value <= 0) return 0;
  return rating / (value / 1_000_000);
}

export const searchMarketPlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => searchInput.parse(input))
  .handler(async ({ data, context }) => {
    const preset = data.preset ?? null;
    const ranked = preset != null && RANKED_PRESETS.has(preset);

    let query = context.supabase
      .from("fc_players")
      .select(FC_PLAYER_COLUMNS, ranked ? undefined : { count: "exact" });

    const term = data.query?.trim();
    if (term) {
      const escaped = term.replace(/[%,()]/g, " ").trim();
      if (escaped) {
        query = query.or(
          `short_name.ilike.%${escaped}%,long_name.ilike.%${escaped}%,club_name.ilike.%${escaped}%`,
        );
      }
    }
    if (data.positions && data.positions.length > 0) {
      query = query.overlaps("positions", data.positions);
    }
    if (data.minOverall != null) query = query.gte("overall", data.minOverall);
    if (data.maxOverall != null) query = query.lte("overall", data.maxOverall);
    if (data.minPotential != null) query = query.gte("potential", data.minPotential);
    if (data.maxPotential != null) query = query.lte("potential", data.maxPotential);
    if (data.minAge != null) query = query.gte("age", data.minAge);
    if (data.maxAge != null) query = query.lte("age", data.maxAge);
    if (data.league) query = query.eq("league_name", data.league);
    if (data.minValue != null) query = query.gte("value_eur", data.minValue);
    if (data.maxValue != null) query = query.lte("value_eur", data.maxValue);
    if (data.minWage != null) query = query.gte("wage_eur", data.minWage);
    if (data.maxWage != null) query = query.lte("wage_eur", data.maxWage);
    if (data.foot) query = query.eq("preferred_foot", data.foot);

    // Preset constraints that map straight onto indexed columns.
    switch (preset) {
      case "wonderkids":
        query = query.lte("age", Math.min(21, data.maxAge ?? 21)).gt("value_eur", 0);
        break;
      case "gems":
        query = query
          .gte("age", Math.max(22, data.minAge ?? 22))
          .lte("age", Math.min(26, data.maxAge ?? 26))
          .gt("value_eur", 0);
        break;
      case "bargains":
        query = query.gte("overall", Math.max(70, data.minOverall ?? 70)).gt("value_eur", 0);
        break;
      case "expiring":
        query = query.lte("contract_until", new Date().getFullYear());
        break;
      case "free_agents":
        query = query.is("club_name", null);
        break;
      default:
        break;
    }

    if (ranked) {
      // Pull a generous candidate pool, score it, then paginate the ranking.
      query = query
        .order(preset === "bargains" ? "overall" : "potential", {
          ascending: false,
          nullsFirst: false,
        })
        .order("external_id", { ascending: true })
        .limit(CANDIDATE_LIMIT);

      const { data: rows, error } = await query;
      if (error) throw new Error(error.message);

      const scored = (rows ?? [])
        .filter((row) => {
          if (preset === "wonderkids") return growth(row) >= 10;
          if (preset === "gems") return growth(row) >= 4;
          return true;
        })
        .map((row) => ({
          row,
          score:
            preset === "bargains"
              ? valueScore(row, row.overall)
              : valueScore(row, row.potential) * (1 + growth(row) / 20),
        }))
        .sort((a, b) => b.score - a.score);

      const page = data.page ?? 0;
      const from = page * PAGE_SIZE;
      return {
        players: scored.slice(from, from + PAGE_SIZE).map((entry) => entry.row),
        total: scored.length,
        page,
        pageSize: PAGE_SIZE,
      };
    }

    switch (data.sort ?? "overall") {
      case "potential":
        query = query.order("potential", { ascending: false, nullsFirst: false });
        break;
      case "value_asc":
        query = query.order("value_eur", { ascending: true, nullsFirst: false });
        break;
      case "value_desc":
        query = query.order("value_eur", { ascending: false, nullsFirst: false });
        break;
      case "age":
        query = query.order("age", { ascending: true, nullsFirst: false });
        break;
      default:
        query = query.order("overall", { ascending: false, nullsFirst: false });
    }
    query = query.order("external_id", { ascending: true });

    const page = data.page ?? 0;
    const from = page * PAGE_SIZE;
    const { data: rows, error, count } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    return {
      players: rows ?? [],
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    };
  });

export type MarketPlayer = Awaited<
  ReturnType<typeof searchMarketPlayers>
>["players"][number];

export const listLeagues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // A grouped lookup in the database instead of scanning every player row.
    const { data, error } = await (
      context.supabase.rpc as unknown as (
        fn: string,
      ) => Promise<{
        data: { league_name: string | null; league_level: number | null }[] | null;
        error: { message: string } | null;
      }>
    )("fc_league_names");
    if (error) throw new Error(error.message);
    const seen = new Map<string, number>();
    for (const row of data ?? []) {
      if (row.league_name && !seen.has(row.league_name)) {
        seen.set(row.league_name, row.league_level ?? 99);
      }
    }
    return [...seen.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  });

export const listTransferTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ careerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("transfer_targets")
      .select(`id, priority, expected_price, note, created_at, fc_players(${FC_PLAYER_COLUMNS})`)
      .eq("career_id", data.careerId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export type TransferTarget = Awaited<ReturnType<typeof listTransferTargets>>[number];

export const addTransferTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        fcPlayerId: z.string().uuid(),
        priority: z.number().int().min(1).max(3).optional(),
        expectedPrice: z.number().nullable().optional(),
        note: z.string().max(400).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("transfer_targets").upsert(
      {
        user_id: context.userId,
        career_id: data.careerId,
        fc_player_id: data.fcPlayerId,
        priority: data.priority ?? 2,
        expected_price: data.expectedPrice ?? null,
        note: data.note ?? null,
      },
      { onConflict: "career_id,fc_player_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateTransferTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        targetId: z.string().uuid(),
        priority: z.number().int().min(1).max(3).optional(),
        expectedPrice: z.number().nullable().optional(),
        note: z.string().max(400).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: { priority?: number; expected_price?: number | null; note?: string | null } = {};
    if (data.priority !== undefined) patch["priority"] = data.priority;
    if (data.expectedPrice !== undefined) patch["expected_price"] = data.expectedPrice;
    if (data.note !== undefined) patch["note"] = data.note;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("transfer_targets")
      .update(patch)
      .eq("id", data.targetId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTransferTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        fcPlayerId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("transfer_targets")
      .delete()
      .eq("career_id", data.careerId)
      .eq("fc_player_id", data.fcPlayerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Signs a player from the FC 26 database into the user's squad: creates (or
 * updates) the career player, writes a season snapshot and deducts the fee
 * from the transfer budget.
 */
export const signMarketPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        seasonId: z.string().uuid(),
        fcPlayerId: z.string().uuid(),
        fee: z.number().min(0).nullable().optional(),
        shirtNumber: z.number().int().min(1).max(99).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: fc, error: fcError } = await supabase
      .from("fc_players")
      .select(FC_PLAYER_COLUMNS)
      .eq("id", data.fcPlayerId)
      .maybeSingle();
    if (fcError) throw new Error(fcError.message);
    if (!fc) throw new Error("Player not found in the FC 26 database.");

    const name = fc.short_name.trim();
    const position = normalizePosition(fc.positions?.[0] ?? null);

    const { data: existing, error: existingError } = await supabase
      .from("players")
      .select("id, name, shirt_number, fc_player_id")
      .eq("career_id", data.careerId);
    if (existingError) throw new Error(existingError.message);

    const byFc = (existing ?? []).find((row) => row.fc_player_id === data.fcPlayerId);
    const byName = (existing ?? [])[findMatchingPlayerIndex(existing ?? [], { name })];
    const match = byFc ?? byName ?? null;
    let playerId = match?.id ?? null;
    const alreadyInSquad = playerId !== null;

    if (playerId) {
      const { error } = await supabase
        .from("players")
        .update({
          fc_player_id: data.fcPlayerId,
          fc_match_source: "manual",
          primary_position: position,
          nationality: fc.nationality_name ?? null,
          preferred_foot: fc.preferred_foot ?? null,
          ...(data.shirtNumber != null ? { shirt_number: data.shirtNumber } : {}),
        })
        .eq("id", playerId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await supabase
        .from("players")
        .insert({
          career_id: data.careerId,
          user_id: userId,
          name,
          primary_position: position,
          preferred_foot: fc.preferred_foot ?? null,
          nationality: fc.nationality_name ?? null,
          shirt_number: data.shirtNumber ?? null,
          fc_player_id: data.fcPlayerId,
          fc_match_source: "manual",
        })
        .select("id")
        .single();
      if (error || !inserted) throw new Error(error?.message ?? "Could not create the player.");
      playerId = inserted.id;
    }

    const { error: snapshotError } = await supabase.from("player_snapshots").upsert(
      {
        player_id: playerId,
        season_id: data.seasonId,
        career_id: data.careerId,
        user_id: userId,
        overall: fc.overall,
        potential: fc.potential,
        age: fc.age,
        position,
        market_value: fc.value_eur,
        wage: fc.wage_eur,
        contract_until: fc.contract_until != null ? String(fc.contract_until) : null,
      },
      { onConflict: "player_id,season_id" },
    );
    if (snapshotError) throw new Error(snapshotError.message);

    // The fee leaves the transfer budget; the budget never goes negative.
    const fee = data.fee ?? 0;
    if (fee > 0) {
      const { data: career, error: careerError } = await supabase
        .from("careers")
        .select("transfer_budget")
        .eq("id", data.careerId)
        .maybeSingle();
      if (careerError) throw new Error(careerError.message);
      if (career?.transfer_budget != null) {
        const next = Math.max(0, Number(career.transfer_budget) - fee);
        await supabase.from("careers").update({ transfer_budget: next }).eq("id", data.careerId);
      }
    }

    // A signed player is no longer a target.
    await supabase
      .from("transfer_targets")
      .delete()
      .eq("career_id", data.careerId)
      .eq("fc_player_id", data.fcPlayerId);

    return { playerId, name, alreadyInSquad, fee };
  });
