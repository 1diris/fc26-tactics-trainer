import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { findMatchingPlayerIndex } from "@/lib/player-matching";
import { playerKey } from "@/lib/football";

const FC_COLUMNS =
  "id, external_id, short_name, long_name, positions, overall, potential, value_eur, wage_eur, age, club_name, league_name, face_url";

/** Searches the shared FC 26 database by name, for manual matching. */
export const searchFcPlayersByName = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(2), limit: z.number().min(1).max(50).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const term = data.query.trim();
    const { data: rows, error } = await context.supabase
      .from("fc_players")
      .select(FC_COLUMNS)
      .or(`short_name.ilike.%${term}%,long_name.ilike.%${term}%`)
      .order("overall", { ascending: false })
      .limit(data.limit ?? 20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Links (or unlinks) a career player to a player in the FC 26 database. */
export const setPlayerFcMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        playerId: z.string().uuid(),
        fcPlayerId: z.string().uuid().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("players")
      .update({
        fc_player_id: data.fcPlayerId,
        fc_match_source: data.fcPlayerId ? "manual" : null,
      })
      .eq("id", data.playerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Tries to link every unmatched squad player to the FC 26 database.
 * Only unambiguous matches are stored; anything uncertain is left to the user.
 */
export const autoMatchSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ careerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: players, error } = await supabase
      .from("players")
      .select("id, name, shirt_number, nationality, fc_player_id")
      .eq("career_id", data.careerId);
    if (error) throw new Error(error.message);

    const unmatched = (players ?? []).filter((player) => !player.fc_player_id);
    let matched = 0;
    let ambiguous = 0;

    for (const player of unmatched) {
      const lastName = playerKey(player.name).split(" ").filter(Boolean).at(-1);
      if (!lastName || lastName.length < 2) continue;

      const { data: candidates } = await supabase
        .from("fc_players")
        .select("id, short_name, long_name, overall, nationality_name")
        .or(`short_name.ilike.%${lastName}%,long_name.ilike.%${lastName}%`)
        .limit(80);
      if (!candidates || candidates.length === 0) continue;

      const hits = candidates.filter((candidate) => {
        const byShort = findMatchingPlayerIndex([{ name: candidate.short_name }], {
          name: player.name,
        });
        if (byShort === 0) return true;
        if (!candidate.long_name) return false;
        return (
          findMatchingPlayerIndex([{ name: candidate.long_name }], { name: player.name }) === 0
        );
      });

      let chosen = hits[0];
      if (hits.length > 1) {
        const sameNation = player.nationality
          ? hits.filter(
              (hit) =>
                playerKey(hit.nationality_name ?? "") === playerKey(player.nationality as string),
            )
          : [];
        if (sameNation.length === 1) {
          chosen = sameNation[0];
        } else {
          ambiguous += 1;
          continue;
        }
      }
      if (!chosen) continue;

      const { error: updateError } = await supabase
        .from("players")
        .update({ fc_player_id: chosen.id, fc_match_source: "auto" })
        .eq("id", player.id);
      if (!updateError) matched += 1;
    }

    return {
      checked: unmatched.length,
      matched,
      ambiguous,
      remaining: unmatched.length - matched,
    };
  });
