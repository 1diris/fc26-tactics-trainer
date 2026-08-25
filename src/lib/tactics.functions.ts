import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

export const getTactic = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ careerId: z.string().uuid(), seasonId: z.string().uuid().nullable().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("tactics")
      .select("id, formation, lineup, settings, notes, season_id, updated_at")
      .eq("career_id", data.careerId);
    query = data.seasonId ? query.eq("season_id", data.seasonId) : query.is("season_id", null);
    const { data: tactic, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return tactic ?? null;
  });

export const saveTactic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        seasonId: z.string().uuid().nullable().optional(),
        formation: z.string().min(1),
        lineup: z.record(z.string().nullable()),
        settings: z.record(z.string()),
        notes: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      career_id: data.careerId,
      season_id: data.seasonId ?? null,
      user_id: userId,
      formation: data.formation,
      lineup: data.lineup as unknown as Json,
      settings: data.settings as unknown as Json,
      notes: data.notes ?? null,
    };

    const { data: saved, error } = await supabase
      .from("tactics")
      .upsert(payload, { onConflict: "career_id,season_id" })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: saved?.id ?? null };
  });
