import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { findMatchingPlayerIndex } from "@/lib/player-matching";
import type { FcOriginal } from "@/lib/valuation";

const playerInput = z.object({
  name: z.string().min(1),
  position: z.string().nullable().optional(),
  overall: z.number().nullable().optional(),
  potential: z.number().nullable().optional(),
  age: z.number().nullable().optional(),
  market_value: z.number().nullable().optional(),
  wage: z.number().nullable().optional(),
  contract_until: z.string().nullable().optional(),
  preferred_foot: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  shirt_number: z.number().nullable().optional(),
  form: z.number().nullable().optional(),
  stats: z.record(z.unknown()).optional(),
});

export type PlayerInput = z.infer<typeof playerInput>;

export const listCareers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("careers")
      .select("id, name, club, league, transfer_budget, current_season_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const careerIds = (data ?? []).map((career) => career.id);
    let counts: Record<string, number> = {};
    if (careerIds.length > 0) {
      const { data: players } = await context.supabase
        .from("players")
        .select("id, career_id")
        .in("career_id", careerIds);
      counts = (players ?? []).reduce<Record<string, number>>((acc, player) => {
        acc[player.career_id] = (acc[player.career_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    return (data ?? []).map((career) => ({
      ...career,
      player_count: counts[career.id] ?? 0,
    }));
  });

export const createCareer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(1),
        club: z.string().min(1),
        league: z.string().optional(),
        seasonLabel: z.string().min(1),
        transferBudget: z.number().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: career, error } = await supabase
      .from("careers")
      .insert({
        user_id: userId,
        name: data.name,
        club: data.club,
        league: data.league ?? null,
        transfer_budget: data.transferBudget ?? null,
      })
      .select("id")
      .single();
    if (error || !career) throw new Error(error?.message ?? "Kunne ikke oprette karriere.");

    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .insert({
        career_id: career.id,
        user_id: userId,
        label: data.seasonLabel,
        sort_order: 0,
      })
      .select("id")
      .single();
    if (seasonError || !season) throw new Error(seasonError?.message ?? "Kunne ikke oprette sæson.");

    await supabase.from("careers").update({ current_season_id: season.id }).eq("id", career.id);

    return { careerId: career.id, seasonId: season.id };
  });

export const deleteCareer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ careerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("careers").delete().eq("id", data.careerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCareerData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ careerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: career, error } = await supabase
      .from("careers")
      .select("id, name, club, league, transfer_budget, current_season_id")
      .eq("id", data.careerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!career) throw new Error("Karrieren blev ikke fundet.");

    const [seasonsRes, playersRes, snapshotsRes] = await Promise.all([
      supabase
        .from("seasons")
        .select("id, label, sort_order, notes")
        .eq("career_id", career.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("players")
        .select(
          "id, name, primary_position, preferred_foot, nationality, shirt_number, fc_player_id, fc_match_source",
        )
        .eq("career_id", career.id)
        .order("name", { ascending: true }),
      supabase
        .from("player_snapshots")
        .select(
          "id, player_id, season_id, overall, potential, age, position, market_value, wage, contract_until, form, stats",
        )
        .eq("career_id", career.id),
    ]);

    if (seasonsRes.error) throw new Error(seasonsRes.error.message);
    if (playersRes.error) throw new Error(playersRes.error.message);
    if (snapshotsRes.error) throw new Error(snapshotsRes.error.message);

    const fcIds = [
      ...new Set(
        (playersRes.data ?? [])
          .map((player) => player.fc_player_id)
          .filter((value): value is string => !!value),
      ),
    ];
    let fcPlayers: FcOriginal[] = [];
    if (fcIds.length > 0) {
      const { data: fcRows } = await supabase
        .from("fc_players")
        .select(
          "id, external_id, short_name, long_name, positions, overall, potential, value_eur, wage_eur, age, club_name, league_name, face_url",
        )
        .in("id", fcIds);
      fcPlayers = (fcRows ?? []) as FcOriginal[];
    }

    return {
      career,
      seasons: seasonsRes.data ?? [],
      players: playersRes.data ?? [],
      snapshots: snapshotsRes.data ?? [],
      fcPlayers,
    };
  });

export const createSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        label: z.string().min(1),
        copyFromSeasonId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("seasons")
      .select("sort_order")
      .eq("career_id", data.careerId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data: season, error } = await supabase
      .from("seasons")
      .insert({
        career_id: data.careerId,
        user_id: userId,
        label: data.label,
        sort_order: nextOrder,
      })
      .select("id")
      .single();
    if (error || !season) throw new Error(error?.message ?? "Kunne ikke oprette sæson.");

    if (data.copyFromSeasonId) {
      const { data: previous } = await supabase
        .from("player_snapshots")
        .select(
          "player_id, overall, potential, age, position, market_value, wage, contract_until, form, stats",
        )
        .eq("season_id", data.copyFromSeasonId);
      if (previous && previous.length > 0) {
        await supabase.from("player_snapshots").insert(
          previous.map((snapshot) => ({
            ...snapshot,
            age: snapshot.age === null ? null : snapshot.age + 1,
            career_id: data.careerId,
            season_id: season.id,
            user_id: userId,
          })),
        );
      }
    }

    await supabase
      .from("careers")
      .update({ current_season_id: season.id })
      .eq("id", data.careerId);

    return { seasonId: season.id };
  });

export const setCurrentSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ careerId: z.string().uuid(), seasonId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("careers")
      .update({ current_season_id: data.seasonId })
      .eq("id", data.careerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCareerSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        name: z.string().min(1).optional(),
        club: z.string().min(1).optional(),
        league: z.string().nullable().optional(),
        transferBudget: z.number().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      name?: string;
      club?: string;
      league?: string | null;
      transfer_budget?: number | null;
    } = {};
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.club !== undefined) patch["club"] = data.club;
    if (data.league !== undefined) patch["league"] = data.league;
    if (data.transferBudget !== undefined) patch["transfer_budget"] = data.transferBudget;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("careers")
      .update(patch)
      .eq("id", data.careerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Saves approved players for a season. Existing players are matched on name
 * (case-insensitive) so a new upload updates instead of duplicating.
 */
export const savePlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        seasonId: z.string().uuid(),
        importId: z.string().uuid().nullable().optional(),
        players: z.array(playerInput).min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: existingError } = await supabase
      .from("players")
      .select("id, name")
      .eq("career_id", data.careerId);
    if (existingError) throw new Error(existingError.message);

    // Nuværende øjebliksbilleder for sæsonen, så felter AI ikke kunne læse
    // beholder deres gamle værdi i stedet for at blive nulstillet.
    const { data: currentSnapshots } = await supabase
      .from("player_snapshots")
      .select(
        "player_id, overall, potential, age, position, market_value, wage, contract_until, form, stats",
      )
      .eq("career_id", data.careerId)
      .eq("season_id", data.seasonId);
    const snapshotByPlayer = new Map(
      (currentSnapshots ?? []).map((snapshot) => [snapshot.player_id, snapshot]),
    );


    // Collapse duplicates within the submitted batch so the same player is
    // never inserted twice; later rows patch earlier ones.
    const deduped: (typeof data.players)[number][] = [];
    for (const input of data.players) {
      if (!input.name.trim()) continue;
      const duplicateIndex = findMatchingPlayerIndex(deduped, input);
      const previous = duplicateIndex >= 0 ? deduped[duplicateIndex] : undefined;
      if (previous) deduped[duplicateIndex] = { ...previous, ...input };
      else deduped.push(input);
    }

    let created = 0;
    let updated = 0;

    for (const input of deduped) {
      const existingIndex = findMatchingPlayerIndex(existing ?? [], input);
      let playerId = existingIndex >= 0 ? existing?.[existingIndex]?.id : undefined;

      if (!playerId) {
        const { data: inserted, error } = await supabase
          .from("players")
          .insert({
            career_id: data.careerId,
            user_id: userId,
            name: input.name.trim(),
            primary_position: input.position ?? null,
            preferred_foot: input.preferred_foot ?? null,
            nationality: input.nationality ?? null,
            shirt_number: input.shirt_number ?? null,
          })
          .select("id")
          .single();
        if (error || !inserted) throw new Error(error?.message ?? "Kunne ikke gemme spiller.");
        playerId = inserted.id;
        existing?.push({ id: playerId, name: input.name.trim() });
        created += 1;
      } else {
        const patch: {
          primary_position?: string;
          preferred_foot?: string;
          nationality?: string;
          shirt_number?: number;
        } = {};
        if (input.position) patch["primary_position"] = input.position;
        if (input.preferred_foot) patch["preferred_foot"] = input.preferred_foot;
        if (input.nationality) patch["nationality"] = input.nationality;
        if (input.shirt_number !== null && input.shirt_number !== undefined) {
          patch["shirt_number"] = input.shirt_number;
        }
        if (Object.keys(patch).length > 0) {
          await supabase.from("players").update(patch).eq("id", playerId);
        }
        updated += 1;
      }

      const { error: snapshotError } = await supabase.from("player_snapshots").upsert(
        {
          player_id: playerId,
          season_id: data.seasonId,
          career_id: data.careerId,
          user_id: userId,
          overall: input.overall ?? null,
          potential: input.potential ?? null,
          age: input.age ?? null,
          position: input.position ?? null,
          market_value: input.market_value ?? null,
          wage: input.wage ?? null,
          contract_until: input.contract_until ?? null,
          form: input.form ?? null,
          stats: (input.stats ?? {}) as Json,
        },
        { onConflict: "player_id,season_id" },
      );
      if (snapshotError) throw new Error(snapshotError.message);
    }

    if (data.importId) {
      await supabase
        .from("screenshot_imports")
        .update({ status: "approved", player_count: data.players.length })
        .eq("id", data.importId);
    }

    return { created, updated };
  });

export const updatePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        playerId: z.string().uuid(),
        seasonId: z.string().uuid(),
        values: playerInput,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const values = data.values;

    const { error: playerError } = await supabase
      .from("players")
      .update({
        name: values.name.trim(),
        primary_position: values.position ?? null,
        preferred_foot: values.preferred_foot ?? null,
        nationality: values.nationality ?? null,
        shirt_number: values.shirt_number ?? null,
      })
      .eq("id", data.playerId);
    if (playerError) throw new Error(playerError.message);

    const { error: snapshotError } = await supabase.from("player_snapshots").upsert(
      {
        player_id: data.playerId,
        season_id: data.seasonId,
        career_id: data.careerId,
        user_id: userId,
        overall: values.overall ?? null,
        potential: values.potential ?? null,
        age: values.age ?? null,
        position: values.position ?? null,
        market_value: values.market_value ?? null,
        wage: values.wage ?? null,
        contract_until: values.contract_until ?? null,
        form: values.form ?? null,
        stats: (values.stats ?? {}) as Json,
      },
      { onConflict: "player_id,season_id" },
    );
    if (snapshotError) throw new Error(snapshotError.message);

    return { ok: true };
  });

export const deletePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ playerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("players").delete().eq("id", data.playerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sells a player: removes him from the squad and adds the fee to the transfer budget. */
export const sellPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        playerId: z.string().uuid(),
        fee: z.number().min(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, name, career_id")
      .eq("id", data.playerId)
      .maybeSingle();
    if (playerError) throw new Error(playerError.message);
    if (!player || player.career_id !== data.careerId)
      throw new Error("Spilleren blev ikke fundet i denne karriere.");

    // Remove him from any saved lineups so tactics don't point at a sold player.
    const { data: tactics } = await supabase
      .from("tactics")
      .select("id, lineup")
      .eq("career_id", data.careerId);
    for (const tactic of tactics ?? []) {
      const lineup = tactic.lineup;
      if (!lineup || typeof lineup !== "object" || Array.isArray(lineup)) continue;
      const entries = Object.entries(lineup as Record<string, unknown>);
      const cleaned = entries.filter(([, value]) => value !== data.playerId);
      if (cleaned.length === entries.length) continue;
      await supabase
        .from("tactics")
        .update({ lineup: Object.fromEntries(cleaned) as Json })
        .eq("id", tactic.id);
    }

    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("id", data.playerId);
    if (deleteError) throw new Error(deleteError.message);

    const { data: career } = await supabase
      .from("careers")
      .select("transfer_budget")
      .eq("id", data.careerId)
      .maybeSingle();

    let budget: number | null = null;
    if (career?.transfer_budget != null) {
      budget = Number(career.transfer_budget) + data.fee;
      await supabase.from("careers").update({ transfer_budget: budget }).eq("id", data.careerId);
    }

    return { ok: true, name: player.name, fee: data.fee, budget };
  });

