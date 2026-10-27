import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import React, { useMemo, useState } from "react";
import { Star, StarOff, Search, Loader2, UserPlus } from "lucide-react";
import { updateCareerSettings } from "@/lib/career.functions";
import { contractYear, seasonStartYear } from "@/lib/squad";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { careerDataQuery, leaguesQuery, marketSearchQuery, targetsQuery } from "@/lib/career-queries";
import { SignPlayerDialog } from "@/components/sign-player-dialog";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  addTransferTarget,
  removeTransferTarget,
  type MarketPlayer,
  type MarketSearchInput,
  type MarketPreset,
} from "@/lib/market.functions";
import { buildSquad, sortedSeasons } from "@/lib/squad";
import {
  PRIORITY_META,
  analyseSquadNeeds,
  clubLevel,
  squadAge,
  type PositionNeed,
} from "@/lib/squad-needs";
import { POSITIONS, formatMoney, formatWage, normalizePosition, ovrTone } from "@/lib/football";

export const Route = createFileRoute("/_authenticated/karrierer/$id/marked")({
  validateSearch: (search: Record<string, unknown>): { position?: string } => {
    const raw = typeof search["position"] === "string" ? search["position"] : undefined;
    const position = raw ? (normalizePosition(raw) ?? undefined) : undefined;
    return position ? { position } : {};
  },
  head: () => ({
    meta: [
      { title: "Transfer Market — Career Chronicles" },
      {
        name: "description",
        content:
          "Search over 18,000 FC 26 players by position, overall, potential, age, value and wage — and save your transfer targets.",
      },
      { property: "og:title", content: "Transfer Market — Career Chronicles" },
      {
        property: "og:description",
        content:
          "Find players you can buy within your transfer budget, and see if they are an upgrade on the squad.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketPage,
});

const SORT_LABELS: Record<NonNullable<MarketSearchInput["sort"]>, string> = {
  overall: "Highest OVR",
  potential: "Highest potential",
  value_desc: "Most expensive first",
  value_asc: "Cheapest first",
  age: "Youngest first",
};

const PRESET_LABELS: Record<MarketPreset, string> = {
  wonderkids: "Wonderkids",
  gems: "Gems",
  bargains: "Bargains",
  expiring: "Expiring",
  free_agents: "Free agents",
};

const PRESET_HINTS: Record<MarketPreset, string> = {
  wonderkids: "Max 21 years old with at least +10 growth potential, ranked by potential per euro.",
  gems: "22-26 years old who can still develop, and who are cheap relative to their potential.",
  bargains: "OVR 70+ ranked by the most quality per euro.",
  expiring: "Contract expires this year — can be signed cheaply or for free.",
  free_agents: "Players without a club right now.",
};

const PRIORITY_LABELS: Record<number, string> = { 1: "High", 2: "Medium", 3: "Low" };

/**
 * Turns two optional numeric text inputs into filter bounds.
 * An inverted range (min > max) is reported and applies no bounds.
 */
function range(
  minText: string,
  maxText: string,
): { min: number | null; max: number | null; invalid: boolean } {
  const min = minText.trim() === "" ? null : Number(minText);
  const max = maxText.trim() === "" ? null : Number(maxText);
  const invalid = min != null && max != null && min > max;
  if (invalid) return { min: null, max: null, invalid: true };
  return { min, max, invalid: false };
}

function RangeField({
  label,
  digits,
  min,
  max,
  onMin,
  onMax,
  minPlaceholder,
  maxPlaceholder,
}: {
  label: string;
  digits: number;
  min: string;
  max: string;
  onMin: (value: string) => void;
  onMax: (value: string) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}) {
  const invalid = range(min, max).invalid;
  const clean = (value: string) => value.replace(/\D/g, "").slice(0, digits);
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <Input
          inputMode="numeric"
          value={min}
          onChange={(event) => onMin(clean(event.target.value))}
          placeholder={minPlaceholder ?? "Min."}
          aria-label={`${label} minimum`}
          aria-invalid={invalid}
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          inputMode="numeric"
          value={max}
          onChange={(event) => onMax(clean(event.target.value))}
          placeholder={maxPlaceholder ?? "Max."}
          aria-label={`${label} maximum`}
          aria-invalid={invalid}
        />
      </div>
      {invalid && (
        <p className="text-xs text-destructive">Minimum must not be greater than maximum.</p>
      )}
    </div>
  );
}

function MarketPage() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/marked" });
  const { position: searchPosition } = Route.useSearch();
  const { data: career } = useSuspenseQuery(careerDataQuery(id));
  const queryClient = useQueryClient();
  const updateCareerFn = useServerFn(updateCareerSettings);

  const [term, setTerm] = useState("");
  const [submittedTerm, setSubmittedTerm] = useState("");
  const [positions, setPositions] = useState<string[]>(searchPosition ? [searchPosition] : []);
  const [minOverall, setMinOverall] = useState("");
  const [maxOverall, setMaxOverall] = useState("");
  const [minPotential, setMinPotential] = useState("");
  const [maxPotential, setMaxPotential] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [league, setLeague] = useState("all");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [minWage, setMinWage] = useState("");
  const [maxWage, setMaxWage] = useState("");
  const [foot, setFoot] = useState("all");
  const [sort, setSort] = useState<NonNullable<MarketSearchInput["sort"]>>("overall");
  const [preset, setPreset] = useState<MarketPreset | null>(null);
  const [page, setPage] = useState(0);
  const [needsOpen, setNeedsOpen] = useState(false);
  const [focusPosition, setFocusPosition] = useState<string | null>(searchPosition ?? null);
  const [signing, setSigning] = useState<MarketPlayer | null>(null);


  const seasons = sortedSeasons(career.seasons);
  const activeSeasonId = career.career.current_season_id ?? seasons[0]?.id ?? null;
  const squad = useMemo(
    () => buildSquad(career.seasons, career.players, career.snapshots, activeSeasonId, career.fcPlayers),
    [career, activeSeasonId],
  );

  /** Best overall currently in the squad per normalised position. */
  const bestByPosition = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of squad) {
      const pos = row.position;
      const ovr = row.current?.overall;
      if (!pos || ovr == null) continue;
      if (!map.has(pos) || (map.get(pos) ?? 0) < ovr) map.set(pos, ovr);
    }
    return map;
  }, [squad]);

  const needs = useMemo(() => analyseSquadNeeds(squad), [squad]);
  const level = useMemo(() => clubLevel(squad), [squad]);
  const squadAvgAge = useMemo(() => squadAge(squad), [squad]);
  const highNeeds = needs.filter((need) => need.priority === "high").length;


  // Only send a bound pair when it is valid; an inverted range is reported instead.
  const ovr = range(minOverall, maxOverall);
  const pot = range(minPotential, maxPotential);
  const age = range(minAge, maxAge);
  const value = range(minValue, maxValue);
  const wage = range(minWage, maxWage);
  const invalidRanges = [
    ovr.invalid ? "OVR" : null,
    pot.invalid ? "Potential" : null,
    age.invalid ? "Age" : null,
    value.invalid ? "Value" : null,
    wage.invalid ? "Wage" : null,
  ].filter((label): label is string => label != null);

  const filters: MarketSearchInput = {
    query: submittedTerm || undefined,
    positions: positions.length > 0 ? positions : undefined,
    minOverall: ovr.min,
    maxOverall: ovr.max,
    minPotential: pot.min,
    maxPotential: pot.max,
    minAge: age.min,
    maxAge: age.max,
    league: league === "all" ? null : league,
    minValue: value.min,
    maxValue: value.max,
    minWage: wage.min,
    maxWage: wage.max,
    foot: foot === "all" ? null : (foot as "Left" | "Right"),
    preset,
    sort,
    page,
  };

  const results = useQuery(marketSearchQuery(filters));
  const leagues = useQuery(leaguesQuery());
  const targets = useQuery(targetsQuery(id));

  const addTarget = useServerFn(addTransferTarget);
  const removeTarget = useServerFn(removeTransferTarget);

  const targetIds = useMemo(
    () => new Set((targets.data ?? []).map((target) => target.fc_players?.id).filter(Boolean)),
    [targets.data],
  );

  const toggleTarget = useMutation({
    mutationFn: async (player: MarketPlayer) => {
      if (targetIds.has(player.id)) {
        return removeTarget({ data: { careerId: id, fcPlayerId: player.id } });
      }
      return addTarget({
        data: {
          careerId: id,
          fcPlayerId: player.id,
          expectedPrice: player.value_eur ?? null,
        },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transfer-targets", id] }),
  });

  function resetPage() {
    setPage(0);
  }

  function togglePosition(position: string) {
    resetPage();
    setFocusPosition(null);
    setPositions((current) =>
      current.includes(position)
        ? current.filter((value) => value !== position)
        : [...current, position],
    );
  }

  const budget = career.career.transfer_budget;
  const total = results.data?.total ?? 0;
  const pageSize = results.data?.pageSize ?? 50;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const targetSpend = (targets.data ?? []).reduce(
    (sum, target) => sum + Number(target.expected_price ?? 0),
    0,
  );

  /** OVR difference vs. the best squad player on any of the player's positions. */
  function upgradeDelta(player: MarketPlayer): number | null {
    if (player.overall == null) return null;
    const values = player.positions
      .map((position) => bestByPosition.get(normalizePosition(position) ?? position))
      .filter((value): value is number => typeof value === "number");
    if (values.length === 0) return null;
    return player.overall - Math.max(...values);
  }

  /** Applies the market filters that fit a squad need. */
  function applyNeed(need: PositionNeed) {
    resetPage();
    setPreset(null);
    setFocusPosition(need.position);
    setPositions([need.position]);
    setMinOverall(String(need.suggestion.minOverall));
    setMaxOverall(String(need.suggestion.maxOverall));
    setMinPotential(need.suggestion.minPotential == null ? "" : String(need.suggestion.minPotential));
    setMaxPotential("");
    setMinAge("");
    setMaxAge(need.suggestion.maxAge == null ? "" : String(need.suggestion.maxAge));
    setMinValue("");
    setMaxValue(budget != null && budget > 0 ? String(Math.round(budget)) : "");
    setSort("overall");
    setTerm("");
    setSubmittedTerm("");
  }

  /**
   * When a squad need is in focus we surface natural fits for that position
   * first, then rank on quality and remaining growth.
   */
  const visiblePlayers = useMemo(() => {
    const rows = results.data?.players ?? [];
    if (!focusPosition) return rows;
    const score = (player: MarketPlayer) => {
      const list = player.positions.map((position) => normalizePosition(position) ?? position);
      const natural = list[0] === focusPosition ? 200 : list.includes(focusPosition) ? 100 : 0;
      const growth = Math.max(0, (player.potential ?? 0) - (player.overall ?? 0));
      return natural + (player.overall ?? 0) + growth / 2;
    };
    return [...rows].sort((a, b) => score(b) - score(a));
  }, [results.data, focusPosition]);

  const topNeeds = needs.slice(0, 2);
  const shortlistPosition = focusPosition ?? topNeeds[0]?.position ?? null;
  const seasonLabel = seasons.find((season) => season.id === activeSeasonId)?.label ?? null;
  const startYear = seasonLabel ? seasonStartYear(seasonLabel) : null;
  const expiring = squad
    .filter((row) => {
      const year = contractYear(row.current?.contract_until);
      return startYear != null && year != null && year <= startYear + 1;
    })
    .sort((a, b) => (b.current?.overall ?? 0) - (a.current?.overall ?? 0));
  const wageTotal = squad.reduce((sum, row) => sum + Number(row.current?.wage ?? 0), 0);
  const OUTLINE =
    "inline-flex h-9 items-center justify-center rounded-[10px] border border-ov-control px-3 text-sm font-medium text-ov-text hover:bg-ov-line disabled:opacity-50";
  const PRIMARY =
    "inline-flex h-9 items-center justify-center rounded-[10px] bg-ov-accent px-3 text-sm font-semibold text-black hover:opacity-90";

  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters =
    positions.length +
    [minOverall, maxOverall, minPotential, maxPotential, minAge, maxAge, minValue, maxValue, minWage, maxWage].filter(
      (v) => v !== "",
    ).length +
    (league !== "all" ? 1 : 0) +
    (foot !== "all" ? 1 : 0);

  function resetAll() {
    resetPage();
    setPositions([]);
    setFocusPosition(null);
    setMinOverall("");
    setMaxOverall("");
    setMinPotential("");
    setMaxPotential("");
    setMinAge("");
    setMaxAge("");
    setMinValue("");
    setMaxValue("");
    setMinWage("");
    setMaxWage("");
    setLeague("all");
    setFoot("all");
    setTerm("");
    setSubmittedTerm("");
    setPreset(null);
  }

  const editBudget = async () => {
    const raw = window.prompt(
      "Transfer budget in euros",
      budget != null ? String(Math.round(budget)) : "",
    );
    if (raw == null) return;
    const next = raw.trim() === "" ? null : Number(raw.replace(/[^\d.]/g, ""));
    if (next != null && !Number.isFinite(next)) return;
    await updateCareerFn({ data: { careerId: id, transferBudget: next } });
    void queryClient.invalidateQueries({ queryKey: ["career", id] });
  };

  return (
    <div className="space-y-6 text-ov-text">
      <div>
        <h1 className="font-tight text-[32px] font-bold leading-tight tracking-[-0.03em]">
          Transfers
        </h1>
        <p className="mt-1 text-sm text-ov-muted">What your squad needs, and who could fill it</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {topNeeds.map((need, index) => (
          <div key={need.position} className="flex flex-col rounded-2xl border border-ov-border bg-ov-card p-5">
            <div className="flex items-center gap-2 text-xs text-ov-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-ov-warn" /> Priority {index + 1}
            </div>
            <div className="mt-2 font-tight text-[28px] font-bold tracking-[-0.03em]">
              {need.position}
            </div>
            <p className="mt-1 flex-1 text-sm text-ov-muted">
              Best {need.bestOverall ?? "–"} OVR · club level {level ?? "–"} · {Math.max(0, need.depth - 1)}{" "}
              backups
            </p>
            <button
              type="button"
              onClick={() => applyNeed(need)}
              className={`mt-4 self-start ${index === 0 ? PRIMARY : OUTLINE}`}
            >
              Find {need.position}
            </button>
          </div>
        ))}
        <div className="flex flex-col rounded-2xl border border-ov-border bg-ov-card p-5">
          <div className="text-xs text-ov-muted">Budget</div>
          <div className="mt-2 font-tight text-[28px] font-bold tracking-[-0.03em]">
            {budget == null ? "–" : formatMoney(budget)}
          </div>
          <p className="mt-1 flex-1 text-sm text-ov-muted">Wages {formatWage(wageTotal)}</p>
          <button type="button" onClick={() => void editBudget()} className={`mt-4 self-start ${OUTLINE}`}>
            Edit budget
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 rounded-2xl border border-ov-border bg-ov-card">
          <div className="flex items-baseline justify-between gap-3 border-b border-ov-line px-5 py-4">
            <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">
              Shortlist{shortlistPosition ? ` · ${shortlistPosition}` : ""}
            </h2>
            <span className="text-xs text-ov-muted">From the FC 26 database</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ov-muted">
                  <th className="px-5 py-3 font-medium">Player</th>
                  <th className="px-3 py-3 font-medium">Age</th>
                  <th className="px-3 py-3 font-medium">OVR</th>
                  <th className="px-3 py-3 font-medium">POT</th>
                  <th className="px-3 py-3 font-medium">Value</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {visiblePlayers.slice(0, 6).map((player) => {
                  const on = targetIds.has(player.id);
                  return (
                    <tr key={player.id} className="border-t border-[#141414]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{player.short_name}</span>
                          <span className="rounded-md border border-ov-control px-1.5 py-px text-[11px] text-ov-muted">
                            {player.positions[0] ?? "–"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-ov-muted">{player.age ?? "–"}</td>
                      <td className="px-3 py-3 font-tight text-[17px] font-semibold tabular-nums">
                        {player.overall ?? "–"}
                      </td>
                      <td
                        className={`px-3 py-3 font-tight font-semibold tabular-nums ${(player.potential ?? 0) > (player.overall ?? 0) ? "text-ov-accent" : "text-ov-muted"}`}
                      >
                        {player.potential ?? "–"}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-ov-muted">
                        {formatMoney(player.value_eur == null ? null : Number(player.value_eur))}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          disabled={toggleTarget.isPending}
                          onClick={() => toggleTarget.mutate(player)}
                          className={`${OUTLINE} h-8 ${on ? "border-ov-accent text-ov-accent" : ""}`}
                        >
                          {on ? "Shortlisted" : "Shortlist"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {visiblePlayers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-ov-muted">
                      {results.isFetching ? "Loading players…" : "No players match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-ov-border bg-ov-card">
          <div className="flex items-baseline justify-between gap-3 border-b border-ov-line px-5 py-4">
            <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">Expiring contracts</h2>
            <span className="text-xs text-ov-muted">This season</span>
          </div>
          <ul>
            {expiring.slice(0, 6).map((row, index) => (
              <li
                key={row.player.id}
                className={`flex items-center gap-3 px-5 py-3 ${index > 0 ? "border-t border-[#141414]" : ""}`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ov-warn" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{row.player.name}</span>
                    <span className="rounded-md border border-ov-control px-1.5 py-px text-[11px] text-ov-muted">
                      {row.position ?? "–"}
                    </span>
                  </div>
                  <div className="text-xs text-ov-muted">
                    {row.current?.overall ?? "–"} OVR · {row.current?.age ?? "–"} yrs
                  </div>
                </div>
                <Link
                  to="/karrierer/$id/spiller/$playerId"
                  params={{ id, playerId: row.player.id }}
                  className={`${OUTLINE} h-8`}
                >
                  Renew
                </Link>
              </li>
            ))}
            {expiring.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-ov-muted">
                No contracts expire this season.
              </li>
            )}
          </ul>
        </div>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">Search the market</h2>
        <TabsList className="h-9 rounded-[10px] border border-ov-control bg-transparent p-0.5">
          <TabsTrigger value="search" className="h-8 rounded-lg text-xs">Search players</TabsTrigger>
          <TabsTrigger value="targets" className="h-8 rounded-lg text-xs">
            My targets ({targets.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="search" className="space-y-4">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            resetPage();
            setSubmittedTerm(term.trim());
          }}
        >
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ov-muted" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search by name or club"
              className="h-9 rounded-[10px] border-ov-control bg-transparent pl-9"
              aria-label="Search by name or club"
            />
          </div>
          <Select
            value={sort}
            onValueChange={(value) => {
              resetPage();
              setSort(value as NonNullable<MarketSearchInput["sort"]>);
            }}
          >
            <SelectTrigger aria-label="Sort" className="h-9 w-44 rounded-[10px] border-ov-control bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            className={`${OUTLINE} ${filtersOpen ? "border-ov-accent" : ""}`}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            Filters
            {activeFilters > 0 && (
              <span className="ml-1.5 rounded-full bg-ov-accent px-1.5 text-[10px] font-semibold text-black">
                {activeFilters}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`${OUTLINE} ${needsOpen ? "border-ov-accent" : ""}`}
            onClick={() => setNeedsOpen((open) => !open)}
            aria-expanded={needsOpen}
          >
            Cover my gaps
            {highNeeds > 0 && (
              <span className="ml-1.5 rounded bg-destructive/20 px-1 text-[10px] font-semibold text-destructive">
                {highNeeds}
              </span>
            )}
          </button>
          <button type="submit" className={PRIMARY}>
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PRESET_LABELS) as MarketPreset[]).map((key) => {
            const active = preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  resetPage();
                  setPreset(active ? null : key);
                }}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? "border-ov-accent text-ov-text"
                    : "border-ov-control text-ov-muted hover:text-ov-text"
                }`}
              >
                {PRESET_LABELS[key]}
              </button>
            );
          })}
        </div>

        {preset && <p className="text-xs text-ov-muted">{PRESET_HINTS[preset]}</p>}

        {needsOpen && (
          <section className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.15em]">
                Squad analysis
              </h2>
              <p className="text-xs text-muted-foreground">
                Club level {level ?? "–"} OVR
                {squadAvgAge != null ? ` · average age ${squadAvgAge} yrs` : ""}
              </p>
            </header>
            <p className="text-xs text-muted-foreground">
              Click a position to automatically filter the market to relevant,
              realistic players for that role.
            </p>
            <ul className="space-y-2">
              {needs.map((need) => {
                const meta = PRIORITY_META[need.priority];
                const active = focusPosition === need.position;
                return (
                  <li key={need.position}>
                    <button
                      type="button"
                      onClick={() => applyNeed(need)}
                      aria-pressed={active}
                      className={`w-full rounded-md border p-2.5 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border/60 bg-background/40 hover:border-primary/60"
                      }`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.tone} border`}>
                          {meta.dot} {meta.label}
                        </span>
                        <span className="font-semibold">
                          {need.position} · {need.label}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{need.reason}</span>
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span>{need.naturalCount} natural</span>
                        <span>{need.capableCount} can cover</span>
                        <span>Best {need.bestOverall ?? "–"} OVR</span>
                        <span>Avg {need.averageOverall ?? "–"} OVR</span>
                        <span>
                          Depth {need.depth} / {need.required}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {filtersOpen && (
        <div className="space-y-4 rounded-2xl border border-ov-border bg-ov-card p-5">
        <div className="flex flex-wrap gap-2">
          {budget != null && (
            <button
              type="button"
              className={OUTLINE}
              onClick={() => {
                resetPage();
                setMaxValue(String(budget));
              }}
            >
              Within budget ({formatMoney(budget)})
            </button>
          )}
          <button type="button" className={`${OUTLINE} border-transparent text-ov-muted`} onClick={resetAll}>
            Reset filters
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {POSITIONS.map((position) => {
            const active = positions.includes(position);
            return (
              <button
                key={position}
                type="button"
                onClick={() => togglePosition(position)}
                aria-pressed={active}
                className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {position}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <RangeField
            label="OVR"
            digits={2}
            min={minOverall}
            max={maxOverall}
            onMin={(value) => {
              resetPage();
              setMinOverall(value);
            }}
            onMax={(value) => {
              resetPage();
              setMaxOverall(value);
            }}
            minPlaceholder="e.g. 70"
            maxPlaceholder="e.g. 78"
          />
          <RangeField
            label="Potential"
            digits={2}
            min={minPotential}
            max={maxPotential}
            onMin={(value) => {
              resetPage();
              setMinPotential(value);
            }}
            onMax={(value) => {
              resetPage();
              setMaxPotential(value);
            }}
            minPlaceholder="e.g. 80"
            maxPlaceholder="e.g. 90"
          />
          <RangeField
            label="Age"
            digits={2}
            min={minAge}
            max={maxAge}
            onMin={(value) => {
              resetPage();
              setMinAge(value);
            }}
            onMax={(value) => {
              resetPage();
              setMaxAge(value);
            }}
            minPlaceholder="e.g. 16"
            maxPlaceholder="e.g. 23"
          />
          <RangeField
            label="Value (€)"
            digits={12}
            min={minValue}
            max={maxValue}
            onMin={(value) => {
              resetPage();
              setMinValue(value);
            }}
            onMax={(value) => {
              resetPage();
              setMaxValue(value);
            }}
            minPlaceholder="e.g. 0"
            maxPlaceholder="e.g. 40000000"
          />
          <RangeField
            label="Wage (€ per week)"
            digits={9}
            min={minWage}
            max={maxWage}
            onMin={(value) => {
              resetPage();
              setMinWage(value);
            }}
            onMax={(value) => {
              resetPage();
              setMaxWage(value);
            }}
            minPlaceholder="e.g. 0"
            maxPlaceholder="e.g. 100000"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            Foot
            <Select
              value={foot}
              onValueChange={(value) => {
                resetPage();
                setFoot(value);
              }}
            >
              <SelectTrigger aria-label="Preferred foot">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Right">Right</SelectItem>
                <SelectItem value="Left">Left</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            League
            <Select
              value={league}
              onValueChange={(value) => {
                resetPage();
                setLeague(value);
              }}
            >
              <SelectTrigger aria-label="League">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All leagues</SelectItem>
                {(leagues.data ?? []).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        </div>
        )}

        {invalidRanges.length > 0 && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            Invalid range in: {invalidRanges.join(", ")}. Minimum must not be greater than
            maximum — the filter is temporarily ignored.
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {results.isFetching ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
              </span>
            ) : (
              `${total.toLocaleString("en-GB")} players found`
            )}
          </span>
          {pageCount > 1 && (
            <span className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <span>
                Page {page + 1} of {pageCount}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </span>
          )}
        </div>

        <MarketTable>
          {visiblePlayers.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              delta={upgradeDelta(player)}
              isTarget={targetIds.has(player.id)}
              pending={toggleTarget.isPending}
              onToggle={() => toggleTarget.mutate(player)}
              onSign={() => setSigning(player)}
            />
          ))}
          {!results.isFetching && (results.data?.players.length ?? 0) === 0 && (
            <tr>
              <td colSpan={8} className="px-5 py-8 text-center text-sm text-ov-muted">
                No players match your filters.
              </td>
            </tr>
          )}
        </MarketTable>
      </TabsContent>

      <TabsContent value="targets" className="space-y-4">
        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-ov-border bg-ov-card">
          <Stat label="Number of targets" value={String(targets.data?.length ?? 0)} />
          <Stat label="Expected spend" value={formatMoney(targetSpend)} />
          <Stat
            label="Remaining budget"
            value={budget == null ? "–" : formatMoney(budget - targetSpend)}
          />
        </div>

        <MarketTable>
          {(targets.data ?? []).map((target) =>
            target.fc_players ? (
              <PlayerRow
                key={target.id}
                player={target.fc_players}
                delta={upgradeDelta(target.fc_players)}
                isTarget
                pending={toggleTarget.isPending}
                onToggle={() => toggleTarget.mutate(target.fc_players!)}
                onSign={() => setSigning(target.fc_players!)}
                footer={`Priority: ${PRIORITY_LABELS[target.priority] ?? "Medium"}${
                  target.expected_price != null
                    ? ` · Expected price ${formatMoney(Number(target.expected_price))}`
                    : ""
                }`}
              />
            ) : null,
          )}
          {(targets.data?.length ?? 0) === 0 && (
            <tr>
              <td colSpan={8} className="px-5 py-8 text-center text-sm text-ov-muted">
                No transfer targets yet. Click the star next to a player in the search.
              </td>
            </tr>
          )}
        </MarketTable>
      </TabsContent>

      <SignPlayerDialog
        careerId={id}
        seasonId={activeSeasonId}
        seasonLabel={seasons.find((season) => season.id === activeSeasonId)?.label ?? null}
        player={signing}
        budget={budget}
        onOpenChange={(open) => {
          if (!open) setSigning(null);
        }}
      />
      </Tabs>
    </div>
  );
}

function growthOf(player: MarketPlayer): number {
  return (player.potential ?? 0) - (player.overall ?? 0);
}

function pricePerPoint(player: MarketPlayer): string | null {
  const value = Number(player.value_eur ?? 0);
  if (!player.overall || value <= 0) return null;
  return formatMoney(Math.round(value / player.overall));
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-ov-line p-4 first:border-l-0">
      <p className="text-xs text-ov-muted">{label}</p>
      <p className="mt-1 font-tight text-xl font-semibold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function MarketTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ov-border bg-ov-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ov-muted">
              <th className="px-5 py-3 font-medium">Player</th>
              <th className="px-3 py-3 font-medium">Age</th>
              <th className="px-3 py-3 font-medium">OVR</th>
              <th className="px-3 py-3 font-medium">POT</th>
              <th className="px-3 py-3 font-medium">Value</th>
              <th className="px-3 py-3 font-medium">vs. squad</th>
              <th className="px-5 py-3" colSpan={2} />
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerRow({
  player,
  delta,
  isTarget,
  pending,
  onToggle,
  onSign,
  footer,
}: {
  player: MarketPlayer;
  delta: number | null;
  isTarget: boolean;
  pending: boolean;
  onToggle: () => void;
  onSign: () => void;
  footer?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer border-t border-[#141414] hover:bg-ov-line"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <PlayerAvatar name={player.short_name} src={player.face_url} size="sm" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate font-medium">{player.short_name}</span>
                {player.positions.slice(0, 3).map((position) => (
                  <span
                    key={position}
                    className="rounded-md border border-ov-control px-1.5 py-px text-[11px] text-ov-muted"
                  >
                    {position}
                  </span>
                ))}
              </div>
              <p className="truncate text-xs text-ov-muted">
                {player.club_name ?? "No club"} · {player.league_name ?? "–"}
              </p>
              {footer && <p className="text-[11px] text-ov-accent">{footer}</p>}
            </div>
          </div>
        </td>
        <td className="px-3 py-3 tabular-nums text-ov-muted">{player.age ?? "–"}</td>
        <td className="px-3 py-3 font-tight text-[17px] font-semibold tabular-nums">
          {player.overall ?? "–"}
        </td>
        <td
          className={`px-3 py-3 font-tight font-semibold tabular-nums ${growthOf(player) > 0 ? "text-ov-accent" : "text-ov-muted"}`}
        >
          {player.potential ?? "–"}
        </td>
        <td className="px-3 py-3 tabular-nums text-ov-muted">
          {formatMoney(player.value_eur == null ? null : Number(player.value_eur))}
        </td>
        <td className="px-3 py-3 tabular-nums">
          {delta == null ? (
            <span className="text-ov-muted">–</span>
          ) : delta > 0 ? (
            <span className="font-semibold text-ov-accent">+{delta}</span>
          ) : (
            <span className="text-ov-muted">{delta}</span>
          )}
        </td>
        <td className="py-3 pl-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pending}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={isTarget ? "Remove from shortlist" : "Add to shortlist"}
          >
            {isTarget ? (
              <Star className="h-4 w-4 fill-ov-accent text-ov-accent" />
            ) : (
              <StarOff className="h-4 w-4 text-ov-muted" />
            )}
          </Button>
        </td>
        <td className="py-3 pr-5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSign();
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-ov-control px-3 text-xs font-medium hover:bg-ov-line"
          >
            <UserPlus className="h-3.5 w-3.5" /> Sign
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-ov-bg/40">
          <td colSpan={8} className="px-5 pb-4 pt-1 text-xs text-ov-muted">
            <p>
              {formatWage(player.wage_eur == null ? null : Number(player.wage_eur))} · Contract expiry{" "}
              {player.contract_until ?? "–"} ·{" "}
              {player.preferred_foot === "Left" ? "Left-footed" : "Right-footed"}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {growthOf(player) > 0 && (
                <span className="font-semibold text-ov-accent">+{growthOf(player)} growth</span>
              )}
              {pricePerPoint(player) && <span>{pricePerPoint(player)} per OVR point</span>}
              {player.release_clause_eur != null && (
                <span>Release clause {formatMoney(Number(player.release_clause_eur))}</span>
              )}
              <span>PAC {player.pace ?? "–"}</span>
              <span>SHO {player.shooting ?? "–"}</span>
              <span>PAS {player.passing ?? "–"}</span>
              <span>DRI {player.dribbling ?? "–"}</span>
              <span>DEF {player.defending ?? "–"}</span>
              <span>PHY {player.physic ?? "–"}</span>
            </p>
          </td>
        </tr>
      )}
    </>
  );
}
