import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { findMatchingPlayerIndex } from "@/lib/player-matching";
import { normalizePosition, playerKey } from "@/lib/football";

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
 * Candidates are scored on position, age and overall; only a clear winner is
 * stored, so uncertain cases stay available for manual matching.
 */
export const autoMatchSquad = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ careerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: players, error } = await supabase
      .from("players")
      .select("id, name, shirt_number, nationality, primary_position, fc_player_id")
      .eq("career_id", data.careerId);
    if (error) throw new Error(error.message);

    const unmatched = (players ?? []).filter((player) => !player.fc_player_id);
    if (unmatched.length === 0) {
      return { checked: 0, matched: 0, ambiguous: 0, remaining: 0 };
    }

    const { data: snapshots } = await supabase
      .from("player_snapshots")
      .select("player_id, overall, age, position, created_at")
      .in(
        "player_id",
        unmatched.map((player) => player.id),
      )
      .order("created_at", { ascending: false });

    const latest = new Map<string, { overall: number | null; age: number | null; position: string | null }>();
    for (const snapshot of snapshots ?? []) {
      if (!latest.has(snapshot.player_id)) {
        latest.set(snapshot.player_id, {
          overall: snapshot.overall,
          age: snapshot.age,
          position: snapshot.position,
        });
      }
    }

    let matched = 0;
    let ambiguous = 0;

    for (const player of unmatched) {
      const lastName = playerKey(player.name).split(" ").filter(Boolean).at(-1);
      if (!lastName || lastName.length < 2) continue;

      // Navne i FC-databasen kan have accenter (fx "Sánchez"), så vi gør
      // søgemønsteret tolerant over for bogstaver der ofte har accent.
      const pattern = [...lastName]
        .map((char) => ("aeiouycnszgo".includes(char) ? "_" : char))
        .join("");

      const { data: candidates } = await supabase
        .from("fc_players")
        .select("id, short_name, long_name, overall, age, positions, nationality_name")
        .or(`short_name.ilike.%${pattern}%,long_name.ilike.%${pattern}%`)
        .limit(300);
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
      if (hits.length === 0) continue;

      const snapshot = latest.get(player.id);
      const ownPosition = normalizePosition(snapshot?.position ?? player.primary_position);
      const ownOverall = snapshot?.overall ?? null;
      const ownAge = snapshot?.age ?? null;
      const ownNation = player.nationality ? playerKey(player.nationality) : null;

      const scored = hits
        .map((candidate) => {
          let score = 0;
          const positions = (candidate.positions ?? [])
            .map((position) => normalizePosition(position))
            .filter(Boolean) as string[];
          if (ownPosition && positions.length > 0) {
            if (positions[0] === ownPosition) score += 40;
            else if (positions.includes(ownPosition)) score += 25;
          }
          if (ownNation && candidate.nationality_name) {
            if (playerKey(candidate.nationality_name) === ownNation) score += 30;
          }
          if (ownAge != null && candidate.age != null) {
            const diff = Math.abs(candidate.age - ownAge);
            if (diff <= 2) score += 25 - diff * 5;
            else if (diff <= 5) score += 5;
            else score -= 15;
          }
          if (ownOverall != null && candidate.overall != null) {
            const diff = Math.abs(candidate.overall - ownOverall);
            // Karrieren udvikler spillere, så vi tillader en pæn afvigelse.
            score += Math.max(-10, 20 - diff * 2);
          }
          return { candidate, score };
        })
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      const runnerUp = scored[1];
      if (!best) continue;
      if (runnerUp && best.score - runnerUp.score < 10) {
        ambiguous += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("players")
        .update({ fc_player_id: best.candidate.id, fc_match_source: "auto" })
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

