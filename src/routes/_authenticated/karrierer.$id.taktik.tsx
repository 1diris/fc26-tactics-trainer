import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { careerDataQuery } from "@/lib/career-queries";
import { getTactic, saveTactic } from "@/lib/tactics.functions";
import { buildSquad, sortedSeasons, type SquadRow } from "@/lib/squad";
import {
  FORMATIONS,
  TACTIC_SETTINGS,
  defaultSettings,
  findFormation,
  positionFit,
  type Fit,
  type TacticSettings,
} from "@/lib/formations";
import { POSITION_LABELS } from "@/lib/football";
import { suggestLineup, type LineupSuggestion } from "@/lib/lineup";

export const Route = createFileRoute("/_authenticated/karrierer/$id/taktik")({
  component: TacticsPage,
});

const fitStyles: Record<Fit, string> = {
  natural: "border-primary/70 bg-primary/20 text-foreground",
  ok: "border-amber-400/60 bg-amber-400/15 text-foreground",
  out: "border-destructive/60 bg-destructive/15 text-foreground",
};

const fitLabels: Record<Fit, string> = {
  natural: "Naturlig position",
  ok: "Kan spille her",
  out: "Ude af position",
};

function TacticsPage() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/taktik" });
  const { data } = useSuspenseQuery(careerDataQuery(id));
  const queryClient = useQueryClient();
  const fetchTactic = useServerFn(getTactic);
  const persist = useServerFn(saveTactic);

  const seasons = sortedSeasons(data.seasons);
  const seasonId = data.career.current_season_id ?? seasons[0]?.id ?? null;

  const tacticQuery = useQuery({
    queryKey: ["tactic", id, seasonId],
    queryFn: () => fetchTactic({ data: { careerId: id, seasonId } }),
  });

  const [formation, setFormation] = useState("4-3-3");
  const [lineup, setLineup] = useState<Record<string, string | null>>({});
  const [settings, setSettings] = useState<TacticSettings>(() => defaultSettings());
  const [notes, setNotes] = useState("");
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<LineupSuggestion | null>(null);

  useEffect(() => {
    const tactic = tacticQuery.data;
    if (!tactic) return;
    setFormation(tactic.formation);
    setLineup((tactic.lineup as Record<string, string | null>) ?? {});
    setSettings({ ...defaultSettings(), ...((tactic.settings as TacticSettings) ?? {}) });
    setNotes(tactic.notes ?? "");
  }, [tacticQuery.data]);

  const rows = useMemo(
    () => buildSquad(data.seasons, data.players, data.snapshots, seasonId),
    [data, seasonId],
  );
  const rowById = useMemo(() => new Map(rows.map((row) => [row.player.id, row])), [rows]);

  const shape = findFormation(formation);
  const usedIds = new Set(Object.values(lineup).filter(Boolean) as string[]);

  const saveMutation = useMutation({
    mutationFn: () =>
      persist({
        data: {
          careerId: id,
          seasonId,
          formation,
          lineup,
          settings,
          notes: notes.trim() ? notes.trim() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Taktik gemt");
      queryClient.invalidateQueries({ queryKey: ["tactic", id, seasonId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function assign(slotId: string, playerId: string | null) {
    setLineup((prev) => {
      const next: Record<string, string | null> = { ...prev };
      if (playerId) {
        for (const [key, value] of Object.entries(next)) {
          if (value === playerId) next[key] = null;
        }
      }
      next[slotId] = playerId;
      return next;
    });
    setActiveSlot(null);
  }

  function autoFill() {
    const result = suggestLineup(shape, rows);
    setLineup(result.lineup);
    setSuggestion(result);
    setActiveSlot(null);
    toast.success("Stærkeste opstilling foreslået");
  }

  const startersOvr = shape.slots
    .map((slot) => rowById.get(lineup[slot.id] ?? "")?.current?.overall)
    .filter((value): value is number => typeof value === "number");
  const avgOvr =
    startersOvr.length > 0
      ? Math.round(startersOvr.reduce((sum, value) => sum + value, 0) / startersOvr.length)
      : null;
  const outOfPosition = shape.slots.filter((slot) => {
    const row = rowById.get(lineup[slot.id] ?? "");
    return row ? positionFit(slot.position, row.position) === "out" : false;
  }).length;

  const bench = rows
    .filter((row) => !usedIds.has(row.player.id))
    .sort((a, b) => (b.current?.overall ?? 0) - (a.current?.overall ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Taktik</h2>
          <p className="text-sm text-muted-foreground">
            Vælg formation, sæt din startopstilling og gem dine taktikindstillinger.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={formation} onValueChange={setFormation}>
            <SelectTrigger className="w-[130px]" aria-label="Vælg formation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATIONS.map((item) => (
                <SelectItem key={item.name} value={item.name}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={autoFill} disabled={rows.length === 0}>
            Foreslå opstilling
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Gemmer…" : "Gem taktik"}
          </Button>
        </div>
      </div>

      {rows.length === 0 && (
        <Card className="p-4 text-sm text-muted-foreground">
          Importér din trup først, så kan du placere spillerne på banen.
        </Card>
      )}

      {suggestion && (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold">
                Anbefalet start-11 ({shape.name})
              </h3>
              <p className="text-xs text-muted-foreground">
                Dette er din stærkeste opstilling baseret på din nuværende trup.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSuggestion(null)}>
              Skjul
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              Samlet OVR: <strong className="text-foreground">{suggestion.totalOvr}</strong>
            </span>
            <span>
              Snit OVR: <strong className="text-foreground">{suggestion.avgOvr ?? "–"}</strong>
            </span>
            <span>
              Naturlig position:{" "}
              <strong className="text-primary">{suggestion.naturalCount}</strong>
            </span>
            <span>
              Sekundær position: <strong className="text-amber-400">{suggestion.okCount}</strong>
            </span>
            <span>
              Ude af position:{" "}
              <strong className="text-destructive">{suggestion.outCount}</strong>
            </span>
          </div>

          <ul className="divide-y divide-border/50 text-sm">
            {suggestion.entries.map((entry) => (
              <li key={entry.slotId} className="flex items-center justify-between gap-2 py-1.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-10 shrink-0 font-semibold">{entry.slotPosition}</span>
                  <span className="truncate">{entry.row?.player.name ?? "Ingen spiller"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{entry.row?.position ?? "–"}</span>
                  <span className="font-semibold text-foreground">
                    {entry.row?.current?.overall ?? "–"}
                  </span>
                  {entry.fit && (
                    <span
                      className={
                        entry.fit === "natural"
                          ? "text-primary"
                          : entry.fit === "ok"
                            ? "text-amber-400"
                            : "text-destructive"
                      }
                    >
                      {entry.fit === "natural"
                        ? "naturlig"
                        : entry.fit === "ok"
                          ? "sekundær"
                          : "ude af pos."}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {suggestion.reasons.length > 0 ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs">
              <p className="mb-1 font-medium text-foreground">
                Det er ikke muligt at stille en 11'er uden spillere ude af position:
              </p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {suggestion.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Alle 11 pladser er dækket af spillere, der kan spille positionen.
            </p>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden p-4">
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              Snit OVR: <strong className="text-foreground">{avgOvr ?? "–"}</strong>
            </span>
            <span>
              Besat: <strong className="text-foreground">{usedIds.size}/11</strong>
            </span>
            <span>
              Ude af position: <strong className="text-foreground">{outOfPosition}</strong>
            </span>
          </div>

          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border/60 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--muted))_100%)]">
            <div className="absolute inset-x-0 top-1/2 h-px bg-border/70" />
            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border/70" />
            <div className="absolute inset-x-[22%] top-0 h-[14%] border-x border-b border-border/70" />
            <div className="absolute inset-x-[22%] bottom-0 h-[14%] border-x border-t border-border/70" />

            {shape.slots.map((slot) => {
              const row = lineup[slot.id] ? rowById.get(lineup[slot.id]!) : undefined;
              const fit = row ? positionFit(slot.position, row.position) : null;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setActiveSlot(activeSlot === slot.id ? null : slot.id)}
                  title={fit ? fitLabels[fit] : POSITION_LABELS[slot.position]}
                  className={`absolute w-[64px] -translate-x-1/2 translate-y-1/2 rounded-lg border px-1 py-1 text-center text-[10px] leading-tight transition-colors ${
                    fit ? fitStyles[fit] : "border-border/70 bg-card/80 text-muted-foreground"
                  } ${activeSlot === slot.id ? "ring-2 ring-primary" : ""}`}
                  style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}
                >
                  <span className="block font-semibold">{slot.position}</span>
                  <span className="block truncate">
                    {row ? row.player.name.split(" ").slice(-1)[0] : "Tom"}
                  </span>
                  {row?.current?.overall != null && (
                    <span className="block text-primary">{row.current.overall}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-primary" /> Naturlig
            </span>
            <span className="flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-amber-400" /> Kan spille
            </span>
            <span className="flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-destructive" /> Ude af position
            </span>
          </div>

          {activeSlot && (
            <SlotPicker
              slotPosition={shape.slots.find((slot) => slot.id === activeSlot)!.position}
              rows={rows}
              usedIds={usedIds}
              selectedId={lineup[activeSlot] ?? null}
              onPick={(playerId) => assign(activeSlot, playerId)}
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Taktikindstillinger
            </h3>
            {TACTIC_SETTINGS.map((item) => (
              <div key={item.key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{item.label}</label>
                <Select
                  value={settings[item.key] ?? item.options[0]!}
                  onValueChange={(value) =>
                    setSettings((prev) => ({ ...prev, [item.key]: value }))
                  }
                >
                  <SelectTrigger aria-label={item.label}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {item.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </Card>

          <Card className="space-y-2 p-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Noter
            </h3>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="F.eks. instruktioner til kanterne, dødboldtagere…"
              rows={4}
            />
          </Card>

          <Card className="p-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Bænk og resten af truppen
            </h3>
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-sm">
              {bench.map((row) => (
                <li key={row.player.id} className="flex justify-between gap-2">
                  <span className="truncate">{row.player.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {row.position ?? "–"} · {row.current?.overall ?? "–"}
                  </span>
                </li>
              ))}
              {bench.length === 0 && (
                <li className="text-muted-foreground">Alle spillere er i startopstillingen.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SlotPicker({
  slotPosition,
  rows,
  usedIds,
  selectedId,
  onPick,
}: {
  slotPosition: string;
  rows: SquadRow[];
  usedIds: Set<string>;
  selectedId: string | null;
  onPick: (playerId: string | null) => void;
}) {
  const sorted = [...rows].sort((a, b) => {
    const fitA = positionFit(slotPosition, a.position);
    const fitB = positionFit(slotPosition, b.position);
    const rank = { natural: 0, ok: 1, out: 2 } as const;
    if (rank[fitA] !== rank[fitB]) return rank[fitA] - rank[fitB];
    return (b.current?.overall ?? 0) - (a.current?.overall ?? 0);
  });

  return (
    <div className="mt-4 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">
          Vælg spiller til {POSITION_LABELS[slotPosition] ?? slotPosition} ({slotPosition})
        </p>
        {selectedId && (
          <Button variant="ghost" size="sm" onClick={() => onPick(null)}>
            Ryd plads
          </Button>
        )}
      </div>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {sorted.map((row) => {
          const fit = positionFit(slotPosition, row.position);
          return (
            <li key={row.player.id}>
              <button
                type="button"
                onClick={() => onPick(row.player.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60 ${
                  row.player.id === selectedId ? "bg-primary/10" : ""
                }`}
              >
                <span className="truncate">
                  {row.player.name}
                  {usedIds.has(row.player.id) && row.player.id !== selectedId && (
                    <span className="ml-1 text-[11px] text-muted-foreground">(i opstilling)</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.position ?? "–"} · {row.current?.overall ?? "–"} ·{" "}
                  <span
                    className={
                      fit === "natural"
                        ? "text-primary"
                        : fit === "ok"
                          ? "text-amber-400"
                          : "text-destructive"
                    }
                  >
                    {fit === "natural" ? "naturlig" : fit === "ok" ? "ok" : "ude af pos."}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
