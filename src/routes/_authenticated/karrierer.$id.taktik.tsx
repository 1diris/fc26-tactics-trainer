import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Download, MoreHorizontal, Shield, Target, Users } from "lucide-react";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { PitchView, type PitchNode } from "@/components/tactics/pitch-view";
import { PlayerAvatar } from "@/components/player-avatar";
import { careerDataQuery } from "@/lib/career-queries";
import { deleteTactic, getTactic, listTactics, saveTactic } from "@/lib/tactics.functions";
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
import { lineupAverageAge, lineupLineAverages, suggestLineup, type LineupSuggestion } from "@/lib/lineup";
import { TACTICAL_VISIONS } from "@/lib/tactical-visions";

export const Route = createFileRoute("/_authenticated/karrierer/$id/taktik")({
  head: () => ({ meta: [{ title: "Tactics — Career Chronicles" }, { name: "description", content: "Build and save your Career Mode formations, player roles and team tactics." }, { property: "og:title", content: "Tactics — Career Chronicles" }, { property: "og:description", content: "Plan your lineup and manage team tactics." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: TacticsPage,
});

function TacticsPage() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/taktik" });
  const { data } = useSuspenseQuery(careerDataQuery(id));
  const queryClient = useQueryClient();
  const fetchTactic = useServerFn(getTactic);
  const persist = useServerFn(saveTactic);
  const fetchTacticList = useServerFn(listTactics);
  const removeTactic = useServerFn(deleteTactic);

  const seasons = sortedSeasons(data.seasons);
  const seasonId = data.career.current_season_id ?? seasons[0]?.id ?? null;

  const [tacticName, setTacticName] = useState("Standard");
  const [newName, setNewName] = useState("");
  const [renameName, setRenameName] = useState("");
  const [nameDialog, setNameDialog] = useState<"none" | "new" | "rename">("none");

  const tacticListQuery = useQuery({
    queryKey: ["tactic-list", id, seasonId],
    queryFn: () => fetchTacticList({ data: { careerId: id, seasonId } }),
  });

  const tacticQuery = useQuery({
    queryKey: ["tactic", id, seasonId, tacticName],
    queryFn: () => fetchTactic({ data: { careerId: id, seasonId, name: tacticName } }),
  });

  const [formation, setFormation] = useState("4-3-3");
  const [lineup, setLineup] = useState<Record<string, string | null>>({});
  const [settings, setSettings] = useState<TacticSettings>(() => defaultSettings());
  const [roles, setRoles] = useState<Record<string, SlotRole>>({});
  const [notes, setNotes] = useState("");
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [suggestion, setSuggestion] = useState<LineupSuggestion | null>(null);
  const [tab, setTab] = useState("team");
  const [activeVision, setActiveVision] = useState<string | null>(null);
  const [importCode, setImportCode] = useState("");
  const [benchSearch, setBenchSearch] = useState("");
  const [benchSort, setBenchSort] = useState<"ovr" | "age" | "position" | "name">("ovr");

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

  const tacticList = tacticListQuery.data ?? [];
  const activeTactic = tacticList.find((item) => item.name === tacticName) ?? null;

  function currentPayload(name: string) {
    return {
      careerId: id,
      seasonId,
      name,
      formation,
      lineup,
      settings,
      roles,
      notes: notes.trim() ? notes.trim() : null,
    };
  }

  function refreshTactics() {
    queryClient.invalidateQueries({ queryKey: ["tactic", id, seasonId] });
    queryClient.invalidateQueries({ queryKey: ["tactic-list", id, seasonId] });
  }

  const saveMutation = useMutation({
    mutationFn: () => persist({ data: currentPayload(tacticName) }),
    onSuccess: () => {
      toast.success("Tactics saved");
      refreshTactics();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveAsMutation = useMutation({
    mutationFn: (name: string) => persist({ data: currentPayload(name) }),
    onSuccess: (_result, name) => {
      toast.success(`Saved as "${name}"`);
      setTacticName(name);
      setNameDialog("none");
      setNewName("");
      refreshTactics();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const renameMutation = useMutation({
    mutationFn: async (name: string) => {
      await persist({ data: currentPayload(name) });
      if (activeTactic) await removeTactic({ data: { id: activeTactic.id } });
      return name;
    },
    onSuccess: (name) => {
      toast.success(`Renamed to "${name}"`);
      setTacticName(name);
      setNameDialog("none");
      setRenameName("");
      refreshTactics();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!activeTactic) throw new Error("Nothing to delete");
      await removeTactic({ data: { id: activeTactic.id } });
    },
    onSuccess: () => {
      toast.success("Tactic deleted");
      const next = tacticList.find((item) => item.name !== tacticName);
      setTacticName(next?.name ?? "Standard");
      refreshTactics();
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
      return hint
        ? { slotId: slot.id, text: `${slot.position} – ${row.player.name}: ${hint}` }
        : null;
    })
    .filter((value): value is { slotId: string; text: string } => Boolean(value));

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

  function swapSlotPlayers(sourceSlotId: string, targetSlotId: string) {
    if (sourceSlotId === targetSlotId) return;
    setLineup((prev) => ({
      ...prev,
      [sourceSlotId]: prev[targetSlotId] ?? null,
      [targetSlotId]: prev[sourceSlotId] ?? null,
    }));
  }

  function handleDropOnSlot(
    targetSlotId: string,
    payload: { playerId: string; sourceSlotId: string | null },
  ) {
    if (payload.sourceSlotId) {
      swapSlotPlayers(payload.sourceSlotId, targetSlotId);
    } else {
      assign(targetSlotId, payload.playerId);
    }
  }

  function handleDropOnBench(event: React.DragEvent) {
    event.preventDefault();
    try {
      const raw = event.dataTransfer.getData("application/json");
      if (!raw) return;
      const payload = JSON.parse(raw) as { playerId: string; sourceSlotId: string | null };
      if (!payload.sourceSlotId) return;
      setLineup((prev) => ({ ...prev, [payload.sourceSlotId!]: null }));
    } catch {
      // Ignore malformed drag payloads.
    }
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
          : found.focuses.includes("Balanced")
            ? "Balanced"
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
    toast.success("Strongest lineup suggested");
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
  const emptySlots = shape.slots.length - filled;
  const lineAverages = lineupLineAverages(shape.slots, lineup, rowById);
  const avgAge = lineupAverageAge(shape.slots, lineup, rowById);

  function numValue(key: string, fallback: number) {
    const raw = Number(settings[key]);
    return Number.isFinite(raw) ? raw : fallback;
  }

  const bench = rows
    .filter((row) => !usedIds.has(row.player.id))
    .sort((a, b) => (b.current?.overall ?? 0) - (a.current?.overall ?? 0));

  const visibleBench = useMemo(() => {
    const query = benchSearch.trim().toLowerCase();
    const filtered = query
      ? bench.filter((row) => row.player.name.toLowerCase().includes(query))
      : bench;
    if (benchSort === "ovr") return filtered;
    return [...filtered].sort((a, b) => {
      if (benchSort === "age") {
        const aAge = a.current?.age ?? Number.POSITIVE_INFINITY;
        const bAge = b.current?.age ?? Number.POSITIVE_INFINITY;
        return aAge - bAge;
      }
      if (benchSort === "position") {
        return (a.position ?? "~").localeCompare(b.position ?? "~");
      }
      return a.player.name.localeCompare(b.player.name);
    });
  }, [bench, benchSearch, benchSort]);

  const nodes: PitchNode[] = shape.slots.map((slot) => {
    const row = lineup[slot.id] ? rowById.get(lineup[slot.id]!) : undefined;
    return {
      id: slot.id,
      position: slot.position,
      x: slot.x,
      y: slot.y,
      playerId: row?.player.id ?? null,
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
      toast.success("Tactic code copied");
    } catch {
      toast.error("Could not copy the code");
    }
  }

  function importTactic() {
    const parsed = decodeTactic(importCode);
    if (!parsed) {
      toast.error("Invalid tactic code");
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
    toast.success(`Tactic imported (${nextShape.name})`);
  }

  // --- Depth chart + recommendation (derived, nothing stored) ---
  const depthRows = shape.slots.map((slot) => {
    const row = lineup[slot.id] ? rowById.get(lineup[slot.id]!) : undefined;
    const backups = bench.filter((b) => positionFit(slot.position, b.position) !== "out").length;
    return { slot, row, ovr: row?.current?.overall ?? null, backups };
  });
  const topXiOvr = Math.max(0, ...depthRows.map((d) => d.ovr ?? 0));
  const filledOvrs = depthRows.map((d) => d.ovr).filter((v): v is number => v !== null);
  const lowestXiOvr = filledOvrs.length ? Math.min(...filledOvrs) : null;
  const weakSlotIds = new Set(
    depthRows
      .filter(
        (d) =>
          d.row &&
          (positionFit(d.slot.position, d.row.position) === "out" ||
            (d.ovr !== null && d.ovr === lowestXiOvr && lowestXiOvr < topXiOvr)),
      )
      .map((d) => d.slot.id),
  );
  const lineName = (pos: string) => {
    if (["RB", "LB", "RWB", "LWB"].includes(pos)) return { plural: "Full backs", short: "full backs" };
    if (pos === "CB") return { plural: "Centre backs", short: "centre backs" };
    if (pos === "GK") return { plural: "Goalkeepers", short: "goalkeepers" };
    if (["CDM", "CM", "CAM"].includes(pos)) return { plural: "Central midfielders", short: "midfielders" };
    if (["RW", "LW", "RM", "LM"].includes(pos)) return { plural: "Wingers", short: "wingers" };
    return { plural: "Strikers", short: "strikers" };
  };
  const recTarget =
    [...depthRows].filter((d) => d.row).sort((a, b) => (a.ovr ?? 0) - (b.ovr ?? 0) || a.backups - b.backups)[0] ??
    null;
  const recLine = recTarget ? lineName(recTarget.slot.position) : null;
  const pitchNodes = nodes.map((n) => ({
    ...n,
    tone: !n.playerId
      ? ("normal" as const)
      : weakSlotIds.has(n.id)
        ? ("weak" as const)
        : n.overall !== null && n.overall === topXiOvr
          ? ("top" as const)
          : ("normal" as const),
  }));
  const PRIORITY = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2"];
  const formationOptions = [
    ...PRIORITY.filter((n) => FORMATIONS.some((f) => f.name === n)),
    ...FORMATIONS.map((f) => f.name).filter((n) => !PRIORITY.includes(n)),
  ];
  const CARD = "rounded-2xl border border-ov-border bg-ov-card p-5";
  const SECONDARY =
    "inline-flex h-10 items-center justify-center rounded-[10px] border border-ov-control px-3 text-sm text-ov-text transition hover:bg-[#111] disabled:opacity-40";
  const PRIMARY =
    "inline-flex h-10 items-center justify-center rounded-[10px] bg-ov-accent px-4 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50";

  return (
    <div className="space-y-6 font-body text-ov-text">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-tight text-[32px] font-bold leading-tight tracking-[-0.03em]">Tactics</h1>
          <p className="mt-1 text-sm text-ov-muted">Best XI picked by OVR from your squad</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ov-muted">Formation</span>
          <Select
            value={formation}
            onValueChange={(value) => {
              setFormation(value);
              setSuggestion(null);
              setActiveSlot(null);
            }}
          >
            <SelectTrigger className="h-10 w-36 rounded-[10px] border-ov-border bg-ov-card" aria-label="Select formation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-ov-border bg-ov-card">
              {formationOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 && (
        <div className={`${CARD} text-sm text-ov-muted`}>
          Import your squad first, then you can place the players on the pitch.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className={CARD}>
          <PitchView
            nodes={pitchNodes}
            selectedId={activeSlot}
            onSelect={(slotId) => {
              setActiveSlot(slotId);
                          }}
            onDropOnSlot={handleDropOnSlot}
          />
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-ov-muted">
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full border-2 border-ov-accent" /> Top rated
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full border-2 border-ov-warn" /> Weak spot
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full border-2 border-[#3a3a3a]" /> Normal
            </span>
            <span className="ml-auto">Click or drag a slot to edit</span>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-ov-border bg-ov-card">
            <h3 className="px-5 pb-3 pt-5 font-tight text-base font-semibold tracking-[-0.03em]">Depth chart</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-y border-ov-line text-xs text-ov-muted">
                    <th className="px-5 py-2.5 text-left font-medium">Pos</th>
                    <th className="px-2 py-2.5 text-left font-medium">Starter</th>
                    <th className="px-2 py-2.5 text-right font-medium">OVR</th>
                    <th className="px-5 py-2.5 text-right font-medium">Backups</th>
                  </tr>
                </thead>
                <tbody>
                  {depthRows.map((d) => (
                    <tr
                      key={d.slot.id}
                      onClick={() => {
                        setActiveSlot(d.slot.id);
                                              }}
                      className="cursor-pointer border-t border-[#141414] first:border-0 hover:bg-[#111]"
                    >
                      <td className="px-5 py-2.5">
                        <span className="rounded-md border border-ov-control px-1.5 py-0.5 text-[11px] text-ov-muted">
                          {d.slot.position}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">{d.row?.player.name ?? <span className="text-ov-muted">Empty</span>}</td>
                      <td
                        className={`px-2 py-2.5 text-right font-tight font-semibold tabular-nums ${
                          d.ovr !== null && d.ovr === topXiOvr ? "text-ov-accent" : ""
                        }`}
                      >
                        {d.ovr ?? "–"}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-ov-muted">
                        <span className="inline-flex items-center gap-2">
                          {d.backups === 0 && <span className="h-1.5 w-1.5 rounded-full bg-ov-warn" />}
                          {d.backups}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {recTarget && recLine && (
            <section className={CARD}>
              <p className="font-tight text-lg font-semibold tracking-[-0.03em]">
                {recLine.plural} are your weak spot
              </p>
              <p className="mt-1.5 text-sm text-ov-muted">
                {recTarget.backups === 0
                  ? `No backup for ${recTarget.slot.position} on the bench — an injury leaves a hole in the XI.`
                  : `${recTarget.row?.player.name} at ${recTarget.slot.position} (${recTarget.ovr ?? "–"} OVR) is among the weakest in your XI with only ${recTarget.backups} backup${recTarget.backups === 1 ? "" : "s"}.`}
              </p>
              <Link
                to="/karrierer/$id/marked"
                params={{ id }}
                search={{ position: recTarget.slot.position } as never}
                className={`${PRIMARY} mt-4`}
              >
                Find {recLine.short}
              </Link>
            </section>
          )}
        </div>
      </div>

      {/* Saved tactics */}
      <div className={`${CARD} flex flex-wrap items-center gap-2`}>
        <Select value={tacticName} onValueChange={setTacticName}>
          <SelectTrigger className="h-10 w-44 rounded-[10px] border-ov-border bg-ov-bg" aria-label="Select tactic">
            <SelectValue placeholder="Standard" />
          </SelectTrigger>
          <SelectContent className="border-ov-border bg-ov-card">
            {(tacticList.length > 0 ? tacticList.map((item) => item.name) : [tacticName]).map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          className={SECONDARY}
          onClick={() => {
            setNewName("");
            setNameDialog("new");
          }}
        >
          Save as new
        </button>
        <button
          type="button"
          className={SECONDARY}
          onClick={() => {
            setRenameName(tacticName);
            setNameDialog("rename");
          }}
          disabled={!activeTactic}
        >
          Rename
        </button>
        <button
          type="button"
          className={SECONDARY}
          onClick={() => deleteMutation.mutate()}
          disabled={!activeTactic || tacticList.length <= 1 || deleteMutation.isPending}
        >
          Delete
        </button>
        <button type="button" className={SECONDARY} onClick={autoFill} disabled={rows.length === 0}>
          Suggest lineup
        </button>
        <button
          type="button"
          className={`${PRIMARY} ml-auto`}
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Saving…" : "Save tactics"}
        </button>

        {nameDialog !== "none" && (
          <div className="flex w-full flex-wrap items-center gap-2 border-t border-ov-line pt-3">
            <span className="text-sm text-ov-muted">
              {nameDialog === "new" ? "Name for the new tactic" : "New name for this tactic"}
            </span>
            <Input
              autoFocus
              value={nameDialog === "new" ? newName : renameName}
              onChange={(event) =>
                nameDialog === "new" ? setNewName(event.target.value) : setRenameName(event.target.value)
              }
              placeholder="e.g. Home – high press"
              className="h-10 w-56 rounded-[10px] border-ov-border bg-ov-bg"
            />
            <button
              type="button"
              className={PRIMARY}
              onClick={() => {
                const value = (nameDialog === "new" ? newName : renameName).trim();
                if (!value) {
                  toast.error("Enter a name");
                  return;
                }
                if (nameDialog === "new") saveAsMutation.mutate(value);
                else renameMutation.mutate(value);
              }}
              disabled={saveAsMutation.isPending || renameMutation.isPending}
            >
              {nameDialog === "new" ? "Save" : "Rename"}
            </button>
            <button type="button" className={SECONDARY} onClick={() => setNameDialog("none")}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-7">
          <div className={CARD}>
            <h3 className="font-tight text-base font-semibold tracking-[-0.03em]">Team overview</h3>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(
                [
                  ["DEFENCE", lineAverages.defense],
                  ["MIDFIELD", lineAverages.midfield],
                  ["ATTACK", lineAverages.attack],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-ov-border bg-ov-bg px-3 py-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ov-muted">{label}</p>
                  <p className="font-tight text-3xl font-bold tracking-[-0.03em]">
                    {typeof value === "number" ? Math.round(value) : "–"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(
                [
                  ["GK", lineAverages.gk],
                  ["Avg OVR", avgOvr],
                  ["Avg age", avgAge],
                  ["Filled", `${filled}/11`],
                  ["Out of pos.", outOfPosition],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-ov-border bg-ov-bg px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-ov-muted">{label}</p>
                  <p className="font-tight text-xl font-semibold">{value ?? "–"}</p>
                </div>
              ))}
            </div>
            {emptySlots > 0 && <p className="mt-3 text-xs text-ov-muted">{emptySlots} empty slot(s)</p>}
            {hints.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-ov-line pt-3 text-xs text-ov-muted">
                {hints.map((hint) => (
                  <li key={hint.slotId} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-warn" />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlot(hint.slotId);
                                              }}
                      className="text-left hover:text-ov-text hover:underline"
                    >
                      {hint.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {suggestion && (
            <div className={`${CARD} space-y-3`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-tight text-base font-semibold">Recommended starting XI ({shape.name})</h3>
                  <p className="text-xs text-ov-muted">Your strongest lineup based on the current squad.</p>
                </div>
                <button type="button" className={SECONDARY} onClick={() => setSuggestion(null)}>
                  Hide
                </button>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-ov-muted">
                <span>Total OVR: <strong className="text-ov-text">{suggestion.totalOvr}</strong></span>
                <span>Avg OVR: <strong className="text-ov-text">{suggestion.avgOvr ?? "–"}</strong></span>
                <span>Natural: <strong className="text-ov-text">{suggestion.naturalCount}</strong></span>
                <span>Secondary: <strong className="text-ov-text">{suggestion.okCount}</strong></span>
                <span>Out of position: <strong className="text-ov-text">{suggestion.outCount}</strong></span>
              </div>
              {suggestion.reasons.length > 0 && (
                <ul className="space-y-1 border-t border-ov-line pt-3 text-xs text-ov-muted">
                  {suggestion.reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ov-warn" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-ov-border bg-ov-card p-4">
            <p className="mb-3 text-xs text-ov-muted">Click a slot on the pitch to edit it.</p>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2 bg-ov-bg">
                <TabsTrigger value="team">Team tactics</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
              </TabsList>

              <TabsContent value="team" className="mt-4 space-y-5">
                <Field label="Tactical Vision">
                  <div className="flex flex-wrap gap-1.5">
                    {TACTICAL_VISIONS.map((vision) => (
                      <button
                        key={vision.id}
                        type="button"
                        title={vision.description}
                        onClick={() => {
                          setSettings(vision.settings);
                          setActiveVision(vision.id);
                        }}
                        className={`rounded-full border border-ov-border bg-ov-bg px-3 py-1.5 text-xs font-medium transition-colors hover:border-ov-control ${
                          activeVision === vision.id
                            ? "text-ov-text ring-1 ring-ov-accent"
                            : "text-ov-text"
                        }`}
                      >
                        {vision.label}
                      </button>
                    ))}
                  </div>
                  {activeVision ? (
                    <p className="text-[11px] leading-snug text-ov-muted">
                      {TACTICAL_VISIONS.find((vision) => vision.id === activeVision)?.description}
                    </p>
                  ) : null}
                </Field>


                <Tabs defaultValue="attack">
                  <TabsList className="w-full bg-ov-bg">
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
                              <SelectTrigger className="border-ov-border bg-ov-bg" aria-label={item.label}>
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
                              <span className="w-8 text-right text-sm font-semibold text-ov-text">
                                {numValue(item.key, item.defaultValue)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px] text-ov-muted">
                              <span>{item.minLabel}</span>
                              <span>{item.maxLabel}</span>
                            </div>
                          </Field>
                        ),
                      )}
                    </TabsContent>
                  ))}
                </Tabs>

                <Field label="Notes">
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="E.g. instructions for wingers, set-piece takers…"
                    rows={3}
                    className="border-ov-border bg-ov-bg"
                  />
                </Field>
              </TabsContent>


              <TabsContent value="export" className="mt-4 space-y-5">
                <Field label="Your tactic code">
                  <code className="block w-full break-all rounded-lg border border-ov-border bg-ov-bg px-3 py-2 font-mono text-xs text-ov-text">
                    {code}
                  </code>
                </Field>

                <Button
                  className="w-full bg-ov-accent text-black hover:opacity-90 rounded-[10px]"
                  onClick={copyCode}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy tactic code
                </Button>

                <Field label="Import tactic code">
                  <div className="flex gap-2">
                    <Input
                      value={importCode}
                      onChange={(event) => setImportCode(event.target.value)}
                      placeholder="fc26-…"
                      className="border-ov-border bg-ov-bg"
                    />
                    <Button
                      variant="outline"
                      className="border-ov-border bg-ov-bg"
                      onClick={importTactic}
                    >
                      <Download className="mr-2 h-4 w-4" /> Import
                    </Button>
                  </div>
                </Field>

                <div className="rounded-xl border border-ov-border bg-ov-bg p-3 text-xs text-ov-muted">
                  <p className="mb-2 font-medium text-ov-text">Summary</p>
                  <ul className="space-y-1">
                    <li>Formation: {formation}</li>
                    <li>Filled slots: {filled}/11</li>
                    <li>Roles with mastery: {masteryCount}/11</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div
            className="rounded-2xl border border-ov-border bg-ov-card p-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropOnBench}
          >
            <h3 className="text-sm font-semibold text-ov-text">Bench and rest of squad</h3>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                value={benchSearch}
                onChange={(event) => setBenchSearch(event.target.value)}
                placeholder="Search players…"
                className="h-9 border-ov-border bg-ov-bg"
              />
              <Select value={benchSort} onValueChange={(value) => setBenchSort(value as typeof benchSort)}>
                <SelectTrigger className="h-9 w-full border-ov-border bg-ov-bg sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-ov-border bg-ov-bg">
                  <SelectItem value="ovr">OVR (highest first)</SelectItem>
                  <SelectItem value="age">Age (youngest first)</SelectItem>
                  <SelectItem value="position">Position (A–Z)</SelectItem>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto text-sm">
              {visibleBench.map((row) => (
                <li
                  key={row.player.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({ playerId: row.player.id, sourceSlotId: null }),
                    );
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  className="flex cursor-grab items-center justify-between gap-2 text-ov-text active:cursor-grabbing"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <PlayerAvatar name={row.player.name} src={row.fc?.face_url} size="sm" />
                    <span className="truncate">{row.player.name}</span>
                  </span>
                  <span className="shrink-0 text-ov-muted">
                    {row.position ?? "–"} · {row.current?.overall ?? "–"}
                  </span>
                </li>
              ))}
              {bench.length === 0 && (
                <li className="text-ov-muted">All players are in the starting lineup.</li>
              )}
              {bench.length > 0 && visibleBench.length === 0 && (
                <li className="text-ov-muted">No players match your search.</li>
              )}
            </ul>
          </div>
        </section>
      </div>

      <Sheet
        open={!!activeSlotShape}
        onOpenChange={(open) => {
          if (!open) setActiveSlot(null);
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "flex max-h-[85vh] flex-col gap-0 rounded-t-2xl border-ov-border bg-ov-card p-0 text-ov-text"
              : "flex w-full flex-col gap-0 border-ov-border bg-ov-card p-0 text-ov-text sm:max-w-[420px]"
          }
        >
          {isMobile && <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-ov-muted/40" />}
          {activeSlotShape && (
            <>
              <SheetHeader className="border-b border-ov-border px-5 py-4 text-left">
                <SheetTitle className="text-ov-text">
                  {activeSlotShape.position}
                  {(() => {
                    const r = rowById.get(lineup[activeSlotShape.id] ?? "");
                    return r ? ` · ${r.player.name}${r.current?.overall != null ? ` (${r.current.overall})` : ""}` : " · Empty";
                  })()}
                </SheetTitle>
                <SheetDescription className="text-ov-muted">Choose player, role and focus.</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
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
              </div>
              <div className="border-t border-ov-border p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
                <Button className="w-full" onClick={() => setActiveSlot(null)}>Done</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ov-muted">{label}</p>
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
    <div className="rounded-xl border border-ov-border bg-ov-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-ov-text">Choose a player for {slotPosition}</p>
        {selectedId && (
          <Button variant="ghost" size="sm" onClick={() => onPick(null)}>
            Clear slot
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
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-ov-text hover:bg-ov-card ${
                  row.player.id === selectedId ? "bg-[#141414]" : ""
                }`}
              >
                <span className="truncate">
                  {row.player.name}
                  {usedIds.has(row.player.id) && row.player.id !== selectedId && (
                    <span className="ml-1 text-[11px] text-ov-muted">(in lineup)</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-ov-muted">
                  {row.position ?? "–"} · {row.current?.overall ?? "–"} ·{" "}
                  <span
                    className={
                      fit === "natural"
                        ? "text-ov-text"
                        : fit === "ok"
                          ? "text-ov-warn"
                          : "text-ov-warn"
                    }
                  >
                    {fit === "natural" ? "natural" : fit === "ok" ? "ok" : "out of pos."}
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
  const allFocuses: RoleFocus[] = ["Defend", "Balanced", "Attack"];
  const mastery = value?.mastery ?? "base";

  return (
    <div className="space-y-4 rounded-xl border border-ov-border bg-ov-bg p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ov-muted">
        Player role · {slotPosition}
      </p>

      <Field label="Role">
        <Select value={active.id} onValueChange={onRoleChange}>
          <SelectTrigger className="border-ov-border bg-ov-card" aria-label="Select role">
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
        <p className="text-xs text-ov-muted">{active.description}</p>
      </Field>

      <Field label="Focus">
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
                    ? "border-ov-text bg-[#1f1f1f] text-ov-text"
                    : "border-ov-border bg-ov-card text-ov-text hover:border-ov-control"
                } ${enabled ? "" : "cursor-not-allowed opacity-35"}`}
              >
                {focus}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Role mastery">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["base", "Standard"],
              ["+", "Role (+)"],
              ["++", "Role (++)"],
            ] as [RoleMastery, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onMasteryChange(id)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                mastery === id
                  ? "border-ov-text bg-[#1f1f1f] text-ov-text"
                  : "border-ov-border bg-ov-card text-ov-text hover:border-ov-control"
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
