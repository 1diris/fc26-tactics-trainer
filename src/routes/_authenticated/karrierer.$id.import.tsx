import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { careerDataQuery, importsQuery, seasonSummariesQuery } from "@/lib/career-queries";
import { analyzeScreenshot } from "@/lib/import.functions";
import { saveYouthPlayers } from "@/lib/youth.functions";
import { savePlayers, type PlayerInput } from "@/lib/career.functions";
import { autoMatchSquad } from "@/lib/fc-match.functions";
import { sortedSeasons } from "@/lib/squad";
import { findMatchingPlayerIndex } from "@/lib/player-matching";
import { diffCounts, diffDrafts, type DiffField } from "@/lib/import-diff";
import { formatMoney, formatWage } from "@/lib/football";
import { PositionSelect } from "@/components/position-select";
import { Check, Loader2, Trash2, UploadCloud } from "lucide-react";

export const Route = createFileRoute("/_authenticated/karrierer/$id/import")({
  head: () => ({
    meta: [
      { title: "Import screenshot — Career Chronicles" },
      {
        name: "description",
        content:
          "Upload a screenshot of the FC 26 squad screen and get player data read automatically, which you can correct before saving.",
      },
      { property: "og:title", content: "Import screenshot — Career Chronicles" },
      {
        property: "og:description",
        content: "Screenshot in, player data out — with the option to correct before you save.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportPage,
});

type Draft = PlayerInput & {
  uncertain_fields?: string[];
  potential_min?: number | null;
  potential_max?: number | null;
  plan?: string | null;
  is_youth?: boolean;
  target?: "squad" | "youth";
};

/** Talents are recognised by age 13-18, POT range or the AI's academy hint. */
function suggestTarget(draft: Draft): "squad" | "youth" {
  if (draft.target) return draft.target;
  if (draft.is_youth) return "youth";
  if (typeof draft.age === "number" && draft.age >= 13 && draft.age <= 18) return "youth";
  if (
    typeof draft.potential_min === "number" &&
    typeof draft.potential_max === "number" &&
    draft.potential_max > draft.potential_min
  ) {
    return "youth";
  }
  return "squad";
}

function ImportPage() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/import" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(careerDataQuery(id));
  const imports = useQuery(importsQuery(id));
  const summaries = useQuery(seasonSummariesQuery(id));

  const analyze = useServerFn(analyzeScreenshot);
  const save = useServerFn(savePlayers);
  const saveYouth = useServerFn(saveYouthPlayers);
  const runAutoMatch = useServerFn(autoMatchSquad);

  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [onlyChanges, setOnlyChanges] = useState(false);

  const seasons = sortedSeasons(data.seasons);
  const activeSeason =
    seasons.find((season) => season.id === data.career.current_season_id) ?? seasons[0];

  const matchedCount = data.players.filter((player) => player.fc_player_id).length;
  const totalPlayers = data.players.length;
  const matchMutation = useMutation({
    mutationFn: () => runAutoMatch({ data: { careerId: id } }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["career", id] });
      toast.success(
        result.remaining > 0
          ? `${result.matched} players matched · ${result.remaining} still unmatched.`
          : `${result.matched} players matched.`,
      );
    },
    onError: (error) => toast.error(error.message),
  });

  const withTarget: Draft[] = (drafts ?? []).map((draft) => ({
    ...draft,
    target: suggestTarget(draft),
  }));
  const squadDrafts = withTarget.filter((draft) => draft.target !== "youth");
  const youthDrafts = withTarget.filter((draft) => draft.target === "youth");
  const diffs = diffDrafts(withTarget, data.players, data.snapshots, activeSeason?.id ?? null);
  const counts = diffCounts(diffs.filter((_, i) => withTarget[i]?.target !== "youth"));
  const hasExistingSquad = data.players.length > 0;

  const formatDiffValue = (field: DiffField, value: string | number | null) => {
    if (value === null || value === "") return "–";
    if (field === "market_value") return formatMoney(Number(value));
    if (field === "wage") return formatWage(Number(value));
    return String(value);
  };

  const changeBadge = (field: DiffField, index: number) => {
    const change = diffs[index]?.changes.find((entry) => entry.field === field);
    if (!change) return null;
    const numeric =
      typeof change.before === "number" && typeof change.after === "number"
        ? change.after - change.before
        : null;
    const tone =
      numeric === null
        ? "text-ov-muted"
        : numeric > 0
          ? "text-ov-accent"
          : "text-ov-warn";
    return (
      <div className={`mt-1 text-[11px] tabular-nums ${tone}`}>
        {formatDiffValue(field, change.before)} → {formatDiffValue(field, change.after)}
        {numeric !== null && numeric !== 0 ? ` (${numeric > 0 ? "+" : ""}${numeric})` : ""}
      </div>
    );
  };

  const MAX_FILES = 10;
  const storageKey = `import-drafts-${id}`;

  // Restore an unsaved approval list, so it does not disappear if the page
  // reloads or the user switches tabs mid-review.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { drafts?: Draft[]; importId?: string | null };
      if (Array.isArray(parsed.drafts) && parsed.drafts.length > 0) {
        setDrafts(parsed.drafts);
        setImportId(parsed.importId ?? null);
      }
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (drafts && drafts.length > 0) {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ drafts, importId }));
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [drafts, importId, storageKey]);

  const mergeDrafts = (current: Draft[], incoming: Draft[]) => {
    const merged: Draft[] = [];
    for (const player of [...current, ...incoming]) {
      if (!player.name.trim()) continue;
      const existing = findMatchingPlayerIndex(merged, player);
      if (existing === -1) {
        merged.push(player);
      } else {
        // Same player seen again — keep fields and only fill in the new data.
        const previous = merged[existing];
        if (!previous) continue;
        const patch = Object.fromEntries(
          Object.entries(player).filter(([, value]) => value !== null && value !== undefined),
        ) as Partial<Draft>;
        merged[existing] = { ...previous, ...patch };
      }
    }
    return merged;
  };

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0 || !activeSeason) return;

    const selected = files.slice(0, MAX_FILES);
    if (files.length > MAX_FILES) {
      toast.error(`You can analyse ${MAX_FILES} screenshots at a time — the first ${MAX_FILES} will be used.`);
    }

    setUploading(true);
    setProgress({ done: 0, total: selected.length });
    let collected: Draft[] = drafts ?? [];
    let lastImportId = importId;
    let failures = 0;

    try {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) throw new Error("You are not logged in.");

      for (const [index, file] of selected.entries()) {
        try {
          const extension = file.name.split(".").pop() ?? "png";
          const path = `${userId}/${id}/${Date.now()}-${index}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from("career-screenshots")
            .upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) throw new Error(uploadError.message);

          const result = await analyze({
            data: {
              careerId: id,
              seasonId: activeSeason.id,
              storagePath: path,
              mimeType: file.type || "image/png",
            },
          });
          lastImportId = result.importId;
          collected = mergeDrafts(collected, result.players);
          setDrafts(collected);
        } catch (error) {
          failures += 1;
          toast.error(
            `${file.name}: ${error instanceof Error ? error.message : "analysis failed"}`,
          );
        } finally {
          setProgress({ done: index + 1, total: selected.length });
        }
      }

      setImportId(lastImportId);
      if (collected.length === 0) {
        toast.error("AI could not find any players. Try clearer screenshots.");
      } else {
        toast.success(
          `${collected.length} players in the list${failures > 0 ? ` (${failures} images failed)` : ""}. Review them and save.`,
        );
      }
      void imports.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed.");
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeSeason || !drafts) throw new Error("No data to save.");
      let squadResult = { created: 0, updated: 0 };
      if (squadDrafts.length > 0) {
        squadResult = await save({
          data: {
            careerId: id,
            seasonId: activeSeason.id,
            importId,
            players: squadDrafts.map(
              ({
                uncertain_fields: _u,
                potential_min: _pmin,
                potential_max: _pmax,
                plan: _plan,
                is_youth: _y,
                target: _t,
                ...player
              }) => player,
            ),
          },
        });
        // Link new players to the FC 26 database right away.
        try {
          await runAutoMatch({ data: { careerId: id } });
        } catch {
          // Matching can always be run manually from the Squad page.
        }
      }

      let youthResult = { created: 0, updated: 0 };
      if (youthDrafts.length > 0) {
        youthResult = await saveYouth({
          data: {
            careerId: id,
            players: youthDrafts.map((draft) => ({
              name: draft.name,
              position: draft.position ?? null,
              age: typeof draft.age === "number" && draft.age >= 13 && draft.age <= 18 ? draft.age : null,
              overall: draft.overall ?? null,
              potentialMin: draft.potential_min ?? draft.potential ?? null,
              potentialMax: draft.potential_max ?? draft.potential ?? null,
              plan: draft.plan ?? null,
            })),
          },
        });
      }

      return { squad: squadResult, youth: youthResult };
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["career", id] });
      void queryClient.invalidateQueries({ queryKey: ["careers"] });
      void queryClient.invalidateQueries({ queryKey: ["youth", id] });
      const squadTotal = result.squad.created + result.squad.updated;
      const youthTotal = result.youth.created + result.youth.updated;
      setDrafts(null);
      setImportId(null);
      toast.success(
        `Squad: ${result.squad.created} new, ${result.squad.updated} updated · Academy: ${result.youth.created} new, ${result.youth.updated} updated.`,
      );
      void navigate({
        to: squadTotal === 0 && youthTotal > 0 ? "/karrierer/$id/akademi" : "/karrierer/$id/trup",
        params: { id },
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const setAllTargets = (target: "squad" | "youth") => {
    setDrafts((current) => (current ? current.map((draft) => ({ ...draft, target })) : current));
  };

  const patchDraft = (index: number, patch: Partial<Draft>) => {
    setDrafts((current) =>
      current ? current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)) : current,
    );
  };

  const numberField = (
    index: number,
    field: "overall" | "potential" | "age" | "market_value" | "wage" | "shirt_number",
    draft: Draft,
  ) => (
    <Input
      type="number"
      className="h-8 w-full rounded-lg border-ov-control bg-transparent text-right text-sm tabular-nums"
      value={draft[field] ?? ""}
      onChange={(event) =>
        patchDraft(index, {
          [field]: event.target.value === "" ? null : Number(event.target.value),
        } as Partial<Draft>)
      }
    />
  );

  const OUTLINE =
    "inline-flex h-9 items-center justify-center rounded-[10px] border border-ov-control px-3 text-sm font-medium text-ov-text hover:bg-ov-line disabled:opacity-50";
  const PRIMARY =
    "inline-flex h-9 items-center justify-center rounded-[10px] bg-ov-accent px-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50";
  const CARD = "rounded-2xl border border-ov-border bg-ov-card";

  const tips = [
    "Use the in-game squad screen with OVR and POT visible",
    "Take a screenshot, not a photo of the TV",
    "Upload several images to cover the whole squad",
  ];

  return (
    <div className={`space-y-6 text-ov-text ${drafts && drafts.length > 0 ? "pb-24" : ""}`}>
      <div>
        <h1 className="font-tight text-[32px] font-bold leading-tight tracking-[-0.03em]">Import</h1>
        <p className="mt-1 text-sm text-ov-muted">Upload squad screenshots to create a new snapshot</p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* Upload */}
          <section className={`${CARD} p-5`}>
            <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">
              Upload screenshots{activeSeason ? ` · ${activeSeason.label}` : ""}
            </h2>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />
            <div
              role="button"
              tabIndex={0}
              aria-disabled={uploading}
              onClick={() => !uploading && fileRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !uploading) fileRef.current?.click();
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!uploading) setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                if (!uploading) void handleFiles(event.dataTransfer.files);
              }}
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition ${
                uploading
                  ? "cursor-default border-[#3a3a3a] opacity-70"
                  : dragActive
                    ? "border-ov-accent bg-ov-accent/5"
                    : "border-[#3a3a3a] hover:border-ov-control"
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ov-accent/10">
                <UploadCloud className="h-5 w-5 text-ov-accent" />
              </span>
              <div>
                <p className="font-tight text-sm font-semibold">Drop squad screenshots here</p>
                <p className="mt-1 text-xs text-ov-muted">PNG or JPG · several images for a full squad</p>
              </div>
              <button
                type="button"
                className={PRIMARY}
                disabled={uploading || !activeSeason}
                onClick={(event) => {
                  event.stopPropagation();
                  fileRef.current?.click();
                }}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Analysing…
                  </>
                ) : (
                  "Choose files"
                )}
              </button>
              {uploading && progress && (
                <p className="max-w-sm text-xs text-ov-muted">
                  Analysing image {Math.min(progress.done + 1, progress.total)} of {progress.total} —
                  this can take a minute per image.
                </p>
              )}
            </div>
            <p className="mt-4 text-xs text-ov-muted">
              Use the squad screen in FC 26, where name, position, OVR, potential, age, value, wage
              and contract are visible. Up to {MAX_FILES} screenshots at a time — players with the
              same name are merged into one approval list.
            </p>
            {hasExistingSquad && (
              <p className="mt-2 text-xs text-ov-muted">
                You already have {data.players.length} players. Follow-up screenshots update existing
                players with new OVR, value, wage and contract — only completely new names are
                created, and players not in the images are left untouched.
              </p>
            )}
          </section>

          {/* Snapshots */}
          <section className={`${CARD} p-5`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">Snapshots</h2>
              <span className="text-xs text-ov-muted">One per season</span>
            </div>
            <ul className="mt-2 divide-y divide-ov-line">
              {seasons.map((season) => {
                const isCurrent = season.id === activeSeason?.id;
                const summary = summaries.data?.[season.id];
                return (
                  <li key={season.id} className="flex items-center gap-3 py-3">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${isCurrent ? "bg-ov-accent" : "bg-[#3a3a3a]"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-tight text-sm font-semibold">Season {season.label}</span>
                        {isCurrent && <span className="text-[11px] text-ov-muted">Current</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-ov-muted">
                        {summary
                          ? `${summary.players} players · imported ${new Date(summary.importedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                          : "No snapshot yet"}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`${OUTLINE} h-8`}
                      onClick={() =>
                        void navigate({ to: "/karrierer/$id/trup", params: { id } })
                      }
                    >
                      View
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          {/* FC 26 database */}
          <section className={`${CARD} p-5`}>
            <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">FC 26 database</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-tight text-[28px] font-bold tracking-[-0.03em]">{matchedCount}</span>
              <span className="text-sm text-ov-muted">/ {totalPlayers}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1f1f1f]">
              <div
                className="h-full rounded-full bg-ov-accent transition-all"
                style={{ width: `${totalPlayers > 0 ? (matchedCount / totalPlayers) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-ov-muted">
              Matched players get their starting OVR, potential and portrait from the FC 26
              database.
            </p>
            <button
              type="button"
              className={`${OUTLINE} mt-4`}
              disabled={matchMutation.isPending || totalPlayers === 0}
              onClick={() => matchMutation.mutate()}
            >
              {matchMutation.isPending ? "Matching…" : "Match squad"}
            </button>
          </section>

          {/* Tips */}
          <section className={`${CARD} p-5`}>
            <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">For the best result</h2>
            <ul className="mt-3 space-y-3">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ov-accent" />
                  <span className="text-ov-muted">{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {drafts && drafts.length > 0 && (
        <section className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ov-line p-5">
            <div>
              <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">
                Review {drafts.length} players
              </h2>
              <p className="mt-1 text-sm text-ov-muted">
                Correct fields the AI was unsure about (marked in yellow) before you save.
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium text-ov-accent">{counts.created} new</span>
                <span className="text-ov-muted"> · </span>
                <span className="font-medium">{counts.updated} updated</span>
                <span className="text-ov-muted"> · {counts.unchanged} unchanged</span>
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium">{squadDrafts.length} to the squad</span>
                <span className="text-ov-muted"> · </span>
                <span className="font-medium text-violet-400">{youthDrafts.length} to the academy</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={OUTLINE} onClick={() => setAllTargets("squad")}>
                All to squad
              </button>
              <button type="button" className={OUTLINE} onClick={() => setAllTargets("youth")}>
                All to academy
              </button>
              {hasExistingSquad && (
                <button
                  type="button"
                  className={`${OUTLINE} ${onlyChanges ? "border-ov-accent text-ov-accent" : ""}`}
                  onClick={() => setOnlyChanges((value) => !value)}
                >
                  {onlyChanges ? "Show all" : "Show only changes"}
                </button>
              )}
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-[10px] px-3 text-sm font-medium text-ov-muted hover:text-ov-text"
                onClick={() => setDrafts(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={PRIMARY}
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-ov-line text-[11px] uppercase tracking-wider text-ov-muted">
                  <th className="px-3 py-2 text-left font-medium">Saved to</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Pos</th>
                  <th className="px-3 py-2 text-right font-medium">OVR</th>
                  <th className="px-3 py-2 text-right font-medium">POT</th>
                  <th className="px-3 py-2 text-right font-medium">Age</th>
                  <th className="px-3 py-2 text-right font-medium">Value</th>
                  <th className="px-3 py-2 text-right font-medium">Wage</th>
                  <th className="px-3 py-2 text-left font-medium">Contract</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {withTarget.map((draft, index) => {
                  const isYouth = draft.target === "youth";
                  const diff = diffs[index];
                  const isNew = !diff || diff.status === "new";
                  const changedCount = diff?.changes.length ?? 0;
                  if (onlyChanges && !isYouth && !isNew && changedCount === 0) return null;
                  const uncertain = new Set(draft.uncertain_fields ?? []);
                  const cell = (field: string) =>
                    uncertain.has(field) ? "bg-amber-500/10" : undefined;
                  return (
                    <tr key={`${draft.name}-${index}`} className="border-b border-ov-line last:border-b-0">
                      <td className="px-3 py-1.5 align-top">
                        <div className="inline-flex overflow-hidden rounded-lg border border-ov-control">
                          <button
                            type="button"
                            className={`px-2 py-1 text-[11px] font-medium ${isYouth ? "text-ov-muted" : "bg-ov-accent/15 text-ov-accent"}`}
                            onClick={() => patchDraft(index, { target: "squad" })}
                          >
                            Squad
                          </button>
                          <button
                            type="button"
                            className={`px-2 py-1 text-[11px] font-medium ${isYouth ? "bg-violet-500/15 text-violet-400" : "text-ov-muted"}`}
                            onClick={() => patchDraft(index, { target: "youth" })}
                          >
                            Academy
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            isNew
                              ? "bg-ov-accent/15 text-ov-accent"
                              : changedCount > 0
                                ? "border border-ov-control text-ov-accent"
                                : "border border-ov-control text-ov-muted"
                          }`}
                        >
                          {isYouth
                            ? "Talent"
                            : isNew
                              ? "New"
                              : changedCount > 0
                                ? "Updated"
                                : "Unchanged"}
                        </span>
                      </td>
                      <td className={`px-3 py-1.5 ${cell("name") ?? ""}`}>
                        <Input
                          className="h-8 w-40 rounded-lg border-ov-control bg-transparent text-sm"
                          value={draft.name}
                          onChange={(event) => patchDraft(index, { name: event.target.value })}
                        />
                        {!isNew && diff?.playerName && diff.playerName !== draft.name && (
                          <div className="mt-1 text-[11px] text-ov-muted">
                            matches {diff.playerName}
                          </div>
                        )}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("position") ?? ""}`}>
                        <PositionSelect
                          className="h-8 w-24 rounded-lg border-ov-control bg-transparent text-sm"
                          value={draft.position ?? null}
                          allowEmpty
                          onChange={(next) => patchDraft(index, { position: next })}
                        />
                        {changeBadge("position", index)}
                      </td>

                      <td className={`px-3 py-1.5 ${cell("overall") ?? ""}`}>
                        {numberField(index, "overall", draft)}
                        {changeBadge("overall", index)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("potential") ?? ""}`}>
                        {numberField(index, "potential", draft)}
                        {changeBadge("potential", index)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("age") ?? ""}`}>
                        {numberField(index, "age", draft)}
                        {changeBadge("age", index)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("market_value") ?? ""}`}>
                        {numberField(index, "market_value", draft)}
                        {changeBadge("market_value", index)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("wage") ?? ""}`}>
                        {numberField(index, "wage", draft)}
                        {changeBadge("wage", index)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("contract_until") ?? ""}`}>
                        <Input
                          className="h-8 w-24 rounded-lg border-ov-control bg-transparent text-sm"
                          value={draft.contract_until ?? ""}
                          onChange={(event) =>
                            patchDraft(index, { contract_until: event.target.value || null })
                          }
                        />
                        {changeBadge("contract_until", index)}
                      </td>

                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          aria-label={`Remove ${draft.name}`}
                          className="rounded-md p-2 text-ov-muted hover:text-ov-warn"
                          onClick={() =>
                            setDrafts((current) =>
                              current ? current.filter((_, i) => i !== index) : current,
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {imports.data && imports.data.length > 0 && (
        <section className={CARD}>
          <h2 className="border-b border-ov-line p-5 font-tight text-lg font-semibold tracking-[-0.03em]">
            Previous uploads
          </h2>
          <ul className="divide-y divide-ov-line">
            {imports.data.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
              >
                <span className="text-ov-muted">
                  {new Date(row.created_at).toLocaleString("en-GB")}
                </span>
                <span>
                  {row.status === "approved"
                    ? `Saved · ${row.player_count ?? 0} players`
                    : row.status === "failed"
                      ? `Failed · ${row.error_message ?? "unknown error"}`
                      : `${row.status} · ${row.player_count ?? 0} players`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {drafts && drafts.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ov-border bg-ov-card/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] backdrop-blur">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3">
            <span className="text-sm text-ov-muted">
              {squadDrafts.length} to the squad · {youthDrafts.length} to the academy — not saved yet
            </span>
            <button
              type="button"
              className={PRIMARY}
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
