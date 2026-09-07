import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowUpRight, Check, TriangleAlert } from "lucide-react";
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
          "Hele din FC 26 trup i én tabel: overall, potentiale, alder, markedsværdi, løn og kontraktudløb.",
      },
      { property: "og:title", content: "Squad — Career Chronicles" },
      {
        property: "og:description",
        content: "Sortér og filtrér din FC 26 trup på position, alder, potentiale og værdi.",
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

  const queryClient = useQueryClient();
  const runAutoMatch = useServerFn(autoMatchSquad);

  const autoMatch = useMutation({
    mutationFn: () => runAutoMatch({ data: { careerId: id } }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["career", id] });
      if (result.checked === 0) toast.success("Alle spillere er allerede matchet.");
      else
        toast.success(
          `${result.matched} af ${result.checked} spillere matchet automatisk.` +
            (result.remaining > 0 ? ` ${result.remaining} skal matches manuelt.` : ""),
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

  return (
    <div className="space-y-4 pb-20 font-body">
      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-dash-border bg-dash-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search player…"
            value={search}
            aria-label="Search player"
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-full sm:w-64"
          />
          <div className="flex flex-wrap gap-1.5">
            {GROUPS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setGroup(entry.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                  group === entry.key
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-dash-border bg-dash-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="numeric"
              placeholder="Age min"
              aria-label="Age minimum"
              value={ageMin}
              onChange={(event) => setAgeMin(event.target.value)}
              className={`h-9 ${ageRangeInvalid ? "border-destructive" : ""}`}
            />
            <Input
              inputMode="numeric"
              placeholder="Age max"
              aria-label="Age maximum"
              value={ageMax}
              onChange={(event) => setAgeMax(event.target.value)}
              className={`h-9 ${ageRangeInvalid ? "border-destructive" : ""}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="numeric"
              placeholder="OVR min"
              aria-label="OVR minimum"
              value={ovrMin}
              onChange={(event) => setOvrMin(event.target.value)}
              className={`h-9 ${ovrRangeInvalid ? "border-destructive" : ""}`}
            />
            <Input
              inputMode="numeric"
              placeholder="OVR max"
              aria-label="OVR maximum"
              value={ovrMax}
              onChange={(event) => setOvrMax(event.target.value)}
              className={`h-9 ${ovrRangeInvalid ? "border-destructive" : ""}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-stat">
            {rows.length} of {all.length} players · {all.filter((row) => row.fc).length}/{all.length}{" "}
            matched
          </span>
          <div className="flex items-center gap-2">
            {(ageRangeInvalid || ovrRangeInvalid) && (
              <span className="text-red-400">Min cannot be higher than max.</span>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => autoMatch.mutate()}
              disabled={autoMatch.isPending}
            >
              {autoMatch.isPending ? "Matching…" : "Auto-match squad"}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-dash-border p-8 text-center text-sm text-muted-foreground">
          No players match the filters.
        </p>
      ) : (
        <>
          {/* Mobile: compact rows */}
          <ul className="space-y-1.5 md:hidden">
            {rows.map((row) => {
              const contract = contractStatus(row, activeSeason?.label ?? null);
              return (
                <li key={row.player.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.player.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-dash-border bg-dash-card px-3 py-2 text-left"
                  >
                    <PlayerAvatar name={row.player.name} src={row.fc?.face_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{row.player.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <PositionPill position={row.position} />
                        <span className={`font-stat text-[11px] ${contract ? contractTone[contract.tone] : "text-muted-foreground"}`}>
                          {contract?.label ?? "–"}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <RatingBadge value={row.current?.overall} />
                      <RatingBadge value={row.potential} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Desktop: compact table */}
          <div className="hidden overflow-x-auto rounded-xl border border-dash-border bg-dash-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dash-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={`px-4 py-2.5 font-semibold ${column.numeric ? "text-right" : "text-left"}`}
                    >
                      <button
                        type="button"
                        className="hover:text-foreground"
                        onClick={() => toggleSort(column.key)}
                      >
                        {column.label}
                        {sortKey === column.key ? (asc ? " ↑" : " ↓") : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const contract = contractStatus(row, activeSeason?.label ?? null);
                  return (
                    <tr
                      key={row.player.id}
                      onClick={() => setSelectedId(row.player.id)}
                      className="cursor-pointer border-b border-dash-border/60 last:border-0 hover:bg-dash-elevated/70"
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <PlayerAvatar name={row.player.name} src={row.fc?.face_url} size="sm" />
                          <span className="font-semibold">{row.player.name}</span>
                          {row.ovrDelta !== null && row.ovrDelta !== 0 && (
                            <span
                              className={`font-stat text-xs ${row.ovrDelta > 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {row.ovrDelta > 0 ? "+" : ""}
                              {row.ovrDelta}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <PositionPill position={row.position} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <RatingBadge value={row.current?.overall} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <RatingBadge value={row.potential} />
                      </td>
                      <td className="px-4 py-2 text-right font-stat tabular-nums">
                        {row.current?.age ?? "–"}
                      </td>
                      <td className="px-4 py-2 text-right font-stat tabular-nums">
                        {formatMoney(row.estimatedValue)}
                      </td>
                      <td className="px-4 py-2 text-right font-stat tabular-nums text-muted-foreground">
                        {formatWage(row.current?.wage)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-stat tabular-nums ${contract ? contractTone[contract.tone] : "text-muted-foreground"}`}
                      >
                        {contract?.label ?? row.current?.contract_until ?? "–"}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge row={row} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

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
