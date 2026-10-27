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
  LayoutGrid,
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
    <span className="shrink-0 rounded-md border border-ov-control px-1.5 py-0.5 text-[11px] leading-none text-ov-muted">
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

const OUTLINE_BTN =
  "inline-flex h-10 shrink-0 items-center rounded-[10px] border border-ov-control bg-transparent px-4 text-sm font-medium text-ov-text transition-colors hover:border-ov-muted";

const POSITION_NAMES: Record<string, string> = {
  GK: "goalkeeper", RB: "right back", LB: "left back", CB: "centre back", RWB: "right wing back",
  LWB: "left wing back", CDM: "defensive midfielder", CM: "central midfielder",
  CAM: "attacking midfielder", RM: "right midfielder", LM: "left midfielder", RW: "right winger",
  LW: "left winger", CF: "centre forward", ST: "striker",
};

/** Muted second line for an alert row. */
function alertDetail(title: string, text: string): string {
  const name = POSITION_NAMES[title];
  if (!name) return text;
  if (text === "No natural player") return `No natural ${name} in the squad`;
  if (text === "No natural backup") return `No backup for your ${name}`;
  return `Only one natural ${name}`;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-ov-border bg-ov-card p-6 ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">{children}</h2>
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
    text: `${matched} of ${rows.length} players matched`,
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

  const recSplit = recommendation.indexOf(". ");
  const recTitle = topNeed
    ? recommendation.slice(0, recSplit)
    : "Squad is well covered";
  const recBody = topNeed ? recommendation.slice(recSplit + 2) : recommendation;

  const openAlerts = alerts.filter((alert) => alert.tone !== "success").length;
  const ageNote =
    avgAge == null ? null : avgAge < 25 ? "Young squad" : avgAge > 29 ? "Ageing squad" : null;
  const topOvr = topPlayers[0]?.current?.overall ?? null;

  const stats: { label: string; value: string; note?: string | null; noteTone?: "good" | "muted" }[] = [
    { label: "Players", value: String(rows.length) },
    {
      label: "Avg. OVR",
      value: avgOvr ? avgOvr.toFixed(1) : "–",
      note:
        ovrTrend != null && Math.abs(ovrTrend) >= 0.05
          ? `${ovrTrend > 0 ? "+" : ""}${ovrTrend.toFixed(1)} from season start`
          : null,
      noteTone: ovrTrend != null && ovrTrend > 0 ? "good" : "muted",
    },
    { label: "Avg. POT", value: avgPot ? avgPot.toFixed(1) : "–" },
    {
      label: "Avg. age",
      value: avgAge ? avgAge.toFixed(1) : "–",
      note: ageNote,
      noteTone: ageNote === "Young squad" ? "good" : "muted",
    },
    {
      label: "Squad value",
      value: formatMoney(totalValue || null),
      note:
        valueTrend != null && Math.abs(valueTrend) > 0
          ? `${valueTrend > 0 ? "+" : "-"}${formatMoney(Math.abs(valueTrend))} since start`
          : null,
      noteTone: valueTrend != null && valueTrend > 0 ? "good" : "muted",
    },
    { label: "Wages / week", value: formatMoney(wageTotal || null) },
  ];

  return (
    <div className="space-y-6 pb-24 font-body text-ov-text lg:pb-8">
      <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-ov-border bg-ov-card sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={[
              "border-ov-border px-6 py-6",
              index % 2 === 1 ? "border-l" : "",
              index >= 2 ? "border-t sm:border-t-0" : "",
              "sm:border-l-0",
              index % 3 !== 0 ? "sm:border-l" : "",
              index >= 3 ? "sm:border-t xl:border-t-0" : "",
              index > 0 ? "xl:border-l" : "xl:border-l-0",
            ].join(" ")}
          >
            <p className="text-[13px] text-ov-muted">{stat.label}</p>
            <p className="mt-2 font-tight text-3xl font-bold tracking-[-0.03em] sm:text-[34px] sm:leading-none">
              {stat.value}
            </p>
            {stat.note && (
              <p className={`mt-2 text-xs ${stat.noteTone === "good" ? "text-ov-accent" : "text-ov-muted"}`}>
                {stat.note}
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ov-border bg-ov-card px-6 py-[22px]">
        <div className="flex min-w-0 flex-1 gap-3">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-ov-accent" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-body text-[15px] font-semibold tracking-normal">{recTitle}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ov-muted">{recBody}</p>
          </div>
        </div>
        {topNeed && (
          <Link
            to="/karrierer/$id/marked"
            params={{ id }}
            search={{ position: topNeed.position }}
            className="inline-flex h-11 shrink-0 items-center rounded-[10px] bg-ov-accent px-5 text-sm font-semibold text-ov-bg transition-opacity hover:opacity-90"
          >
            Find {topNeed.position}
          </Link>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <section className="overflow-hidden rounded-2xl border border-ov-border bg-ov-card">
          <div className="flex items-center justify-between gap-3 border-b border-ov-line px-6 py-5">
            <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">Top players</h2>
            <Link
              to="/karrierer/$id/trup"
              params={{ id }}
              className="text-sm text-ov-muted hover:text-ov-text"
            >
              See full squad <ArrowRight className="inline h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ov-line text-xs text-ov-muted">
                <th className="w-12 py-3 pl-6 text-left font-normal">#</th>
                <th className="py-3 text-left font-normal">Player</th>
                <th className="w-16 py-3 text-right font-normal">OVR</th>
                <th className="w-16 py-3 pr-6 text-right font-normal">POT</th>
              </tr>
            </thead>
            <tbody>
              {topPlayers.map((row, index) => {
                const ovr = row.current?.overall ?? null;
                const pot = row.potential ?? row.current?.potential ?? null;
                return (
                  <tr key={row.player.id} className="border-b border-ov-line last:border-b-0">
                    <td className="py-4 pl-6 text-ov-muted">{index + 1}</td>
                    <td className="py-4">
                      <span className="flex min-w-0 items-center gap-2">
                        <Link
                          to="/karrierer/$id/spiller/$playerId"
                          params={{ id, playerId: row.player.id }}
                          className="truncate font-medium hover:text-ov-accent"
                        >
                          {row.player.name}
                        </Link>
                        <PosBadge position={row.position} />
                      </span>
                    </td>
                    <td
                      className={`py-4 text-right font-tight text-lg font-semibold ${
                        ovr != null && topOvr != null && ovr >= topOvr - 1 ? "text-ov-accent" : ""
                      }`}
                    >
                      {ovr ?? "–"}
                    </td>
                    <td className="py-4 pr-6 text-right text-ov-muted">{pot ?? "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="overflow-hidden rounded-2xl border border-ov-border bg-ov-card">
          <div className="flex items-center justify-between gap-3 border-b border-ov-line px-6 py-5">
            <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">Alerts</h2>
            <span className="text-sm text-ov-muted">{openAlerts} open</span>
          </div>
          <ul>
            {alerts.map((alert, index) => {
              const isDb = alert.title === "FC 26";
              const title = isDb ? "FC 26 database" : `${alert.title} · ${alert.text}`;
              const detail = isDb ? alert.text : alertDetail(alert.title, alert.text);
              return (
                <li
                  key={`${alert.title}-${index}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-ov-line px-6 py-5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isDb ? "bg-ov-muted" : "bg-ov-warn"}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{title}</p>
                      <p className="mt-0.5 text-[13px] text-ov-muted">{detail}</p>
                    </div>
                  </div>
                  {alert.action.search ? (
                    <Link
                      to="/karrierer/$id/marked"
                      params={{ id }}
                      search={{ position: alert.action.search["position"] ?? "" }}
                      className={OUTLINE_BTN}
                    >
                      {alert.action.label}
                    </Link>
                  ) : (
                    <Link to="/karrierer/$id/trup" params={{ id }} className={OUTLINE_BTN}>
                      {alert.action.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">


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
                      className="h-full rounded-full bg-ov-accent"
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
