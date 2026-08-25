import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { careerDataQuery } from "@/lib/career-queries";
import {
  averageOf,
  buildSquad,
  buildWarnings,
  sortedSeasons,
  contractYear,
  seasonStartYear,
} from "@/lib/squad";
import { POSITION_GROUPS, formatMoney, ovrTone } from "@/lib/football";
import { AlertTriangle, CheckCircle2, Info, TrendingDown, TrendingUp, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/karrierer/$id/")({
  head: () => ({
    meta: [
      { title: "Karriereoverblik — FC Career Companion" },
      {
        name: "description",
        content:
          "Nøgletal, advarsler og udvikling for din FC 26 trup: gennemsnitsalder, overall, kontraktudløb og positioner der mangler.",
      },
      { property: "og:title", content: "Karriereoverblik — FC Career Companion" },
      {
        property: "og:description",
        content: "Se trupstyrke, advarsler og hvem der udvikler sig i din FC 26 karriere.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareerOverview,
});

const toneStyles = {
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-500",
  success: "border-primary/40 bg-primary/10 text-primary",
} as const;

const toneIcons = { danger: AlertTriangle, warn: Info, success: CheckCircle2 } as const;

function CareerOverview() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/" });
  const { data } = useSuspenseQuery(careerDataQuery(id));

  const seasons = sortedSeasons(data.seasons);
  const activeSeason =
    seasons.find((season) => season.id === data.career.current_season_id) ?? seasons[0];
  const rows = buildSquad(data.seasons, data.players, data.snapshots, activeSeason?.id ?? null).filter(
    (row) => row.current !== null,
  );
  const warnings = buildWarnings(
    buildSquad(data.seasons, data.players, data.snapshots, activeSeason?.id ?? null),
    activeSeason?.label ?? null,
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="font-display text-lg font-semibold">Ingen trupdata for {activeSeason?.label}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Upload et screenshot af trupskærmen, så læser AI navn, position, OVR, potentiale, alder,
          værdi, løn og kontrakt for hele holdet.
        </p>
        <Button asChild className="mt-6">
          <Link to="/karrierer/$id/import" params={{ id }}>
            <Upload className="mr-2 h-4 w-4" /> Upload screenshot
          </Link>
        </Button>
      </div>
    );
  }

  const avgOvr = averageOf(rows.map((row) => row.current?.overall));
  const avgAge = averageOf(rows.map((row) => row.current?.age));
  const avgPot = averageOf(rows.map((row) => row.current?.potential));
  const totalValue = rows.reduce((sum, row) => sum + (row.current?.market_value ?? 0), 0);
  const wageTotal = rows.reduce((sum, row) => sum + (row.current?.wage ?? 0), 0);

  const startYear = activeSeason ? seasonStartYear(activeSeason.label) : null;
  const expiring = rows.filter((row) => {
    const year = contractYear(row.current?.contract_until);
    return startYear !== null && year !== null && year <= startYear + 1;
  });

  const risers = [...rows]
    .filter((row) => row.ovrDelta !== null && row.ovrDelta !== 0)
    .sort((a, b) => (b.ovrDelta ?? 0) - (a.ovrDelta ?? 0));
  const topRisers = risers.slice(0, 5);
  const topFallers = risers.filter((row) => (row.ovrDelta ?? 0) < 0).slice(-5).reverse();

  const stats = [
    { label: "Spillere", value: String(rows.length) },
    { label: "Gns. overall", value: avgOvr ? avgOvr.toFixed(1) : "–" },
    { label: "Gns. potentiale", value: avgPot ? avgPot.toFixed(1) : "–" },
    { label: "Gns. alder", value: avgAge ? avgAge.toFixed(1) : "–" },
    { label: "Trupværdi", value: formatMoney(totalValue || null) },
    { label: "Lønudgift", value: formatMoney(wageTotal || null) },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="mt-2 font-display text-xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </section>

      {warnings.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold">Advarsler</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {warnings.map((warning, index) => {
              const Icon = toneIcons[warning.tone];
              return (
                <li
                  key={`${warning.title}-${index}`}
                  className={`flex gap-3 rounded-lg border p-3 text-sm ${toneStyles[warning.tone]}`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    <span className="font-semibold">{warning.title}: </span>
                    <span className="text-foreground/90">{warning.message}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Trupfordeling</h2>
          <ul className="mt-4 space-y-3">
            {Object.entries(POSITION_GROUPS).map(([group, positions]) => {
              const count = rows.filter(
                (row) => row.position && positions.includes(row.position),
              ).length;
              const share = rows.length > 0 ? Math.round((count / rows.length) * 100) : 0;
              return (
                <li key={group}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{group}</span>
                    <span className="tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Kontrakter der løber ud</h2>
          {expiring.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Ingen kontrakter udløber inden for næste sæson.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border/60">
              {expiring.slice(0, 8).map((row) => (
                <li key={row.player.id} className="flex items-center justify-between py-2 text-sm">
                  <Link
                    to="/karrierer/$id/spiller/$playerId"
                    params={{ id, playerId: row.player.id }}
                    className="hover:text-primary"
                  >
                    {row.player.name}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {row.current?.contract_until ?? "–"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {(topRisers.length > 0 || topFallers.length > 0) && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Største fremgang
            </h2>
            <ul className="mt-3 divide-y divide-border/60">
              {topRisers.map((row) => (
                <li key={row.player.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{row.player.name}</span>
                  <span className={`tabular-nums ${ovrTone(row.current?.overall)}`}>
                    {row.previous?.overall} → {row.current?.overall}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <TrendingDown className="h-4 w-4 text-destructive" aria-hidden /> Tilbagegang
            </h2>
            {topFallers.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Ingen spillere er faldet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border/60">
                {topFallers.map((row) => (
                  <li
                    key={row.player.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>{row.player.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.previous?.overall} → {row.current?.overall}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
