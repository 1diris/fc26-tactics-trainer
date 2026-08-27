import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FC_PLAYER_COLUMNS =
  "id, external_id, short_name, long_name, positions, overall, potential, value_eur, wage_eur, release_clause_eur, age, height_cm, weight_kg, club_name, league_name, league_level, nationality_name, preferred_foot, weak_foot, skill_moves, contract_until, pace, shooting, passing, dribbling, defending, physic, face_url";

const searchInput = z.object({
  query: z.string().max(120).optional(),
  positions: z.array(z.string().max(5)).max(8).optional(),
  minOverall: z.number().int().min(0).max(99).nullable().optional(),
  maxOverall: z.number().int().min(0).max(99).nullable().optional(),
  minPotential: z.number().int().min(0).max(99).nullable().optional(),
  minAge: z.number().int().min(14).max(50).nullable().optional(),
  maxAge: z.number().int().min(14).max(50).nullable().optional(),
  league: z.string().max(80).nullable().optional(),
  maxValue: z.number().min(0).nullable().optional(),
  maxWage: z.number().min(0).nullable().optional(),
  foot: z.enum(["Left", "Right"]).nullable().optional(),
  sort: z.enum(["overall", "potential", "value_asc", "value_desc", "age"]).optional(),
  page: z.number().int().min(0).max(200).optional(),
});

export type MarketSearchInput = z.infer<typeof searchInput>;

const PAGE_SIZE = 50;

export const searchMarketPlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => searchInput.parse(input))
  .handler(async ({ data, context }) => {
    let query = context.supabase.from("fc_players").select(FC_PLAYER_COLUMNS, { count: "exact" });

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
    if (data.minAge != null) query = query.gte("age", data.minAge);
    if (data.maxAge != null) query = query.lte("age", data.maxAge);
    if (data.league) query = query.eq("league_name", data.league);
    if (data.maxValue != null) query = query.lte("value_eur", data.maxValue);
    if (data.maxWage != null) query = query.lte("wage_eur", data.maxWage);
    if (data.foot) query = query.eq("preferred_foot", data.foot);

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
    const { data, error } = await context.supabase
      .from("fc_players")
      .select("league_name, league_level")
      .not("league_name", "is", null)
      .order("league_level", { ascending: true })
      .limit(20000);
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
