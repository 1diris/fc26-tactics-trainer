import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { careerDataQuery, importsQuery } from "@/lib/career-queries";
import { analyzeScreenshot } from "@/lib/import.functions";
import { savePlayers, type PlayerInput } from "@/lib/career.functions";
import { sortedSeasons } from "@/lib/squad";
import { Loader2, Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/karrierer/$id/import")({
  head: () => ({
    meta: [
      { title: "Importér screenshot — Career Chronicles" },
      {
        name: "description",
        content:
          "Upload et screenshot af FC 26 trupskærmen og få spillerdata læst automatisk, som du kan rette inden det gemmes.",
      },
      { property: "og:title", content: "Importér screenshot — Career Chronicles" },
      {
        property: "og:description",
        content: "Screenshot ind, spillerdata ud — med mulighed for at rette før du gemmer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportPage,
});

type Draft = PlayerInput & { uncertain_fields?: string[] };

function ImportPage() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/import" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(careerDataQuery(id));
  const imports = useQuery(importsQuery(id));

  const analyze = useServerFn(analyzeScreenshot);
  const save = useServerFn(savePlayers);

  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const seasons = sortedSeasons(data.seasons);
  const activeSeason =
    seasons.find((season) => season.id === data.career.current_season_id) ?? seasons[0];

  const MAX_FILES = 10;

  const mergeDrafts = (current: Draft[], incoming: Draft[]) => {
    const merged = [...current];
    const indexByName = new Map(
      merged.map((draft, index) => [draft.name.trim().toLowerCase(), index] as const),
    );
    for (const player of incoming) {
      const key = player.name.trim().toLowerCase();
      const existing = indexByName.get(key);
      if (existing === undefined) {
        indexByName.set(key, merged.length);
        merged.push(player);
      } else {
        merged[existing] = { ...merged[existing], ...player };
      }
    }
    return merged;
  };

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0 || !activeSeason) return;

    const selected = files.slice(0, MAX_FILES);
    if (files.length > MAX_FILES) {
      toast.error(`Der kan analyseres ${MAX_FILES} screenshots ad gangen — de første ${MAX_FILES} bruges.`);
    }

    setUploading(true);
    setProgress({ done: 0, total: selected.length });
    let collected: Draft[] = drafts ?? [];
    let lastImportId = importId;
    let failures = 0;

    try {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) throw new Error("Du er ikke logget ind.");

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
            `${file.name}: ${error instanceof Error ? error.message : "analysen mislykkedes"}`,
          );
        } finally {
          setProgress({ done: index + 1, total: selected.length });
        }
      }

      setImportId(lastImportId);
      if (collected.length === 0) {
        toast.error("AI kunne ikke finde spillere. Prøv tydeligere screenshots.");
      } else {
        toast.success(
          `${collected.length} spillere i listen${failures > 0 ? ` (${failures} billeder fejlede)` : ""}. Tjek dem igennem og gem.`,
        );
      }
      void imports.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysen mislykkedes.");
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!activeSeason || !drafts) throw new Error("Ingen data at gemme.");
      return save({
        data: {
          careerId: id,
          seasonId: activeSeason.id,
          importId,
          players: drafts.map(({ uncertain_fields: _ignored, ...player }) => player),
        },
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["career", id] });
      void queryClient.invalidateQueries({ queryKey: ["careers"] });
      setDrafts(null);
      setImportId(null);
      toast.success(`${result.created} nye og ${result.updated} opdaterede spillere gemt.`);
      void navigate({ to: "/karrierer/$id/trup", params: { id } });
    },
    onError: (error) => toast.error(error.message),
  });

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
      className="h-8 w-full text-right tabular-nums"
      value={draft[field] ?? ""}
      onChange={(event) =>
        patchDraft(index, {
          [field]: event.target.value === "" ? null : Number(event.target.value),
        } as Partial<Draft>)
      }
    />
  );

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-lg font-semibold">
          Upload screenshots {activeSeason ? `til ${activeSeason.label}` : ""}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Brug trupskærmen i FC 26, hvor navn, position, OVR, potentiale, alder, værdi, løn og
          kontrakt er synlige. Du kan vælge op til {MAX_FILES} screenshots ad gangen — de analyseres
          i kø og samles i én godkendelsesliste, hvor spillere med samme navn flettes.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <Button disabled={uploading || !activeSeason} onClick={() => fileRef.current?.click()}>
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Analyserer…" : "Vælg screenshots"}
          </Button>
          {uploading && (
            <span className="text-sm text-muted-foreground">
              {progress
                ? `Analyserer billede ${Math.min(progress.done + 1, progress.total)} af ${progress.total} — det kan tage et minut pr. billede.`
                : "AI læser billederne…"}
            </span>
          )}
        </div>
      </section>

      {drafts && drafts.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-5">
            <div>
              <h2 className="font-display text-lg font-semibold">Gennemgå {drafts.length} spillere</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ret felter AI var usikker på (markeret med gul), før du gemmer.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setDrafts(null)}>
                Annullér
              </Button>
              <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Gemmer…" : "Gem i truppen"}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Navn</th>
                  <th className="px-3 py-2 text-left font-medium">Pos</th>
                  <th className="px-3 py-2 text-right font-medium">OVR</th>
                  <th className="px-3 py-2 text-right font-medium">POT</th>
                  <th className="px-3 py-2 text-right font-medium">Alder</th>
                  <th className="px-3 py-2 text-right font-medium">Værdi</th>
                  <th className="px-3 py-2 text-right font-medium">Løn</th>
                  <th className="px-3 py-2 text-left font-medium">Kontrakt</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft, index) => {
                  const uncertain = new Set(draft.uncertain_fields ?? []);
                  const cell = (field: string) =>
                    uncertain.has(field) ? "bg-amber-500/10" : undefined;
                  return (
                    <tr key={`${draft.name}-${index}`} className="border-b border-border/40">
                      <td className={`px-3 py-1.5 ${cell("name") ?? ""}`}>
                        <Input
                          className="h-8 w-40"
                          value={draft.name}
                          onChange={(event) => patchDraft(index, { name: event.target.value })}
                        />
                      </td>
                      <td className={`px-3 py-1.5 ${cell("position") ?? ""}`}>
                        <Input
                          className="h-8 w-20"
                          value={draft.position ?? ""}
                          onChange={(event) =>
                            patchDraft(index, { position: event.target.value || null })
                          }
                        />
                      </td>
                      <td className={`px-3 py-1.5 ${cell("overall") ?? ""}`}>
                        {numberField(index, "overall", draft)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("potential") ?? ""}`}>
                        {numberField(index, "potential", draft)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("age") ?? ""}`}>
                        {numberField(index, "age", draft)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("market_value") ?? ""}`}>
                        {numberField(index, "market_value", draft)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("wage") ?? ""}`}>
                        {numberField(index, "wage", draft)}
                      </td>
                      <td className={`px-3 py-1.5 ${cell("contract_until") ?? ""}`}>
                        <Input
                          className="h-8 w-24"
                          value={draft.contract_until ?? ""}
                          onChange={(event) =>
                            patchDraft(index, { contract_until: event.target.value || null })
                          }
                        />
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          aria-label={`Fjern ${draft.name}`}
                          className="rounded-md p-2 text-muted-foreground hover:text-destructive"
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
        <section>
          <h2 className="font-display text-lg font-semibold">Tidligere uploads</h2>
          <ul className="mt-3 divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
            {imports.data.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {new Date(row.created_at).toLocaleString("da-DK")}
                </span>
                <span>
                  {row.status === "approved"
                    ? `Gemt · ${row.player_count ?? 0} spillere`
                    : row.status === "failed"
                      ? `Fejlede · ${row.error_message ?? "ukendt fejl"}`
                      : `${row.status} · ${row.player_count ?? 0} spillere`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
