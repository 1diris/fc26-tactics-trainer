import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Star, StarOff, Search, Loader2 } from "lucide-react";
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
import {
  addTransferTarget,
  removeTransferTarget,
  type MarketPlayer,
  type MarketSearchInput,
  type MarketPreset,
} from "@/lib/market.functions";
import { buildSquad, sortedSeasons } from "@/lib/squad";
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

  const seasons = sortedSeasons(career.seasons);
  const activeSeasonId = career.career.current_season_id ?? seasons[0]?.id ?? null;
  const squad = useMemo(
    () => buildSquad(career.seasons, career.players, career.snapshots, activeSeasonId),
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

  const missingPositions = useMemo(
    () => POSITIONS.filter((position) => !bestByPosition.has(position)),
    [bestByPosition],
  );

  const filters: MarketSearchInput = {
    query: submittedTerm || undefined,
    positions: positions.length > 0 ? positions : undefined,
    minOverall: minOverall ? Number(minOverall) : null,
    minPotential: minPotential ? Number(minPotential) : null,
    maxAge: maxAge ? Number(maxAge) : null,
    league: league === "all" ? null : league,
    maxValue: maxValue ? Number(maxValue) : null,
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
          {missingPositions.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                resetPage();
                setPositions(missingPositions.slice(0, 8));
              }}
            >
              Dæk mine huller
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              resetPage();
              setPositions([]);
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
          {(results.data?.players ?? []).map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              delta={upgradeDelta(player)}
              isTarget={targetIds.has(player.id)}
              pending={toggleTarget.isPending}
              onToggle={() => toggleTarget.mutate(player)}
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
  footer,
}: {
  player: MarketPlayer;
  delta: number | null;
  isTarget: boolean;
  pending: boolean;
  onToggle: () => void;
  footer?: string;
}) {
  return (
    <article className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-start gap-3">
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
      </div>
    </article>
  );
}
