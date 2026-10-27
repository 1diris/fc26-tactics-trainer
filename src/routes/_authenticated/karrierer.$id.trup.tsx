import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownWideNarrow, ArrowLeft, ArrowUpNarrowWide, ArrowUpRight, Check, Search, SlidersHorizontal, TriangleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { careerDataQuery } from "@/lib/career-queries";
import {
  buildSquad,
  contractYear,
  seasonStartYear,
  sortedSeasons,
  type SquadRow,
} from "@/lib/squad";
import { POSITION_GROUPS, formatMoney, formatWage } from "@/lib/football";
import { autoMatchSquad } from "@/lib/fc-match.functions";
import { FcMatchDialog } from "@/components/fc-match-dialog";
import { SellPlayerDialog } from "@/components/sell-player-dialog";
import { PlayerAvatar } from "@/components/player-avatar";

export const Route = createFileRoute("/_authenticated/karrierer/$id/trup")({
  head: () => ({
    meta: [
      { title: "Squad — Career Chronicles" },
      {
        name: "description",
        content:
          "Your entire FC 26 squad in one table: overall, potential, age, market value, wage and contract expiry.",
      },
      { property: "og:title", content: "Squad — Career Chronicles" },
      {
        property: "og:description",
        content: "Sort and filter your FC 26 squad by position, age, potential and value.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SquadPage,
});

type SortKey =
  | "name"
  | "position"
  | "overall"
  | "potential"
  | "age"
  | "market_value"
  | "wage"
  | "contract"
  | "status";

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Player" },
  { key: "position", label: "Pos" },
  { key: "overall", label: "OVR", numeric: true },
  { key: "potential", label: "POT", numeric: true },
  { key: "age", label: "Age", numeric: true },
  { key: "market_value", label: "Value", numeric: true },
  { key: "wage", label: "Wage", numeric: true },
  { key: "contract", label: "Contract", numeric: true },
  { key: "status", label: "Status" },
];

/** Group labels in the design language of the dashboard. */
const GROUPS: { key: string; label: string }[] = [
  { key: "alle", label: "All" },
  { key: "Målmand", label: "Goalkeeper" },
  { key: "Forsvar", label: "Defence" },
  { key: "Midtbane", label: "Midfield" },
  { key: "Angreb", label: "Attack" },
];

const GROUP_PILL: Record<string, string> = {
  Målmand: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  Forsvar: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  Midtbane: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  Angreb: "border-red-500/40 bg-red-500/15 text-red-300",
  Ukendt: "border-dash-border bg-dash-elevated text-muted-foreground",
};

function groupOfPosition(position: string | null): string {
  if (!position) return "Ukendt";
  for (const [group, list] of Object.entries(POSITION_GROUPS)) {
    if (list.includes(position)) return group;
  }
  return "Ukendt";
}

function groupLabel(group: string): string {
  return GROUPS.find((entry) => entry.key === group)?.label ?? "Unknown";
}

/** Rating badge: green >= 80, amber 70-79, red below 70. */
function ratingClass(value: number | null | undefined): string {
  if (value == null) return "border-dash-border bg-dash-elevated text-muted-foreground";
  if (value >= 80) return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (value >= 70) return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  return "border-red-500/40 bg-red-500/15 text-red-300";
}

function RatingBadge({ value, large }: { value: number | null | undefined; large?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-stat tabular-nums ${
        large ? "min-w-14 px-3 py-1.5 text-xl" : "min-w-10 px-2 py-0.5 text-sm"
      } ${ratingClass(value)}`}
    >
      {value ?? "–"}
    </span>
  );
}

function PositionPill({ position }: { position: string | null }) {
  const group = groupOfPosition(position);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${GROUP_PILL[group]}`}
    >
      {position ?? "–"}
    </span>
  );
}

function StatusBadge({ row }: { row: SquadRow }) {
  return row.fc ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
      <Check className="h-3 w-3" /> Matched
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
      <TriangleAlert className="h-3 w-3" /> Unmatched
    </span>
  );
}

type ContractStatus = { label: string; tone: "danger" | "warn" | "muted" };

function contractStatus(row: SquadRow, seasonLabel: string | null): ContractStatus | null {
  const year = contractYear(row.current?.contract_until);
  if (year === null) return null;
  const startYear = seasonLabel ? seasonStartYear(seasonLabel) : null;
  if (startYear === null) return { label: String(year), tone: "muted" };
  if (year <= startYear) return { label: `${year} · expiring`, tone: "danger" };
  if (year <= startYear + 1) return { label: `${year} · soon`, tone: "warn" };
  return { label: String(year), tone: "muted" };
}

const contractTone: Record<ContractStatus["tone"], string> = {
  danger: "text-red-400",
  warn: "text-amber-400",
  muted: "text-muted-foreground",
};

function sortValue(row: SquadRow, key: SortKey): string | number | null {
  switch (key) {
    case "name":
      return row.player.name.toLowerCase();
    case "position":
      return row.position ?? "";
    case "status":
      return row.fc ? 1 : 0;
    case "contract":
      return contractYear(row.current?.contract_until);
    case "potential":
      return row.potential;
    case "market_value":
      return row.estimatedValue;
    default:
      return row.current?.[key] ?? null;
  }
}

function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function SquadPage() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/trup" });
  const { data } = useSuspenseQuery(careerDataQuery(id));
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("alle");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [ovrMin, setOvrMin] = useState("");
  const [ovrMax, setOvrMax] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [asc, setAsc] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matchTarget, setMatchTarget] = useState<SquadRow | null>(null);
  const [sellTarget, setSellTarget] = useState<SquadRow | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryClient = useQueryClient();
  const runAutoMatch = useServerFn(autoMatchSquad);

  const autoMatch = useMutation({
    mutationFn: () => runAutoMatch({ data: { careerId: id } }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["career", id] });
      if (result.checked === 0) toast.success("All players are already matched.");
      else
        toast.success(
          `${result.matched} of ${result.checked} players matched automatically.` +
            (result.remaining > 0 ? ` ${result.remaining} need to be matched manually.` : ""),
        );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const seasons = sortedSeasons(data.seasons);
  const activeSeason =
    seasons.find((season) => season.id === data.career.current_season_id) ?? seasons[0];

  const all = useMemo(
    () =>
      buildSquad(
        data.seasons,
        data.players,
        data.snapshots,
        activeSeason?.id ?? null,
        data.fcPlayers,
      ).filter((row) => row.current !== null),
    [data, activeSeason?.id],
  );

  const ageRangeInvalid =
    toNumber(ageMin) !== null && toNumber(ageMax) !== null && toNumber(ageMin)! > toNumber(ageMax)!;
  const ovrRangeInvalid =
    toNumber(ovrMin) !== null && toNumber(ovrMax) !== null && toNumber(ovrMin)! > toNumber(ovrMax)!;

  const rows = useMemo(() => {
    const minAge = toNumber(ageMin);
    const maxAge = toNumber(ageMax);
    const minOvr = toNumber(ovrMin);
    const maxOvr = toNumber(ovrMax);

    const filtered = all.filter((row) => {
      const matchesSearch = row.player.name.toLowerCase().includes(search.trim().toLowerCase());
      const groupPositions = group === "alle" ? null : POSITION_GROUPS[group];
      const matchesGroup =
        !groupPositions || (row.position ? groupPositions.includes(row.position) : false);
      const age = row.current?.age ?? null;
      const matchesAge =
        (minAge === null || (age !== null && age >= minAge)) &&
        (maxAge === null || (age !== null && age <= maxAge));
      const overall = row.current?.overall ?? null;
      const matchesOvr =
        (minOvr === null || (overall !== null && overall >= minOvr)) &&
        (maxOvr === null || (overall !== null && overall <= maxOvr));
      return matchesSearch && matchesGroup && matchesAge && matchesOvr;
    });

    return filtered.sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      const result = left < right ? -1 : left > right ? 1 : 0;
      return asc ? result : -result;
    });
  }, [all, search, group, ageMin, ageMax, ovrMin, ovrMax, sortKey, asc]);

  const selected = useMemo(
    () => all.find((row) => row.player.id === selectedId) ?? null,
    [all, selectedId],
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(key === "name" || key === "position" || key === "age");
    }
  };

  const changeSort = (key: SortKey) => {
    setSortKey(key);
    setAsc(key === "name" || key === "position" || key === "age");
  };

  function resetFilters() {
    setSearch("");
    setGroup("alle");
    setAgeMin("");
    setAgeMax("");
    setOvrMin("");
    setOvrMax("");
  }

  if (selected) {
    return (
      <>
        <PlayerDetailPanel
          careerId={id}
          row={selected}
          seasonLabel={activeSeason?.label ?? null}
          onBack={() => setSelectedId(null)}
          onMatch={() => setMatchTarget(selected)}
          onSell={() => setSellTarget(selected)}
        />
        <Dialogs
          careerId={id}
          data={data}
          matchTarget={matchTarget}
          setMatchTarget={setMatchTarget}
          sellTarget={sellTarget}
          setSellTarget={setSellTarget}
        />
      </>
    );
  }

  const avg = (values: (number | null | undefined)[]) => {
    const list = values.filter((v): v is number => typeof v === "number");
    return list.length ? (list.reduce((s, v) => s + v, 0) / list.length).toFixed(1) : "–";
  };
  const avgOvr = avg(all.map((r) => r.current?.overall));
  const avgPot = avg(all.map((r) => r.potential));
  const topOvr = Math.max(0, ...all.map((r) => r.current?.overall ?? 0));
  const startYear = activeSeason?.label ? seasonStartYear(activeSeason.label) : null;

  const LINE_GROUPS: { key: string; label: string }[] = [
    { key: "Målmand", label: "Goalkeepers" },
    { key: "Forsvar", label: "Defenders" },
    { key: "Midtbane", label: "Midfielders" },
    { key: "Angreb", label: "Attackers" },
    { key: "Ukendt", label: "Unknown" },
  ];
  const grouped = LINE_GROUPS.map((g) => ({
    ...g,
    rows: rows.filter((r) => groupOfPosition(r.position) === g.key),
  })).filter((g) => g.rows.length > 0);

  const SEGMENTS = [
    { key: "alle", label: "All" },
    { key: "Målmand", label: "GK" },
    { key: "Forsvar", label: "DEF" },
    { key: "Midtbane", label: "MID" },
    { key: "Angreb", label: "ATT" },
  ];
  const tableCols: { key: SortKey; label: string }[] = [
    { key: "name", label: "Player" },
    { key: "age", label: "Age" },
    { key: "overall", label: "OVR" },
    { key: "potential", label: "POT" },
    { key: "market_value", label: "Value" },
    { key: "wage", label: "Wage/wk" },
    { key: "contract", label: "Contract" },
  ];
  const smallInput =
    "h-10 rounded-[10px] border border-ov-border bg-ov-bg px-3 text-sm text-ov-text placeholder:text-ov-muted outline-none focus:border-ov-control";

  return (
    <div className="space-y-6 pb-20 font-body text-ov-text">
      <div>
        <h1 className="font-tight text-[32px] font-bold leading-tight tracking-[-0.03em]">Squad</h1>
        <p className="mt-1 text-sm text-ov-muted">
          {all.length} players · Avg. OVR {avgOvr} · Avg. POT {avgPot}
        </p>
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ov-muted" />
            <input
              placeholder="Search player…"
              value={search}
              aria-label="Search player"
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-xl border border-ov-border bg-ov-card pl-10 pr-3 text-sm text-ov-text placeholder:text-ov-muted outline-none focus:border-ov-control"
            />
          </div>
          <div className="flex h-11 items-center rounded-xl border border-ov-border bg-ov-card p-1">
            {SEGMENTS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setGroup(entry.key)}
                className={`h-full rounded-lg px-3 text-sm font-medium transition ${
                  group === entry.key ? "bg-[#1f1f1f] text-ov-text" : "text-ov-muted hover:text-ov-text"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="squad-sort" className="text-sm text-ov-muted">
              Sort
            </label>
            <select
              id="squad-sort"
              value={sortKey}
              onChange={(event) => changeSort(event.target.value as SortKey)}
              className="h-11 rounded-xl border border-ov-border bg-ov-card px-3 text-sm text-ov-text"
            >
              <option value="overall">OVR</option>
              <option value="potential">POT</option>
              <option value="age">Age</option>
              <option value="market_value">Value</option>
              <option value="contract">Contract</option>
              {!["overall", "potential", "age", "market_value", "contract"].includes(sortKey) && (
                <option value={sortKey}>{tableCols.find((c) => c.key === sortKey)?.label ?? sortKey}</option>
              )}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-ov-control px-3 text-sm text-ov-text"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>

        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ov-border bg-ov-card p-4">
            {[
              ["Age min", ageMin, setAgeMin, ageRangeInvalid],
              ["Age max", ageMax, setAgeMax, ageRangeInvalid],
              ["OVR min", ovrMin, setOvrMin, ovrRangeInvalid],
              ["OVR max", ovrMax, setOvrMax, ovrRangeInvalid],
            ].map(([label, value, setter, invalid]) => (
              <input
                key={label as string}
                inputMode="numeric"
                placeholder={label as string}
                aria-label={label as string}
                value={value as string}
                onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                className={`${smallInput} w-24 ${invalid ? "border-destructive" : ""}`}
              />
            ))}
            <button
              type="button"
              onClick={() => setAsc(!asc)}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-ov-control px-3 text-sm"
            >
              {asc ? <ArrowUpNarrowWide className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
              {asc ? "Low → High" : "High → Low"}
            </button>
            <button
              type="button"
              onClick={() => autoMatch.mutate()}
              disabled={autoMatch.isPending}
              className="h-10 rounded-[10px] border border-ov-control px-3 text-sm disabled:opacity-50"
            >
              {autoMatch.isPending ? "Matching…" : "Auto-match squad"}
            </button>
            <button type="button" onClick={resetFilters} className="h-10 px-3 text-sm text-ov-muted hover:text-ov-text">
              Reset
            </button>
            {(ageRangeInvalid || ovrRangeInvalid) && (
              <span className="text-xs text-red-400">Min cannot be higher than max.</span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ov-border bg-ov-card">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ov-muted">No players match the filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-ov-line text-xs text-ov-muted">
                  {tableCols.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={`px-5 py-3 font-medium ${column.key === "name" ? "text-left" : "text-right"}`}
                    >
                      <button type="button" className="hover:text-ov-text" onClick={() => toggleSort(column.key)}>
                        {column.label}
                        {sortKey === column.key ? (asc ? " ↑" : " ↓") : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              {grouped.map((g) => (
                <tbody key={g.key}>
                  <tr>
                    <td colSpan={7} className="px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ov-muted">
                      {g.label}
                    </td>
                  </tr>
                  {g.rows.map((row) => {
                    const ovr = row.current?.overall ?? null;
                    const pot = row.potential;
                    const year = contractYear(row.current?.contract_until);
                    const expiring = year !== null && startYear !== null && year <= startYear;
                    return (
                      <tr
                        key={row.player.id}
                        onClick={() => setSelectedId(row.player.id)}
                        className="cursor-pointer border-t border-[#141414] hover:bg-[#111111]"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-medium">{row.player.name}</span>
                            <span className="rounded-md border border-ov-control px-1.5 py-0.5 text-[11px] text-ov-muted">
                              {row.position ?? "–"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-ov-muted">{row.current?.age ?? "–"}</td>
                        <td
                          className={`px-5 py-3 text-right font-tight text-[17px] font-semibold tabular-nums ${
                            ovr !== null && ovr === topOvr ? "text-ov-accent" : ""
                          }`}
                        >
                          {ovr ?? "–"}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {pot == null ? (
                            <span className="text-ov-muted">–</span>
                          ) : ovr !== null && pot > ovr ? (
                            <span className="inline-flex items-center gap-0.5 text-ov-accent">
                              {pot}
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="text-ov-muted">{pot}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">{formatMoney(row.estimatedValue)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-ov-muted">{formatWage(row.current?.wage)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-ov-muted">
                          <span className="inline-flex items-center gap-2">
                            {expiring && <span className="h-1.5 w-1.5 rounded-full bg-ov-warn" />}
                            {year ?? row.current?.contract_until ?? "–"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ov-line px-5 py-3 text-xs text-ov-muted">
          <span>
            Showing {rows.length} of {all.length} players
          </span>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ov-warn" /> Contract expires this season
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-ov-accent" /> Room to grow
            </span>
          </div>
        </div>
      </div>

      <Dialogs
        careerId={id}
        data={data}
        matchTarget={matchTarget}
        setMatchTarget={setMatchTarget}
        sellTarget={sellTarget}
        setSellTarget={setSellTarget}
      />
    </div>
  );
}

function PlayerDetailPanel({
  careerId,
  row,
  seasonLabel,
  onBack,
  onMatch,
  onSell,
}: {
  careerId: string;
  row: SquadRow;
  seasonLabel: string | null;
  onBack: () => void;
  onMatch: () => void;
  onSell: () => void;
}) {
  const contract = contractStatus(row, seasonLabel);
  const originalOvr = row.fc?.overall ?? null;
  const currentOvr = row.current?.overall ?? null;
  const growth = originalOvr !== null && currentOvr !== null ? currentOvr - originalOvr : null;

  const stats: { label: string; value: React.ReactNode }[] = [
    { label: "OVR", value: currentOvr ?? "–" },
    { label: "POT", value: row.potential ?? "–" },
    { label: "Age", value: row.current?.age ?? "–" },
    { label: "Value", value: formatMoney(row.estimatedValue) },
    { label: "Wage", value: formatWage(row.current?.wage) },
    { label: "Contract", value: contract?.label ?? row.current?.contract_until ?? "–" },
    { label: "Group", value: groupLabel(groupOfPosition(row.position)) },
  ];

  return (
    <div className="space-y-4 pb-20 font-body">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to squad
      </button>

      <div className="rounded-xl border border-dash-border bg-dash-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4">
          <PlayerAvatar name={row.player.name} src={row.fc?.face_url} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">{row.player.name}</h1>
            <div className="mt-1.5 flex items-center gap-1.5">
              <PositionPill position={row.position} />
              <StatusBadge row={row} />
            </div>
          </div>
          <RatingBadge value={currentOvr} large />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-dash-border bg-dash-elevated px-3 py-2"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="mt-1 font-stat text-base tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border border-dash-border bg-dash-card p-4 sm:p-5">
        <h2 className="font-display text-lg font-bold tracking-tight">Career development</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-stat text-muted-foreground">
            FC 26 start {originalOvr ?? "–"}
          </span>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-stat">Career now {currentOvr ?? "–"}</span>
          {growth !== null && growth !== 0 && (
            <span
              className={`font-stat font-semibold ${growth > 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {growth > 0 ? "+" : ""}
              {growth}
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {row.fc ? (
            <span className="text-xs text-muted-foreground">
              Matched with {row.fc.short_name} ({row.fc.overall}/{row.fc.potential})
            </span>
          ) : (
            <span className="text-xs text-amber-400">No FC 26 match yet.</span>
          )}
          <Button variant="secondary" size="sm" onClick={onMatch}>
            {row.fc ? "Change match" : "Match player"}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/karrierer/$id/spiller/$playerId"
              params={{ id: careerId, playerId: row.player.id }}
            >
              Full profile
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={onSell}
          >
            Sell player
          </Button>
        </div>
      </div>
    </div>
  );
}

function Dialogs({
  careerId,
  data,
  matchTarget,
  setMatchTarget,
  sellTarget,
  setSellTarget,
}: {
  careerId: string;
  data: { career: { transfer_budget: number | string | null } };
  matchTarget: SquadRow | null;
  setMatchTarget: (row: SquadRow | null) => void;
  sellTarget: SquadRow | null;
  setSellTarget: (row: SquadRow | null) => void;
}) {
  return (
    <>
      {matchTarget && (
        <FcMatchDialog
          careerId={careerId}
          playerId={matchTarget.player.id}
          playerName={matchTarget.player.name}
          currentMatch={matchTarget.fc}
          open
          onOpenChange={(next) => {
            if (!next) setMatchTarget(null);
          }}
        />
      )}

      <SellPlayerDialog
        careerId={careerId}
        playerId={sellTarget?.player.id ?? null}
        playerName={sellTarget?.player.name ?? null}
        suggestedFee={sellTarget?.estimatedValue ?? null}
        budget={data.career.transfer_budget == null ? null : Number(data.career.transfer_budget)}
        onOpenChange={(next) => {
          if (!next) setSellTarget(null);
        }}
      />
    </>
  );
}
