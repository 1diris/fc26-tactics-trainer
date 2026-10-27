import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getChallenge, evaluate, type Completion } from "./challenges/catalogue";
import type { Json } from "@/integrations/supabase/types";

const idSchema = z.object({ challengeId: z.string() });
export const getChallengeProgress = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => idSchema.parse(input)).handler(async ({ data, context }) => {
  getChallenge(data.challengeId);
  const [progress, history] = await Promise.all([
    context.supabase.from("challenge_progress").select("*").eq("user_id", context.userId).eq("challenge_id", data.challengeId).maybeSingle(),
    context.supabase.from("challenge_verifications").select("*").eq("user_id", context.userId).eq("challenge_id", data.challengeId).order("created_at", { ascending: false }),
  ]);
  if (progress.error || history.error) throw new Error(progress.error?.message ?? history.error?.message);
  const rows = await Promise.all((history.data ?? []).map(async (row) => {
    const urls = await context.supabase.storage.from("challenge-screenshots").createSignedUrls(row.storage_paths, 3600);
    return { ...row, imageUrls: (urls.data ?? []).map((file) => file.signedUrl).filter((url): url is string => Boolean(url)) };
  }));
  return { progress: progress.data, history: rows };
});
export const startChallenge = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => idSchema.parse(input)).handler(async ({ data, context }) => {
  getChallenge(data.challengeId);
  const { error } = await context.supabase.from("challenge_progress").upsert({ challenge_id: data.challengeId, user_id: context.userId }, { onConflict: "user_id,challenge_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return { ok: true };
});
export const updateChallenge = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => idSchema.extend({ action: z.enum(["goal", "penalty", "reset"]), goalId: z.string().optional(), completed: z.boolean().optional(), delta: z.number().int().min(-1).max(1).optional() }).parse(input)).handler(async ({ data, context }) => {
  const challenge = getChallenge(data.challengeId);
  if (data.action === "goal" && ![...challenge.rules, ...challenge.seasonGoals.flatMap((season) => season.goals)].some((goal) => goal.id === data.goalId)) throw new Error("Unknown goal.");
  const { data: row, error } = await context.supabase.from("challenge_progress").select("*").eq("user_id", context.userId).eq("challenge_id", data.challengeId).single();
  if (error || !row) throw new Error(error?.message ?? "Start the challenge first.");
  const completions = (row.completions ?? {}) as Record<string, Completion>;
  if (data.action === "goal" && data.goalId) completions[data.goalId] = { completed: data.completed ?? false, source: "manual" };
  const { error: saveError } = await context.supabase.from("challenge_progress").update({ completions: (data.action === "reset" ? {} : completions) as unknown as Json, penalty_count: data.action === "reset" ? 0 : Math.max(0, row.penalty_count + (data.action === "penalty" ? data.delta ?? 1 : 0)), updated_at: new Date().toISOString() }).eq("user_id", context.userId).eq("challenge_id", data.challengeId);
  if (saveError) throw new Error(saveError.message);
  return { ok: true };
});
export const verifyChallengeGoal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => idSchema.extend({ goalId: z.string(), paths: z.array(z.string()).min(1).max(3) }).parse(input)).handler(async ({ data, context }) => {
  const challenge = getChallenge(data.challengeId);
  const goal = [...challenge.rules, ...challenge.seasonGoals.flatMap((season) => season.goals)].find((item) => item.id === data.goalId);
  const metric = goal?.verify.metric ? challenge.metrics[goal.verify.metric] : undefined;
  if (!goal || goal.verify.method !== "auto" || !metric) throw new Error("This goal is not automatically verified.");
  const { data: blocked } = await context.supabase.from("challenge_verifications").select("details").eq("user_id", context.userId).eq("status", "denied").limit(1);
  if (blocked?.length) throw new Error(blocked[0]?.details ?? "AI access is blocked.");
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const { data: verificationId, error: reserveError } = await context.supabase.rpc("reserve_challenge_verification", { p_challenge_id: data.challengeId, p_goal_id: data.goalId, p_paths: data.paths });
  if (reserveError || !verificationId) throw new Error(reserveError?.message ?? "Could not reserve verification.");
  // Privileged writes are limited to the evidence reserved above as this authenticated user.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const images = await Promise.all(data.paths.map(async (path) => {
      const { data: blob, error } = await context.supabase.storage.from("challenge-screenshots").download(path);
      if (error || !blob) throw new Error(error?.message ?? "Could not read image.");
      if (!["image/png", "image/jpeg", "image/webp"].includes(blob.type) || blob.size === 0 || blob.size > 10 * 1024 * 1024) throw new Error("Use PNG, JPG or WebP images under 10 MB.");
      const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      return `data:${blob.type};base64,${btoa(binary)}`;
    }));
    const { extractChallengeMetric } = await import("./challenges/extract.server");
    const reading = await extractChallengeMetric(getRequest(), apiKey, challenge.club, challenge.game, metric.extract, images);
    const status = evaluate(reading, goal.verify);
    const { error } = await supabaseAdmin.from("challenge_verifications").update({ ai_response: reading as unknown as Json, extracted_value: reading.value, status, details: reading.details }).eq("id", verificationId).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const { data: row } = await context.supabase.from("challenge_progress").select("completions").eq("user_id", context.userId).eq("challenge_id", data.challengeId).single();
    const completions = (row?.completions ?? {}) as Record<string, Completion>;
    completions[data.goalId] = { completed: status === "approved", source: "auto" };
    const { error: updateError } = await context.supabase.from("challenge_progress").update({ completions: completions as unknown as Json }).eq("user_id", context.userId).eq("challenge_id", data.challengeId);
    if (updateError) throw new Error(updateError.message);
    return { status, reading };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Screenshot verification failed.";
    const denied = typeof error === "object" && error !== null && "statusCode" in error && (error.statusCode === 403 || error.statusCode === 402);
    await supabaseAdmin.from("challenge_verifications").update({ status: denied ? "denied" : "error", details: message }).eq("id", verificationId).eq("user_id", context.userId);
    throw new Error(message);
  }
});