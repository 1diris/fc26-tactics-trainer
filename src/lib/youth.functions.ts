import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const youthInput = z.object({
  careerId: z.string().uuid(),
  name: z.string().min(1),
  position: z.string().min(1),
  age: z.number().int().min(14).max(19),
  overall: z.number().int().min(30).max(99).nullable().optional(),
  potentialMin: z.number().int().min(30).max(99).nullable().optional(),
  potentialMax: z.number().int().min(30).max(99).nullable().optional(),
  plan: z.string().min(1).default("Dynamisk"),
  photoDataUrl: z.string().max(3_000_000).nullable().optional(),
});

export const listYouthPlayers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ careerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("youth_players")
      .select(
        "id, name, position, age, overall, potential_min, potential_max, plan, photo_data_url, created_at",
      )
      .eq("career_id", data.careerId)
      .order("overall", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createYouthPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => youthInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("youth_players").insert({
      career_id: data.careerId,
      user_id: context.userId,
      name: data.name.trim(),
      position: data.position,
      age: data.age,
      overall: data.overall ?? null,
      potential_min: data.potentialMin ?? null,
      potential_max: data.potentialMax ?? null,
      plan: data.plan,
      photo_data_url: data.photoDataUrl ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteYouthPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ youthId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("youth_players")
      .delete()
      .eq("id", data.youthId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Moves a youth talent into the first-team squad for the given season. */
export const promoteYouthPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        youthId: z.string().uuid(),
        careerId: z.string().uuid(),
        seasonId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: youth, error } = await supabase
      .from("youth_players")
      .select("id, name, position, age, overall, potential_min, potential_max, career_id")
      .eq("id", data.youthId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!youth || youth.career_id !== data.careerId)
      throw new Error("Talentet blev ikke fundet i denne karriere.");

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        career_id: data.careerId,
        user_id: userId,
        name: youth.name,
        primary_position: youth.position,
      })
      .select("id")
      .single();
    if (playerError || !player)
      throw new Error(playerError?.message ?? "Kunne ikke oprette spilleren i truppen.");

    const { error: snapshotError } = await supabase.from("player_snapshots").upsert(
      {
        player_id: player.id,
        season_id: data.seasonId,
        career_id: data.careerId,
        user_id: userId,
        overall: youth.overall,
        potential: youth.potential_max ?? youth.potential_min,
        age: youth.age,
        position: youth.position,
      },
      { onConflict: "player_id,season_id" },
    );
    if (snapshotError) throw new Error(snapshotError.message);

    await supabase.from("youth_players").delete().eq("id", youth.id);

    return { ok: true, name: youth.name };
  });
