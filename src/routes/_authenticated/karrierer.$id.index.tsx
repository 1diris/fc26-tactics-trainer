import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/player-avatar";
import { careerDataQuery, youthQuery } from "@/lib/career-queries";
import {
  averageOf,
  buildSquad,
  sortedSeasons,
  contractYear,
  seasonStartYear,
  type SquadRow,
} from "@/lib/squad";
import { analyseSquadNeeds } from "@/lib/squad-needs";
import { POSITION_GROUPS, formatMoney, normalizePosition } from "@/lib/football";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Coins,
  GraduationCap,
  Lightbulb,
  ShieldAlert,
  Star,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/karrierer/$id/")({
  head: () => ({
    meta: [
      { title: "Career overview — Career Chronicles" },
      {
        name: "description",
        content:
          "Key stats, alerts and growth for your FC 26 squad: average age, OVR, contract expiry and missing positions.",
      },
      { property: "og:title", content: "Career overview — Career Chronicles" },
      {
        property: "og:description",
        content: "See squad strength, alerts and who is growing in your FC 26 career.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareerOverview,
});

/** Groups used for the squad distribution card, in pitch order. */
const DISTRIBUTION: { label: string; group: keyof typeof POSITION_GROUPS }[] = [
  { label: "Goalkeeper", group: "Målmand" },
  { label: "Defence", group: "Forsvar" },
  { label: "Midfield", group: "Midtbane" },
  { label: "Attack", group: "Angreb" },
];

const POSITION_BADGE: Record<string, string> = {
  Målmand: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Forsvar: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  Midtbane: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  Angreb: "bg-primary/15 text-primary border-primary/30",
};

function badgeClass(position: string | null): string {
  if (!position) return "bg-muted text-muted-foreground border-dash-border";
  for (const [group, list] of Object.entries(POSITION_GROUPS)) {
    if (list.includes(position)) return POSITION_BADGE[group] ?? "";
  }
  return "bg-muted text-muted-foreground border-dash-border";
}

function PosBadge({ position }: { position: string | null }) {
  if (!position) return null;
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-stat text-[11px] font-medium leading-none ${badgeClass(position)}`}
    >
      {position}
    </span>
  );
}

/** Rough contract time left, shown as the game does: "0y 10m". */
function contractLeft(row: SquadRow, startYear: number | null): string | null {
  const year = contractYear(row.current?.contract_until);
  if (year === null || startYear === null) return null;
  const months = (year - startYear - 1) * 12 + 10;
  if (months < 0) return "expired";
  return `${Math.floor(months / 12)}y ${months % 12}m`;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-dash-border bg-dash-card p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset] ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

function Kpi({
  value,
  label,
  hint,
  hintTone = "muted",
  icon: Icon,
  edge,
}: {
  value: string;
  label: string;
  hint?: string | null;
  hintTone?: "muted" | "good" | "warn";
  icon: React.ComponentType<{ className?: string }>;
  edge?: "good" | "warn" | null;
}) {
  const edgeClass =
    edge === "good"
      ? "before:bg-primary"
      : edge === "warn"
        ? "before:bg-warn"
        : "before:bg-transparent";
  const hintClass =
    hintTone === "good" ? "text-primary" : hintTone === "warn" ? "text-warn" : "text-muted-foreground";
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-dash-border bg-dash-card p-4 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:content-[''] ${edgeClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="stat-number text-2xl font-semibold sm:text-3xl">{value}</p>
        <Icon className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
      </div>
      <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      {hint && <p className={`mt-1 font-body text-xs ${hintClass}`}>{hint}</p>}
    </div>
  );
}

function CareerOverview() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/" });
  const { data } = useSuspenseQuery(careerDataQuery(id));
  const youth = useQuery(youthQuery(id));

  const seasons = sortedSeasons(data.seasons);
  const activeSeason =
    seasons.find((season) => season.id === data.career.current_season_id) ?? seasons[0];
  const activeSeasonId = activeSeason?.id ?? null;

  const allRows = useMemo(
    () => buildSquad(data.seasons, data.players, data.snapshots, activeSeasonId, data.fcPlayers),
    [data, activeSeasonId],
  );
  const rows = allRows.filter((row) => row.current !== null);
  const needs = useMemo(() => analyseSquadNeeds(allRows), [allRows]);

  if (rows.length === 0) {
    return (
      <div className="space-y-8 pb-24 lg:pb-8">
        <div className="rounded-xl border border-dashed border-dash-border bg-dash-card p-10 text-center">
          <p className="font-display text-lg font-semibold">
            No squad data for {activeSeason?.label}
          </p>
          <p className="mx-auto mt-2 max-w-md font-body text-sm text-muted-foreground">
            Upload a screenshot of the squad screen and AI reads name, position, OVR, POT, age, value,
            wage and contract for the whole team.
          </p>
          <Button asChild className="mt-6">
            <Link to="/karrierer/$id/import" params={{ id }}>
              <Upload className="mr-2 h-4 w-4" /> Upload screenshots
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const value = (row: SquadRow) => row.current?.market_value ?? row.estimatedValue ?? 0;

  const avgOvr = averageOf(rows.map((row) => row.current?.overall));
  const avgAge = averageOf(rows.map((row) => row.current?.age));
  const avgPot = averageOf(rows.map((row) => row.potential ?? row.current?.potential));
  const totalValue = rows.reduce((sum, row) => sum + value(row), 0);
  const wageTotal = rows.reduce((sum, row) => sum + (row.current?.wage ?? 0), 0);

  // Trend vs. the previous season, for players present in both.
  const paired = rows.filter((row) => row.previous !== null);
  const ovrTrend =
    paired.length > 0
      ? (averageOf(paired.map((row) => row.current?.overall)) ?? 0) -
        (averageOf(paired.map((row) => row.previous?.overall)) ?? 0)
      : null;
  const valueTrend =
    paired.length > 0
      ? paired.reduce((sum, row) => sum + ((row.current?.market_value ?? 0) - (row.previous?.market_value ?? 0)), 0)
      : null;

  const startYear = activeSeason ? seasonStartYear(activeSeason.label) : null;
  const expiring = rows
    .filter((row) => {
      const year = contractYear(row.current?.contract_until);
      return startYear !== null && year !== null && year <= startYear + 1;
    })
    .sort((a, b) => (b.current?.overall ?? 0) - (a.current?.overall ?? 0));

  const topPlayers = [...rows]
    .sort((a, b) => (b.current?.overall ?? 0) - (a.current?.overall ?? 0))
    .slice(0, 6);

  const matched = rows.filter((row) => row.player.fc_player_id).length;

  const highNeeds = needs.filter((need) => need.priority === "high");
  const mediumNeeds = needs.filter((need) => need.priority === "medium");
  const topNeed = highNeeds[0] ?? mediumNeeds[0] ?? null;

  const recommendation = (() => {
    if (!topNeed) {
      return "The squad is well covered in every key position. Use the transfer window to lower the average age or sell surplus players.";
    }
    const natural = rows.filter((row) => row.position === topNeed.position);
    const best = natural.sort((a, b) => (b.current?.overall ?? 0) - (a.current?.overall ?? 0))[0];
    const bestText = best
      ? `${best.player.name} (${best.current?.overall ?? "–"} OVR) is your best ${topNeed.position}`
      : `You have no natural ${topNeed.position}`;
    const contract = best ? contractLeft(best, startYear) : null;
    const contractText =
      contract && contract !== "expired" && best?.current?.contract_until
        ? ` and the contract expires in ${contract.replace(/^0y /, "")}`
        : "";
    return `${topNeed.position} is your biggest need. ${bestText}${contractText}. ${topNeed.reason}`;
  })();

  type Alert = {
    tone: "danger" | "warn" | "success";
    title: string;
    text: string;
    action: { label: string; to: string; search?: Record<string, string> };
  };

  const alerts: Alert[] = [];
  for (const need of highNeeds.slice(0, 2)) {
    alerts.push({
      tone: "danger",
      title: need.position,
      text: need.naturalCount === 0 ? "No natural player" : "No natural backup",
      action: { label: `Find ${need.position}`, to: "/karrierer/$id/marked", search: { position: need.position } },
    });
  }
  for (const need of mediumNeeds.slice(0, 2)) {
    alerts.push({
      tone: "warn",
      title: need.position,
      text: need.naturalCount === 1 ? "Only one natural player" : "Thin depth",
      action: { label: `Find ${need.position}`, to: "/karrierer/$id/marked", search: { position: need.position } },
    });
  }
  if (expiring.length > 0) {
    alerts.push({
      tone: "warn",
      title: "Contract",
      text: `${expiring.length} ${expiring.length === 1 ? "player" : "players"} expiring soon`,
      action: { label: "View players", to: "/karrierer/$id/trup" },
    });
  }
  alerts.push({
    tone: matched === rows.length ? "success" : "warn",
    title: "FC 26",
    text: `${matched}/${rows.length} matched in database`,
    action: { label: "Match squad", to: "/karrierer/$id/trup" },
  });

  const alertTone = {
    danger: "border-destructive/40 bg-destructive/10",
    warn: "border-warn/40 bg-warn/10",
    success: "border-primary/40 bg-primary/10",
  } as const;
  const alertText = {
    danger: "text-destructive",
    warn: "text-warn",
    success: "text-primary",
  } as const;
  const alertIcon = { danger: ShieldAlert, warn: AlertTriangle, success: CheckCircle2 } as const;

  const talents = [...(youth.data ?? [])]
    .sort((a, b) => (b.potential_max ?? b.overall ?? 0) - (a.potential_max ?? a.overall ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi value={String(rows.length)} label="Players" hint="in squad" icon={Users} />
        <Kpi
          value={avgOvr ? avgOvr.toFixed(1) : "–"}
          label="Avg. OVR"
          hint={
            ovrTrend != null && Math.abs(ovrTrend) >= 0.05
              ? `${ovrTrend > 0 ? "+" : ""}${ovrTrend.toFixed(1)} from season start`
              : null
          }
          hintTone={ovrTrend != null && ovrTrend > 0 ? "good" : "muted"}
          edge={ovrTrend != null && ovrTrend > 0 ? "good" : null}
          icon={Star}
        />
        <Kpi
          value={avgPot ? avgPot.toFixed(1) : "–"}
          label="Avg. POT"
          hint="average ceiling"
          icon={TrendingUp}
        />
        <Kpi
          value={avgAge ? avgAge.toFixed(1) : "–"}
          label="Avg. Age"
          hint={
            avgAge == null
              ? null
              : avgAge < 25
                ? "yrs · young squad"
                : avgAge > 29
                  ? "yrs · ageing squad"
                  : "yrs · balanced squad"
          }
          hintTone={avgAge != null && avgAge < 25 ? "good" : avgAge != null && avgAge > 29 ? "warn" : "muted"}
          edge={avgAge != null && avgAge < 25 ? "good" : avgAge != null && avgAge > 29 ? "warn" : null}
          icon={CalendarDays}
        />
        <Kpi
          value={formatMoney(totalValue || null)}
          label="Squad Value"
          hint={
            valueTrend != null && Math.abs(valueTrend) > 0
              ? `${valueTrend > 0 ? "+" : "-"}${formatMoney(Math.abs(valueTrend))} since start`
              : null
          }
          hintTone={valueTrend != null && valueTrend > 0 ? "good" : "muted"}
          edge={valueTrend != null && valueTrend > 0 ? "good" : null}
          icon={Coins}
        />
        <Kpi
          value={formatMoney(wageTotal || null)}
          label="Wage/Week"
          hint="total weekly wages"
          icon={Banknote}
        />
      </section>

      <section className="rounded-xl border border-primary/40 bg-primary/[0.06] p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="flex min-w-0 gap-3">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-primary">
                Career Chronicles recommends
              </h2>
              <p className="mt-1 font-body text-sm leading-relaxed text-foreground/90">
                {recommendation}
              </p>
            </div>
          </div>
          {topNeed && (
            <Button asChild variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
              <Link
                to="/karrierer/$id/marked"
                params={{ id }}
                search={{ position: topNeed.position }}
              >
                Find {topNeed.position}
              </Link>
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionTitle
            action={
              <Link
                to="/karrierer/$id/trup"
                params={{ id }}
                className="font-body text-xs text-muted-foreground hover:text-primary"
              >
                See full squad <ArrowRight className="inline h-3 w-3" aria-hidden />
              </Link>
            }
          >
            Top Players
          </SectionTitle>
          <ul className="divide-y divide-dash-border">
            {topPlayers.map((row, index) => (
              <li key={row.player.id} className="flex items-center gap-3 py-2.5">
                <span className="w-4 shrink-0 font-stat text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <PlayerAvatar name={row.player.name} src={row.fc?.face_url ?? null} size="sm" />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/karrierer/$id/spiller/$playerId"
                    params={{ id, playerId: row.player.id }}
                    className="block truncate font-body text-sm font-medium hover:text-primary"
                  >
                    {row.player.name}
                  </Link>
                  <span className="mt-1 flex gap-1">
                    <PosBadge position={row.position} />
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <p className="stat-number text-base font-semibold text-primary">
                    {row.current?.overall ?? "–"}
                  </p>
                  <p className="font-stat text-[11px] text-muted-foreground">
                    POT {row.potential ?? row.current?.potential ?? "–"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle>Alerts</SectionTitle>
          <ul className="space-y-2.5">
            {alerts.map((alert, index) => {
              const Icon = alertIcon[alert.tone];
              return (
                <li
                  key={`${alert.title}-${index}`}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 ${alertTone[alert.tone]}`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Icon className={`h-4 w-4 shrink-0 ${alertText[alert.tone]}`} aria-hidden />
                    <p className="min-w-0 font-body text-sm">
                      <span className={`font-semibold ${alertText[alert.tone]}`}>{alert.title}</span>
                      <span className="text-muted-foreground"> · {alert.text}</span>
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    {alert.action.search ? (
                      <Link
                        to="/karrierer/$id/marked"
                        params={{ id }}
                        search={{ position: alert.action.search["position"] ?? "" }}
                      >
                        {alert.action.label}
                      </Link>
                    ) : (
                      <Link to="/karrierer/$id/trup" params={{ id }}>
                        {alert.action.label}
                      </Link>
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <SectionTitle>Squad Distribution</SectionTitle>
          <ul className="space-y-4">
            {DISTRIBUTION.map(({ label, group }) => {
              const positions = POSITION_GROUPS[group] ?? [];
              const groupRows = rows.filter(
                (row) => row.position && positions.includes(row.position),
              );
              const groupAvg = averageOf(groupRows.map((row) => row.current?.overall));
              const share =
                rows.length > 0 ? Math.round((groupRows.length / rows.length) * 100) : 0;
              return (
                <li key={label}>
                  <div className="flex items-end justify-between gap-3">
                    <span className="font-body text-sm">{label}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-stat text-[11px] text-muted-foreground">
                        Avg OVR {groupAvg ? Math.round(groupAvg) : "–"}
                      </span>
                      <span className="stat-number text-base font-semibold">
                        {groupRows.length}
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-dash-elevated">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, share * 2.5)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {talents.length > 0 && (
          <Card>
            <SectionTitle
              action={
                <Link
                  to="/karrierer/$id/akademi"
                  params={{ id }}
                  className="font-body text-xs text-muted-foreground hover:text-primary"
                >
                  See academy <ArrowRight className="inline h-3 w-3" aria-hidden />
                </Link>
              }
            >
              Academy&apos;s Best Talents
            </SectionTitle>
            <p className="-mt-3 mb-3 font-body text-xs text-muted-foreground">
              Sorted by max. potential
            </p>
            <ul className="divide-y divide-dash-border">
              {talents.map((talent) => (
                <li key={talent.id} className="flex items-center gap-3 py-2.5">
                  <PlayerAvatar name={talent.name} src={talent.photo_data_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-medium">{talent.name}</p>
                    <span className="mt-1 flex items-center gap-2">
                      <PosBadge position={normalizePosition(talent.position)} />
                      <span className="font-stat text-[11px] text-muted-foreground">
                        {talent.age} yrs
                      </span>
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="stat-number text-base font-semibold">{talent.overall ?? "–"}</p>
                    <p className="font-stat text-[11px] text-primary">
                      {talent.potential_min ?? "–"} – {talent.potential_max ?? "–"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {expiring.length > 0 && (
          <Card>
            <SectionTitle
              action={
                <GraduationCap className="hidden h-4 w-4 text-muted-foreground" aria-hidden />
              }
            >
              Expiring Contracts
            </SectionTitle>
            <ul className="divide-y divide-dash-border">
              {expiring.slice(0, 6).map((row) => (
                <li key={row.player.id} className="flex items-center gap-3 py-2.5">
                  <PlayerAvatar name={row.player.name} src={row.fc?.face_url ?? null} size="sm" />
                  <PosBadge position={row.position} />
                  <Link
                    to="/karrierer/$id/spiller/$playerId"
                    params={{ id, playerId: row.player.id }}
                    className="min-w-0 flex-1 truncate font-body text-sm font-medium hover:text-primary"
                  >
                    {row.player.name}
                  </Link>
                  <span className="stat-number text-sm font-semibold">
                    {row.current?.overall ?? "–"}
                  </span>
                  <span className="shrink-0 rounded border border-warn/40 bg-warn/10 px-2 py-1 font-stat text-[11px] text-warn">
                    {contractLeft(row, startYear) ?? row.current?.contract_until ?? "–"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
