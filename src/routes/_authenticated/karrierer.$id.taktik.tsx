import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Download, Shield, Sparkles, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PitchView, type PitchNode } from "@/components/tactics/pitch-view";
import { PlayerAvatar } from "@/components/player-avatar";
import { careerDataQuery } from "@/lib/career-queries";
import { getTactic, saveTactic } from "@/lib/tactics.functions";
import { buildSquad, sortedSeasons, type SquadRow } from "@/lib/squad";
import {
  FORMATIONS,
  TACTIC_SETTING_GROUPS,
  defaultSettings,
  findFormation,
  positionFit,
  type TacticSettings,
} from "@/lib/formations";
import {
  findRole,
  normalizeRoles,
  roleHint,
  rolesFor,
  type RoleFocus,
  type RoleMastery,
  type SlotRole,
} from "@/lib/roles";
import { decodeTactic, encodeTactic } from "@/lib/tactic-code";
import { suggestLineup, type LineupSuggestion } from "@/lib/lineup";

export const Route = createFileRoute("/_authenticated/karrierer/$id/taktik")({
  component: TacticsPage,
});

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
  const [roles, setRoles] = useState<Record<string, SlotRole>>({});
  const [notes, setNotes] = useState("");
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<LineupSuggestion | null>(null);
  const [tab, setTab] = useState("team");
  const [importCode, setImportCode] = useState("");

  useEffect(() => {
    const tactic = tacticQuery.data;
    if (!tactic) return;
    const stored = (tactic.settings as (TacticSettings & { roles?: unknown }) | null) ?? {};
    const { roles: storedRoles, ...rest } = stored as Record<string, unknown>;
    setFormation(tactic.formation);
    setLineup((tactic.lineup as Record<string, string | null>) ?? {});
    setSettings({ ...defaultSettings(), ...(rest as TacticSettings) });
    setRoles(
      normalizeRoles(
        findFormation(tactic.formation).slots,
        (storedRoles as Record<string, SlotRole> | undefined) ?? null,
      ),
    );
    setNotes(tactic.notes ?? "");
  }, [tacticQuery.data]);

  const rows = useMemo(
    () => buildSquad(data.seasons, data.players, data.snapshots, seasonId, data.fcPlayers),
    [data, seasonId],
  );
  const rowById = useMemo(() => new Map(rows.map((row) => [row.player.id, row])), [rows]);

  const shape = findFormation(formation);
  const usedIds = new Set(Object.values(lineup).filter(Boolean) as string[]);

  useEffect(() => {
    setRoles((prev) => normalizeRoles(shape.slots, prev));
  }, [formation]);

  const saveMutation = useMutation({
    mutationFn: () =>
      persist({
        data: {
          careerId: id,
          seasonId,
          formation,
          lineup,
          settings,
          roles,
          notes: notes.trim() ? notes.trim() : null,
        },
      }),
    onSuccess: () => {
      toast.success("Taktik gemt");
      queryClient.invalidateQueries({ queryKey: ["tactic", id, seasonId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function coveredPositions(row: SquadRow | null | undefined): string[] {
    if (!row) return [];
    const list = new Set<string>();
    if (row.position) list.add(row.position);
    for (const position of row.fc?.positions ?? []) list.add(position.trim().toUpperCase());
    return [...list];
  }

  const hints = shape.slots
    .map((slot) => {
      const row = lineup[slot.id] ? rowById.get(lineup[slot.id]!) : null;
      if (!row) return null;
      const hint = roleHint(slot.position, roles[slot.id], coveredPositions(row));
      return hint ? `${slot.position} – ${row.player.name}: ${hint}` : null;
    })
    .filter((value): value is string => Boolean(value));

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
  }

  function setSlotRole(slotId: string, position: string, roleId: string) {
    const found = findRole(position, roleId);
    if (!found) return;
    setRoles((prev) => ({
      ...prev,
      [slotId]: {
        role: found.id,
        focus: found.focuses.includes(prev[slotId]?.focus as RoleFocus)
          ? prev[slotId]!.focus
          : found.focuses.includes("Balanceret")
            ? "Balanceret"
            : found.focuses[0]!,
        mastery: prev[slotId]?.mastery ?? "base",
      },
    }));
  }

  function setSlotFocus(slotId: string, focus: RoleFocus) {
    setRoles((prev) => {
      const current = prev[slotId];
      if (!current) return prev;
      return { ...prev, [slotId]: { ...current, focus } };
    });
  }

  function setSlotMastery(slotId: string, mastery: RoleMastery) {
    setRoles((prev) => {
      const current = prev[slotId];
      if (!current) return prev;
      return { ...prev, [slotId]: { ...current, mastery } };
    });
  }

  function autoFill() {
    const result = suggestLineup(shape, rows);
    setLineup(result.lineup);
    setRoles((prev) => normalizeRoles(shape.slots, { ...result.roles, ...prev }));
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

  const filled = shape.slots.filter((slot) => lineup[slot.id]).length;

  function numValue(key: string, fallback: number) {
    const raw = Number(settings[key]);
    return Number.isFinite(raw) ? raw : fallback;
  }

  const bench = rows
    .filter((row) => !usedIds.has(row.player.id))
    .sort((a, b) => (b.current?.overall ?? 0) - (a.current?.overall ?? 0));

  const nodes: PitchNode[] = shape.slots.map((slot) => {
    const row = lineup[slot.id] ? rowById.get(lineup[slot.id]!) : undefined;
    return {
      id: slot.id,
      position: slot.position,
      x: slot.x,
      y: slot.y,
      playerName: row ? (row.player.name.split(" ").slice(-1)[0] ?? row.player.name) : null,
      playerFullName: row?.player.name ?? null,
      faceUrl: row?.fc?.face_url ?? null,
      overall: row?.current?.overall ?? null,
      roleLabel: findRole(slot.position, roles[slot.id]?.role)?.label ?? "—",
      mastery: roles[slot.id]?.mastery ?? "base",
      fit: row ? positionFit(slot.position, row.position) : null,
    };
  });

  const code = encodeTactic({ formation, lineup, roles, settings });
  const masteryCount = shape.slots.filter(
    (slot) => (roles[slot.id]?.mastery ?? "base") !== "base",
  ).length;
  const activeSlotShape = activeSlot ? shape.slots.find((slot) => slot.id === activeSlot) : null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Taktikkode kopieret");
    } catch {
      toast.error("Kunne ikke kopiere koden");
    }
  }

  function importTactic() {
    const parsed = decodeTactic(importCode);
    if (!parsed) {
      toast.error("Ugyldig taktikkode");
      return;
    }
    const nextShape = findFormation(parsed.formation);
    setFormation(nextShape.name);
    setLineup(parsed.lineup);
    setRoles(normalizeRoles(nextShape.slots, parsed.roles));
    setSettings({ ...defaultSettings(), ...parsed.settings });
    setSuggestion(null);
    setImportCode("");
    setTab("team");
    toast.success(`Taktik importeret (${nextShape.name})`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">
            <Sparkles className="h-3.5 w-3.5" /> FC IQ
          </p>
          <h2 className="font-display text-xl font-bold">Taktik</h2>
          <p className="text-sm text-muted-foreground">
            Byg din opstilling, giv hver plads en rolle og gem taktikken.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={autoFill} disabled={rows.length === 0}>
            Foreslå opstilling
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Gemmer…" : "Gem taktik"}
          </Button>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
          Importér din trup først, så kan du placere spillerne på banen.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <Users className="h-4 w-4 text-lime-400" /> Opstilling
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5">
                  {formation}
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5">
                  Snit OVR <strong className="text-lime-400">{avgOvr ?? "–"}</strong>
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5">
                  <Shield className="mr-1 inline h-3 w-3" /> Besat {filled}/11
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-0.5">
                  <Target className="mr-1 inline h-3 w-3" /> Ude af pos. {outOfPosition}
                </span>
              </div>
            </div>

            <PitchView
              nodes={nodes}
              selectedId={activeSlot}
              onSelect={(slotId) => {
                setActiveSlot(slotId);
                setTab("player");
              }}
            />

            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-lime-400" /> Naturlig
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-amber-400" /> Kan spille
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-red-500" /> Ude af position
              </span>
              <span className="ml-auto">Klik på en plads for at redigere</span>
            </div>

            {hints.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] text-zinc-300">
                {hints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            )}
          </div>

          {suggestion && (
            <div className="mt-4 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm font-semibold text-zinc-100">
                    Anbefalet start-11 ({shape.name})
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Din stærkeste opstilling baseret på den nuværende trup.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSuggestion(null)}>
                  Skjul
                </Button>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                <span>
                  Samlet OVR: <strong className="text-zinc-100">{suggestion.totalOvr}</strong>
                </span>
                <span>
                  Snit OVR: <strong className="text-zinc-100">{suggestion.avgOvr ?? "–"}</strong>
                </span>
                <span>
                  Naturlig: <strong className="text-lime-400">{suggestion.naturalCount}</strong>
                </span>
                <span>
                  Sekundær: <strong className="text-amber-400">{suggestion.okCount}</strong>
                </span>
                <span>
                  Ude af position: <strong className="text-red-400">{suggestion.outCount}</strong>
                </span>
              </div>

              {suggestion.reasons.length > 0 && (
                <ul className="list-disc space-y-1 rounded-xl border border-red-500/30 bg-red-500/10 p-3 pl-6 text-xs text-zinc-300">
                  {suggestion.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="lg:col-span-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-3 bg-zinc-950">
                <TabsTrigger value="team">Holdtaktik</TabsTrigger>
                <TabsTrigger value="player">Spillerrolle</TabsTrigger>
                <TabsTrigger value="export">Eksport</TabsTrigger>
              </TabsList>

              <TabsContent value="team" className="mt-4 space-y-5">
                <Field label="Formation">
                  <Select
                    value={formation}
                    onValueChange={(value) => {
                      setFormation(value);
                      setSuggestion(null);
                      setActiveSlot(null);
                    }}
                  >
                    <SelectTrigger className="border-zinc-800 bg-zinc-950" aria-label="Vælg formation">
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
                </Field>

                <Tabs defaultValue="attack">
                  <TabsList className="w-full bg-zinc-950">
                    {TACTIC_SETTING_GROUPS.map((group) => (
                      <TabsTrigger key={group.key} value={group.key} className="flex-1">
                        {group.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {TACTIC_SETTING_GROUPS.map((group) => (
                    <TabsContent key={group.key} value={group.key} className="space-y-4 pt-4">
                      {group.settings.map((item) =>
                        item.kind === "select" ? (
                          <Field key={item.key} label={item.label}>
                            <Select
                              value={String(settings[item.key] ?? item.options[0]!)}
                              onValueChange={(value) =>
                                setSettings((prev) => ({ ...prev, [item.key]: value }))
                              }
                            >
                              <SelectTrigger className="border-zinc-800 bg-zinc-950" aria-label={item.label}>
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
                          </Field>
                        ) : (
                          <Field key={item.key} label={item.label}>
                            <div className="flex items-center gap-3">
                              <Slider
                                aria-label={item.label}
                                min={item.min}
                                max={item.max}
                                step={item.step}
                                value={[numValue(item.key, item.defaultValue)]}
                                onValueChange={([value]) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    [item.key]: value ?? item.defaultValue,
                                  }))
                                }
                              />
                              <span className="w-8 text-right text-sm font-semibold text-lime-400">
                                {numValue(item.key, item.defaultValue)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px] text-zinc-500">
                              <span>{item.minLabel}</span>
                              <span>{item.maxLabel}</span>
                            </div>
                          </Field>
                        ),
                      )}
                    </TabsContent>
                  ))}
                </Tabs>

                <Field label="Noter">
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="F.eks. instruktioner til kanterne, dødboldtagere…"
                    rows={3}
                    className="border-zinc-800 bg-zinc-950"
                  />
                </Field>
              </TabsContent>

              <TabsContent value="player" className="mt-4 space-y-5">
                {!activeSlotShape ? (
                  <p className="text-sm text-zinc-400">
                    Klik på en plads på banen for at vælge spiller, rolle og fokus.
                  </p>
                ) : (
                  <>
                    <RoleEditor
                      slotPosition={activeSlotShape.position}
                      value={roles[activeSlotShape.id] ?? null}
                      onRoleChange={(roleId) =>
                        setSlotRole(activeSlotShape.id, activeSlotShape.position, roleId)
                      }
                      onFocusChange={(focus) => setSlotFocus(activeSlotShape.id, focus)}
                      onMasteryChange={(mastery) => setSlotMastery(activeSlotShape.id, mastery)}
                    />
                    <SlotPicker
                      slotPosition={activeSlotShape.position}
                      rows={rows}
                      usedIds={usedIds}
                      selectedId={lineup[activeSlotShape.id] ?? null}
                      onPick={(playerId) => assign(activeSlotShape.id, playerId)}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="export" className="mt-4 space-y-5">
                <Field label="Din taktikkode">
                  <code className="block w-full break-all rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-lime-400">
                    {code}
                  </code>
                </Field>

                <Button
                  className="w-full bg-lime-500 text-zinc-950 hover:bg-lime-400"
                  onClick={copyCode}
                >
                  <Copy className="mr-2 h-4 w-4" /> Kopiér taktikkode
                </Button>

                <Field label="Importér taktikkode">
                  <div className="flex gap-2">
                    <Input
                      value={importCode}
                      onChange={(event) => setImportCode(event.target.value)}
                      placeholder="fc26-…"
                      className="border-zinc-800 bg-zinc-950"
                    />
                    <Button
                      variant="outline"
                      className="border-zinc-800 bg-zinc-950"
                      onClick={importTactic}
                    >
                      <Download className="mr-2 h-4 w-4" /> Importér
                    </Button>
                  </div>
                </Field>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                  <p className="mb-2 font-medium text-zinc-200">Opsummering</p>
                  <ul className="space-y-1">
                    <li>Formation: {formation}</li>
                    <li>Besatte pladser: {filled}/11</li>
                    <li>Roller med mastery: {masteryCount}/11</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="text-sm font-semibold text-zinc-200">Bænk og resten af truppen</h3>
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-sm">
              {bench.map((row) => (
                <li key={row.player.id} className="flex items-center justify-between gap-2 text-zinc-300">
                  <span className="flex min-w-0 items-center gap-2">
                    <PlayerAvatar name={row.player.name} src={row.fc?.face_url} size="sm" />
                    <span className="truncate">{row.player.name}</span>
                  </span>
                  <span className="shrink-0 text-zinc-500">
                    {row.position ?? "–"} · {row.current?.overall ?? "–"}
                  </span>
                </li>
              ))}
              {bench.length === 0 && (
                <li className="text-zinc-500">Alle spillere er i startopstillingen.</li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      {children}
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-200">Vælg spiller til {slotPosition}</p>
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
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-900 ${
                  row.player.id === selectedId ? "bg-lime-500/10" : ""
                }`}
              >
                <span className="truncate">
                  {row.player.name}
                  {usedIds.has(row.player.id) && row.player.id !== selectedId && (
                    <span className="ml-1 text-[11px] text-zinc-500">(i opstilling)</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {row.position ?? "–"} · {row.current?.overall ?? "–"} ·{" "}
                  <span
                    className={
                      fit === "natural"
                        ? "text-lime-400"
                        : fit === "ok"
                          ? "text-amber-400"
                          : "text-red-400"
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

function RoleEditor({
  slotPosition,
  value,
  onRoleChange,
  onFocusChange,
  onMasteryChange,
}: {
  slotPosition: string;
  value: SlotRole | null;
  onRoleChange: (roleId: string) => void;
  onFocusChange: (focus: RoleFocus) => void;
  onMasteryChange: (mastery: RoleMastery) => void;
}) {
  const options = rolesFor(slotPosition);
  const active = findRole(slotPosition, value?.role) ?? options[0] ?? null;
  if (!active) return null;
  const allFocuses: RoleFocus[] = ["Forsvar", "Balanceret", "Angreb"];
  const mastery = value?.mastery ?? "base";

  return (
    <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Spillerrolle · {slotPosition}
      </p>

      <Field label="Rolle">
        <Select value={active.id} onValueChange={onRoleChange}>
          <SelectTrigger className="border-zinc-800 bg-zinc-900" aria-label="Vælg rolle">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500">{active.description}</p>
      </Field>

      <Field label="Fokus">
        <div className="grid grid-cols-3 gap-2">
          {allFocuses.map((focus) => {
            const enabled = active.focuses.includes(focus);
            const isActive = (value?.focus ?? active.focuses[0]) === focus;
            return (
              <button
                key={focus}
                type="button"
                disabled={!enabled}
                onClick={() => onFocusChange(focus)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-lime-400 bg-lime-500/15 text-lime-300 ring-1 ring-lime-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
                } ${enabled ? "" : "cursor-not-allowed opacity-35"}`}
              >
                {focus}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Rolle-mastery">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["base", "Standard"],
              ["+", "Rolle (+)"],
              ["++", "Rolle (++)"],
            ] as [RoleMastery, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onMasteryChange(id)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                mastery === id
                  ? "border-lime-400 bg-lime-500/15 text-lime-300 ring-1 ring-lime-400"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}
