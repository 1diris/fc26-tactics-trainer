import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

const BUCKET = "career-screenshots";

/**
 * Downloads an uploaded screenshot, sends it to Lovable AI and returns the
 * extracted players for the user to review before anything is saved.
 */
export const analyzeScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        careerId: z.string().uuid(),
        seasonId: z.string().uuid(),
        storagePath: z.string().min(1),
        mimeType: z.string().min(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: importRow, error: importError } = await supabase
      .from("screenshot_imports")
      .insert({
        career_id: data.careerId,
        season_id: data.seasonId,
        user_id: userId,
        storage_path: data.storagePath,
        status: "processing",
      })
      .select("id")
      .single();
    if (importError || !importRow) {
      throw new Error(importError?.message ?? "Kunne ikke oprette import.");
    }

    try {
      const { data: file, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(data.storagePath);
      if (downloadError || !file) {
        throw new Error(downloadError?.message ?? "Kunne ikke hente det uploadede billede.");
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.byteLength === 0) throw new Error("Billedet er tomt.");
      let binary = "";
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      const dataUrl = `data:${data.mimeType};base64,${btoa(binary)}`;

      const { extractPlayersFromImage } = await import("./ai-extract.server");
      const { players, raw } = await extractPlayersFromImage(dataUrl);

      await supabase
        .from("screenshot_imports")
        .update({
          status: players.length > 0 ? "extracted" : "empty",
          raw_result: raw as Json,
          player_count: players.length,
        })
        .eq("id", importRow.id);

      return { importId: importRow.id, players };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ukendt fejl under analysen.";
      await supabase
        .from("screenshot_imports")
        .update({ status: "failed", error_message: message })
        .eq("id", importRow.id);
      throw new Error(message);
    }
  });

export const listImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ careerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("screenshot_imports")
      .select("id, status, player_count, error_message, created_at")
      .eq("career_id", data.careerId)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
