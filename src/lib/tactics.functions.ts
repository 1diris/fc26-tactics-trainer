import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

export const getTactic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        seasonId: z.string().uuid().nullable().optional(),
        name: z.string().min(1).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("tactics")
      .select("id, name, formation, lineup, settings, notes, season_id, updated_at")
      .eq("career_id", data.careerId)
      .eq("name", data.name ?? "Standard");
    query = data.seasonId ? query.eq("season_id", data.seasonId) : query.is("season_id", null);
    const { data: tactic, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return tactic ?? null;
  });

export const listTactics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ careerId: z.string().uuid(), seasonId: z.string().uuid().nullable().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("tactics")
      .select("id, name, formation, updated_at")
      .eq("career_id", data.careerId);
    query = data.seasonId ? query.eq("season_id", data.seasonId) : query.is("season_id", null);
    const { data: rows, error } = await query.order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveTactic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        seasonId: z.string().uuid().nullable().optional(),
        name: z.string().min(1).optional(),
        formation: z.string().min(1),
        lineup: z.record(z.string().nullable()),
        settings: z.record(z.union([z.string(), z.number()])),
        roles: z
          .record(z.object({ role: z.string(), focus: z.string(), mastery: z.string().optional() }))
          .optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const name = data.name?.trim() || "Standard";
    const payload = {
      career_id: data.careerId,
      season_id: data.seasonId ?? null,
      user_id: userId,
      name,
      formation: data.formation,
      lineup: data.lineup as unknown as Json,
      settings: { ...data.settings, roles: data.roles ?? {} } as unknown as Json,
      notes: data.notes ?? null,
    };

    let existing = supabase
      .from("tactics")
      .select("id")
      .eq("career_id", data.careerId)
      .eq("name", name);
    existing = data.seasonId
      ? existing.eq("season_id", data.seasonId)
      : existing.is("season_id", null);
    const { data: current, error: findError } = await existing.maybeSingle();
    if (findError) throw new Error(findError.message);

    if (current) {
      const { error } = await supabase.from("tactics").update(payload).eq("id", current.id);
      if (error) throw new Error(error.message);
      return { id: current.id, name };
    }

    const { data: saved, error } = await supabase
      .from("tactics")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: saved?.id ?? null, name };
  });

export const deleteTactic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: target, error: findError } = await supabase
      .from("tactics")
      .select("id, career_id, season_id")
      .eq("id", data.id)
      .maybeSingle();
    if (findError) throw new Error(findError.message);
    if (!target) throw new Error("Tactic not found");

    let siblings = supabase
      .from("tactics")
      .select("id", { count: "exact", head: true })
      .eq("career_id", target.career_id);
    siblings = target.season_id
      ? siblings.eq("season_id", target.season_id)
      : siblings.is("season_id", null);
    const { count, error: countError } = await siblings;
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) <= 1) throw new Error("You must keep at least one tactic for the season");

    const { error } = await supabase.from("tactics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });
