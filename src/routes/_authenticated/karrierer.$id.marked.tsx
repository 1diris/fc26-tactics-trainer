import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Star, StarOff, Search, Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  head: () => ({
    meta: [
      { title: "Transfermarked — Career Chronicles" },
      {
        name: "description",
        content:
          "Søg blandt over 18.000 FC 26-spillere på position, overall, potentiale, alder, værdi og løn — og gem dine transfermål.",
      },
      { property: "og:title", content: "Transfermarked — Career Chronicles" },
      {
        property: "og:description",
        content:
          "Find spillere du kan købe inden for dit transferbudget, og se om de er en opgradering af truppen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketPage,
});

const SORT_LABELS: Record<NonNullable<MarketSearchInput["sort"]>, string> = {
  overall: "Højeste OVR",
  potential: "Højeste potentiale",
  value_desc: "Dyreste først",
  value_asc: "Billigste først",
  age: "Yngste først",
};

const PRESET_LABELS: Record<MarketPreset, string> = {
  wonderkids: "Wonderkids",
  gems: "Talenter",
  bargains: "Bargains",
  expiring: "Kontrakt udløber",
  free_agents: "Free agents",
};

const PRESET_HINTS: Record<MarketPreset, string> = {
  wonderkids: "Maks 21 år med mindst +10 i vækstpotentiale, rangeret efter potentiale pr. krone.",
  gems: "22-26 år der stadig kan udvikle sig, og som er billige i forhold til deres potentiale.",
  bargains: "OVR 70+ rangeret efter mest kvalitet pr. krone.",
  expiring: "Kontrakt udløber i år — kan hentes billigt eller gratis.",
  free_agents: "Spillere uden klub lige nu.",
};

const PRIORITY_LABELS: Record<number, string> = { 1: "Høj", 2: "Mellem", 3: "Lav" };

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
          placeholder={maxPlaceholder ?? "Maks."}
          aria-label={`${label} maksimum`}
          aria-invalid={invalid}
        />
      </div>
      {invalid && (
        <p className="text-xs text-destructive">Minimum må ikke være større end maksimum.</p>
      )}
    </div>
  );
}

function MarketPage() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/marked" });
  const { data: career } = useSuspenseQuery(careerDataQuery(id));
  const queryClient = useQueryClient();

  const [term, setTerm] = useState("");
  const [submittedTerm, setSubmittedTerm] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
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
  const [focusPosition, setFocusPosition] = useState<string | null>(null);
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
    pot.invalid ? "Potentiale" : null,
    age.invalid ? "Alder" : null,
    value.invalid ? "Værdi" : null,
    wage.invalid ? "Løn" : null,
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

  return (

    <Tabs defaultValue="search" className="space-y-6">
      <TabsList>
        <TabsTrigger value="search">Søg spillere</TabsTrigger>
        <TabsTrigger value="targets">Mine mål ({targets.data?.length ?? 0})</TabsTrigger>
      </TabsList>

      <TabsContent value="search" className="space-y-5">
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            resetPage();
            setSubmittedTerm(term.trim());
          }}
        >
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Søg på navn eller klub"
              className="pl-9"
              aria-label="Søg på navn eller klub"
            />
          </div>
          <Button type="submit">Søg</Button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(PRESET_LABELS) as MarketPreset[]).map((key) => {
            const active = preset === key;
            return (
              <Button
                key={key}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  resetPage();
                  setPreset(active ? null : key);
                }}
                aria-pressed={active}
              >
                {PRESET_LABELS[key]}
              </Button>
            );
          })}
        </div>

        {preset && (
          <p className="text-xs text-muted-foreground">{PRESET_HINTS[preset]}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {budget != null && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                resetPage();
                setMaxValue(String(budget));
              }}
            >
              Inden for budget ({formatMoney(budget)})
            </Button>
          )}
          <Button
            type="button"
            variant={needsOpen ? "default" : "secondary"}
            size="sm"
            onClick={() => setNeedsOpen((open) => !open)}
            aria-expanded={needsOpen}
          >
            Dæk mine huller
            {highNeeds > 0 && (
              <span className="ml-1.5 rounded bg-destructive/20 px-1 text-[10px] font-semibold text-destructive">
                {highNeeds}
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
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
            }}
          >
            Nulstil filtre
          </Button>
        </div>

        {needsOpen && (
          <section className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-3">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.15em]">
                Trupanalyse
              </h2>
              <p className="text-xs text-muted-foreground">
                Klubniveau {level ?? "–"} OVR
                {squadAvgAge != null ? ` · gennemsnitsalder ${squadAvgAge} år` : ""}
              </p>
            </header>
            <p className="text-xs text-muted-foreground">
              Tryk på en position for automatisk at filtrere markedet til relevante,
              realistiske spillere til netop den rolle.
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
                        <span>{need.naturalCount} naturlige</span>
                        <span>{need.capableCount} kan dække</span>
                        <span>Bedste {need.bestOverall ?? "–"} OVR</span>
                        <span>Snit {need.averageOverall ?? "–"} OVR</span>
                        <span>
                          Dybde {need.depth} / {need.required}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}


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
            minPlaceholder="fx 70"
            maxPlaceholder="fx 78"
          />
          <RangeField
            label="Potentiale"
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
            minPlaceholder="fx 80"
            maxPlaceholder="fx 90"
          />
          <RangeField
            label="Alder"
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
            minPlaceholder="fx 16"
            maxPlaceholder="fx 23"
          />
          <RangeField
            label="Værdi (€)"
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
            minPlaceholder="fx 0"
            maxPlaceholder="fx 40000000"
          />
          <RangeField
            label="Løn (€ pr. uge)"
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
            minPlaceholder="fx 0"
            maxPlaceholder="fx 100000"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            Fod
            <Select
              value={foot}
              onValueChange={(value) => {
                resetPage();
                setFoot(value);
              }}
            >
              <SelectTrigger aria-label="Foretrukket fod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="Right">Højre</SelectItem>
                <SelectItem value="Left">Venstre</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Liga
            <Select
              value={league}
              onValueChange={(value) => {
                resetPage();
                setLeague(value);
              }}
            >
              <SelectTrigger aria-label="Liga">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle ligaer</SelectItem>
                {(leagues.data ?? []).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Sortering
            <Select
              value={sort}
              onValueChange={(value) => {
                resetPage();
                setSort(value as NonNullable<MarketSearchInput["sort"]>);
              }}
            >
              <SelectTrigger aria-label="Sortering">
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
          </label>
        </div>

        {invalidRanges.length > 0 && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
            Ugyldigt interval i: {invalidRanges.join(", ")}. Minimum må ikke være større end
            maksimum — filteret er midlertidigt ignoreret.
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {results.isFetching ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Søger…
              </span>
            ) : (
              `${total.toLocaleString("da-DK")} spillere fundet`
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
                Forrige
              </Button>
              <span>
                Side {page + 1} af {pageCount}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Næste
              </Button>
            </span>
          )}
        </div>

        <div className="space-y-2">
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
            <p className="rounded-lg border border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Ingen spillere matcher dine filtre.
            </p>
          )}
        </div>
      </TabsContent>

      <TabsContent value="targets" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Antal mål" value={String(targets.data?.length ?? 0)} />
          <Stat label="Forventet udgift" value={formatMoney(targetSpend)} />
          <Stat
            label="Rest af budget"
            value={budget == null ? "–" : formatMoney(budget - targetSpend)}
          />
        </div>

        <div className="space-y-2">
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
                footer={`Prioritet: ${PRIORITY_LABELS[target.priority] ?? "Mellem"}${
                  target.expected_price != null
                    ? ` · Forventet pris ${formatMoney(Number(target.expected_price))}`
                    : ""
                }`}
              />
            ) : null,
          )}
          {(targets.data?.length ?? 0) === 0 && (
            <p className="rounded-lg border border-border/60 bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Ingen transfermål endnu. Tryk på stjernen ved en spiller i søgningen.
            </p>
          )}
        </div>
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
    <div className="rounded-lg border border-border/60 bg-card/40 p-4">
      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
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
  return (
    <article className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-start gap-3">
        <PlayerAvatar name={player.short_name} src={player.face_url} size="md" />
        <div className="flex flex-col items-center">
          <span className={`font-display text-2xl font-bold leading-none ${ovrTone(player.overall)}`}>
            {player.overall ?? "–"}
          </span>
          <span className="mt-0.5 text-[10px] text-muted-foreground">
            POT {player.potential ?? "–"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium">{player.short_name}</h3>
            {player.positions.slice(0, 3).map((position) => (
              <Badge key={position} variant="outline" className="px-1.5 py-0 text-[10px]">
                {position}
              </Badge>
            ))}
            {delta != null && delta > 0 && (
              <span className="text-xs font-semibold text-primary">+{delta} vs. trup</span>
            )}
            {delta != null && delta <= 0 && (
              <span className="text-xs text-muted-foreground">{delta} vs. trup</span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {player.age} år · {player.club_name ?? "Uden klub"} · {player.league_name ?? "–"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatMoney(player.value_eur == null ? null : Number(player.value_eur))} ·{" "}
            {formatWage(player.wage_eur == null ? null : Number(player.wage_eur))} · Kontrakt{" "}
            {player.contract_until ?? "–"} ·{" "}
            {player.preferred_foot === "Left" ? "Venstrebenet" : "Højrebenet"}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {growthOf(player) > 0 && (
              <span className="font-semibold text-primary">+{growthOf(player)} vækst</span>
            )}
            {pricePerPoint(player) && <span>{pricePerPoint(player)} pr. OVR-point</span>}
            {player.release_clause_eur != null && (
              <span>Klausul {formatMoney(Number(player.release_clause_eur))}</span>
            )}
            <span>PAC {player.pace ?? "–"}</span>
            <span>SHO {player.shooting ?? "–"}</span>
            <span>PAS {player.passing ?? "–"}</span>
            <span>DRI {player.dribbling ?? "–"}</span>
            <span>DEF {player.defending ?? "–"}</span>
            <span>PHY {player.physic ?? "–"}</span>
          </p>
          {footer && <p className="mt-1 text-[11px] text-primary">{footer}</p>}
        </div>
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pending}
            onClick={onToggle}
            aria-label={isTarget ? "Fjern som transfermål" : "Gem som transfermål"}
          >
            {isTarget ? (
              <Star className="h-4 w-4 fill-primary text-primary" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onSign}
            aria-label="Hent til trup"
            title="Hent til trup"
          >
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </article>
  );
}
