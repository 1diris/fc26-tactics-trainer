import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { careerDataQuery } from "@/lib/career-queries";
import {
  buildSquad,
  contractYear,
  seasonStartYear,
  sortedSeasons,
  type SquadRow,
} from "@/lib/squad";
import { POSITION_GROUPS, formatMoney, formatWage, ovrTone } from "@/lib/football";
import { autoMatchSquad } from "@/lib/fc-match.functions";
import { FcMatchDialog } from "@/components/fc-match-dialog";
import { SellPlayerDialog } from "@/components/sell-player-dialog";


export const Route = createFileRoute("/_authenticated/karrierer/$id/trup")({
  head: () => ({
    meta: [
      { title: "Trup — Career Chronicles" },
      {
        name: "description",
        content:
          "Hele din FC 26 trup i én tabel: overall, potentiale, alder, markedsværdi, løn og kontraktudløb.",
      },
      { property: "og:title", content: "Trup — Career Chronicles" },
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
  | "role"
  | "fc";

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Spiller" },
  { key: "position", label: "Pos" },
  { key: "overall", label: "OVR", numeric: true },
  { key: "potential", label: "POT", numeric: true },
  { key: "age", label: "Alder", numeric: true },
  { key: "market_value", label: "Værdi", numeric: true },
  { key: "wage", label: "Løn", numeric: true },
  { key: "contract", label: "Kontrakt", numeric: true },
  { key: "role", label: "Rolle" },
  { key: "fc", label: "FC 26" },
];

const ROLE_KEYS = ["rolle", "role", "squad_role", "truprolle", "position_role"];

/** Reads a squad role from the free-form stats blob, if the import captured one. */
function roleOf(row: SquadRow): string | null {
  const stats = row.current?.stats;
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) return null;
  for (const [key, value] of Object.entries(stats as Record<string, unknown>)) {
    if (!ROLE_KEYS.includes(key.toLowerCase().replace(/\s+/g, "_"))) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

type ContractStatus = {
  label: string;
  tone: "danger" | "warn" | "muted";
};

function contractStatus(row: SquadRow, seasonLabel: string | null): ContractStatus | null {
  const year = contractYear(row.current?.contract_until);
  if (year === null) return null;
  const startYear = seasonLabel ? seasonStartYear(seasonLabel) : null;
  if (startYear === null) return { label: String(year), tone: "muted" };
  if (year <= startYear) return { label: `${year} · udløber nu`, tone: "danger" };
  if (year <= startYear + 1) return { label: `${year} · udløber snart`, tone: "warn" };
  return { label: String(year), tone: "muted" };
}

const contractTone: Record<ContractStatus["tone"], string> = {
  danger: "text-destructive",
  warn: "text-amber-400",
  muted: "text-muted-foreground",
};

function sortValue(row: SquadRow, key: SortKey): string | number | null {
  switch (key) {
    case "name":
      return row.player.name.toLowerCase();
    case "position":
      return row.position ?? "";
    case "role":
      return roleOf(row)?.toLowerCase() ?? null;
    case "contract":
      return contractYear(row.current?.contract_until);
    case "potential":
      return row.potential;
    case "market_value":
      return row.estimatedValue;
    case "fc":
      return row.fc ? row.fc.short_name.toLowerCase() : null;
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
  const [position, setPosition] = useState("alle");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [ovrMin, setOvrMin] = useState("");
  const [ovrMax, setOvrMax] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [asc, setAsc] = useState(false);
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
      buildSquad(data.seasons, data.players, data.snapshots, activeSeason?.id ?? null, data.fcPlayers).filter(
        (row) => row.current !== null,
      ),
    [data, activeSeason?.id],
  );

  const positionOptions = useMemo(
    () =>
      [...new Set(all.map((row) => row.position).filter((value): value is string => !!value))].sort(),
    [all],
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
      const matchesPosition = position === "alle" || row.position === position;
      const age = row.current?.age ?? null;
      const matchesAge =
        (minAge === null || (age !== null && age >= minAge)) &&
        (maxAge === null || (age !== null && age <= maxAge));
      const overall = row.current?.overall ?? null;
      const matchesOvr =
        (minOvr === null || (overall !== null && overall >= minOvr)) &&
        (maxOvr === null || (overall !== null && overall <= maxOvr));
      return matchesSearch && matchesGroup && matchesPosition && matchesAge && matchesOvr;
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
  }, [all, search, group, position, ageMin, ageMax, ovrMin, ovrMax, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(key === "name" || key === "position" || key === "age" || key === "role");
    }
  };

  function resetFilters() {
    setSearch("");
    setGroup("alle");
    setPosition("alle");
    setAgeMin("");
    setAgeMax("");
    setOvrMin("");
    setOvrMax("");
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border border-border/60 bg-card p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Søg spiller…"
            value={search}
            aria-label="Søg spiller"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select value={group} onValueChange={setGroup}>
            <SelectTrigger aria-label="Filtrér på positionsgruppe">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle grupper</SelectItem>
              {Object.keys(POSITION_GROUPS).map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={position} onValueChange={setPosition}>
            <SelectTrigger aria-label="Filtrér på position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle positioner</SelectItem>
              {positionOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="numeric"
              placeholder="Alder min"
              aria-label="Alder minimum"
              value={ageMin}
              onChange={(event) => setAgeMin(event.target.value)}
              className={ageRangeInvalid ? "border-destructive" : undefined}
            />
            <Input
              inputMode="numeric"
              placeholder="Alder max"
              aria-label="Alder maksimum"
              value={ageMax}
              onChange={(event) => setAgeMax(event.target.value)}
              className={ageRangeInvalid ? "border-destructive" : undefined}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="numeric"
              placeholder="OVR min"
              aria-label="OVR minimum"
              value={ovrMin}
              onChange={(event) => setOvrMin(event.target.value)}
              className={ovrRangeInvalid ? "border-destructive" : undefined}
            />
            <Input
              inputMode="numeric"
              placeholder="OVR max"
              aria-label="OVR maksimum"
              value={ovrMax}
              onChange={(event) => setOvrMax(event.target.value)}
              className={ovrRangeInvalid ? "border-destructive" : undefined}
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
              <SelectTrigger aria-label="Sortér efter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column.key} value={column.key}>
                    Sortér: {column.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="icon"
              aria-label={asc ? "Sortér faldende" : "Sortér stigende"}
              onClick={() => setAsc(!asc)}
            >
              {asc ? "↑" : "↓"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {rows.length} af {all.length} spillere · {activeSeason?.label ?? "ingen sæson"} ·{" "}
            {all.filter((row) => row.fc).length}/{all.length} matchet med FC 26
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoMatch.mutate()}
              disabled={autoMatch.isPending}
            >
              {autoMatch.isPending ? "Matcher…" : "Match trup automatisk"}
            </Button>
            {(ageRangeInvalid || ovrRangeInvalid) && (
              <span className="text-xs text-destructive">Min må ikke være større end max.</span>
            )}
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Nulstil filtre
            </Button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Ingen spillere matcher filtrene.
        </p>
      ) : (
        <>
          {/* Mobile: kortliste */}
          <ul className="space-y-2 md:hidden">
            {rows.map((row) => {
              const contract = contractStatus(row, activeSeason?.label ?? null);
              const role = roleOf(row);
              return (
                <li key={row.player.id} className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to="/karrierer/$id/spiller/$playerId"
                        params={{ id, playerId: row.player.id }}
                        className="block truncate font-medium hover:text-primary"
                      >
                        {row.player.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {row.position ?? "–"}
                        {role ? ` · ${role}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`text-lg font-semibold tabular-nums ${ovrTone(row.current?.overall)}`}
                      >
                        {row.current?.overall ?? "–"}
                      </span>
                      {row.ovrDelta !== null && row.ovrDelta !== 0 && (
                        <span
                          className={`ml-1 text-xs tabular-nums ${row.ovrDelta > 0 ? "text-primary" : "text-destructive"}`}
                        >
                          {row.ovrDelta > 0 ? "+" : ""}
                          {row.ovrDelta}
                        </span>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        POT {row.potential ?? "–"}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Alder</dt>
                      <dd className="tabular-nums">{row.current?.age ?? "–"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Værdi (est.)</dt>
                      <dd className="tabular-nums">{formatMoney(row.estimatedValue)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Løn</dt>
                      <dd className="tabular-nums">{formatWage(row.current?.wage)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Kontrakt</dt>
                      <dd className={`tabular-nums ${contract ? contractTone[contract.tone] : ""}`}>
                        {contract?.label ?? row.current?.contract_until ?? "–"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-muted-foreground">
                      {row.fc ? `FC 26: ${row.fc.short_name} (${row.fc.overall}/${row.fc.potential})` : "Ikke matchet med FC 26"}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setMatchTarget(row)}>
                        {row.fc ? "Skift" : "Match"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setSellTarget(row)}
                      >
                        Sælg
                      </Button>
                    </div>
                  </div>

                </li>
              );
            })}
          </ul>

          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={`px-4 py-3 font-medium ${column.numeric ? "text-right" : "text-left"}`}
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
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Handling
                  </th>
                </tr>

              </thead>
              <tbody>
                {rows.map((row) => {
                  const contract = contractStatus(row, activeSeason?.label ?? null);
                  const role = roleOf(row);
                  return (
                    <tr key={row.player.id} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-2.5">
                        <Link
                          to="/karrierer/$id/spiller/$playerId"
                          params={{ id, playerId: row.player.id }}
                          className="font-medium hover:text-primary"
                        >
                          {row.player.name}
                        </Link>
                        {row.ovrDelta !== null && row.ovrDelta !== 0 && (
                          <span
                            className={`ml-2 text-xs tabular-nums ${row.ovrDelta > 0 ? "text-primary" : "text-destructive"}`}
                          >
                            {row.ovrDelta > 0 ? "+" : ""}
                            {row.ovrDelta}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.position ?? "–"}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-semibold tabular-nums ${ovrTone(row.current?.overall)}`}
                      >
                        {row.current?.overall ?? "–"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {row.potential ?? "–"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.current?.age ?? "–"}
                      </td>
                      <td
                        className="px-4 py-2.5 text-right tabular-nums"
                        title={
                          row.fc
                            ? `Original værdi: ${formatMoney(row.fc.value_eur)} ved OVR ${row.fc.overall}`
                            : "Værdi fra dit screenshot — match spilleren for et estimat"
                        }
                      >
                        {formatMoney(row.estimatedValue)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatWage(row.current?.wage)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums ${contract ? contractTone[contract.tone] : "text-muted-foreground"}`}
                      >
                        {contract?.label ?? row.current?.contract_until ?? "–"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{role ?? "–"}</td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setMatchTarget(row)}
                          className={`text-xs hover:text-primary ${row.fc ? "text-muted-foreground" : "text-amber-400"}`}
                        >
                          {row.fc ? row.fc.short_name : "Match spiller"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {matchTarget && (
        <FcMatchDialog
          careerId={id}
          playerId={matchTarget.player.id}
          playerName={matchTarget.player.name}
          currentMatch={matchTarget.fc}
          open
          onOpenChange={(next) => {
            if (!next) setMatchTarget(null);
          }}
        />
      )}
    </div>
  );
}
