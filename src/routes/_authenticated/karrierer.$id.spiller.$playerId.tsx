import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { careerDataQuery } from "@/lib/career-queries";
import { deletePlayer, updatePlayer } from "@/lib/career.functions";
import { sortedSeasons } from "@/lib/squad";
import { formatMoney, formatWage, positionGroup } from "@/lib/football";
import { estimateCareerValue, originalPotential, type FcOriginal } from "@/lib/valuation";
import { FcMatchDialog } from "@/components/fc-match-dialog";
import { SellPlayerDialog } from "@/components/sell-player-dialog";

import { ArrowLeft, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/karrierer/$id/spiller/$playerId")({
  head: () => ({
    meta: [
      { title: "Spillerprofil — Career Chronicles" },
      {
        name: "description",
        content:
          "Følg en enkelt spillers udvikling gennem sæsoner: overall, potentiale, værdi, løn og kontrakt.",
      },
      { property: "og:title", content: "Spillerprofil — Career Chronicles" },
      {
        property: "og:description",
        content: "Sæson-for-sæson udvikling for din FC 26 spiller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { id, playerId } = useParams({
    from: "/_authenticated/karrierer/$id/spiller/$playerId",
  });
  const { data } = useSuspenseQuery(careerDataQuery(id));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const update = useServerFn(updatePlayer);
  const remove = useServerFn(deletePlayer);
  const [editing, setEditing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [selling, setSelling] = useState(false);


  const player = data.players.find((entry) => entry.id === playerId);
  const seasons = sortedSeasons(data.seasons);
  const activeSeason =
    seasons.find((season) => season.id === data.career.current_season_id) ?? seasons[0];

  if (!player) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="font-display text-lg font-semibold">Spilleren blev ikke fundet</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/karrierer/$id/trup" params={{ id }}>
            Tilbage til truppen
          </Link>
        </Button>
      </div>
    );
  }

  const history = seasons
    .map((season) => ({
      season,
      snapshot:
        data.snapshots.find(
          (entry) => entry.player_id === playerId && entry.season_id === season.id,
        ) ?? null,
    }))
    .filter((entry) => entry.snapshot !== null);

  const current =
    data.snapshots.find(
      (entry) => entry.player_id === playerId && entry.season_id === activeSeason?.id,
    ) ?? null;

  const fc: FcOriginal | null = player.fc_player_id
    ? ((data.fcPlayers.find((entry) => entry.id === player.fc_player_id) as FcOriginal | undefined) ??
      null)
    : null;
  const potential = originalPotential(fc, current?.potential);
  const estimatedValue = estimateCareerValue({
    currentOverall: current?.overall,
    currentAge: current?.age,
    snapshotValue: current?.market_value,
    position: current?.position ?? player.primary_position,
    fc,
  });

  const overalls = history
    .map((entry) => entry.snapshot?.overall)
    .filter((value): value is number => typeof value === "number");
  const minOvr = overalls.length > 0 ? Math.min(...overalls) : 0;
  const maxOvr = overalls.length > 0 ? Math.max(...overalls) : 0;

  const [form, setForm] = useState({
    name: player.name,
    position: current?.position ?? player.primary_position ?? "",
    overall: current?.overall ?? null,
    potential: current?.potential ?? null,
    age: current?.age ?? null,
    market_value: current?.market_value ?? null,
    wage: current?.wage ?? null,
    contract_until: current?.contract_until ?? "",
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!activeSeason) throw new Error("Ingen aktiv sæson.");
      return update({
        data: {
          careerId: id,
          playerId,
          seasonId: activeSeason.id,
          values: {
            name: form.name,
            position: form.position || null,
            overall: form.overall,
            potential: form.potential,
            age: form.age,
            market_value: form.market_value,
            wage: form.wage,
            contract_until: form.contract_until || null,
          },
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["career", id] });
      setEditing(false);
      toast.success("Spiller opdateret.");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => remove({ data: { playerId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["career", id] });
      toast.success("Spiller slettet.");
      void navigate({ to: "/karrierer/$id/trup", params: { id } });
    },
    onError: (error) => toast.error(error.message),
  });

  const numberInput = (
    field: "overall" | "potential" | "age" | "market_value" | "wage",
    label: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        type="number"
        value={form[field] ?? ""}
        onChange={(event) =>
          setForm((prev) => ({
            ...prev,
            [field]: event.target.value === "" ? null : Number(event.target.value),
          }))
        }
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/karrierer/$id/trup"
            params={{ id }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Truppen
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{player.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {current?.position ?? player.primary_position ?? "Ukendt position"}
            {current?.position || player.primary_position
              ? ` · ${positionGroup(current?.position ?? player.primary_position)}`
              : ""}
            {player.nationality ? ` · ${player.nationality}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? "Luk" : "Ret data"}
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (window.confirm(`Slet ${player.name} og al historik?`)) deleteMutation.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Overall", value: current?.overall ?? "–" },
          { label: "Potentiale (FC 26)", value: potential ?? "–" },
          { label: "Alder", value: current?.age ?? "–" },
          { label: "Værdi (est.)", value: formatMoney(estimatedValue) },
          { label: "Løn", value: formatWage(current?.wage) },
          { label: "Kontrakt", value: current?.contract_until ?? "–" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="mt-2 font-display text-xl font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">FC 26-data</h2>
          <Button variant="outline" size="sm" onClick={() => setMatching(true)}>
            {fc ? "Skift match" : "Match spiller"}
          </Button>
        </div>
        {fc ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Matchet med {fc.long_name ?? fc.short_name}
              {player.fc_match_source === "manual" ? " (manuelt valgt)" : " (automatisk match)"}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Nøgletal</th>
                    <th className="px-3 py-2 text-right font-medium">FC 26 (original)</th>
                    <th className="px-3 py-2 text-right font-medium">Din karriere</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "OVR", original: fc.overall ?? "–", now: current?.overall ?? "–" },
                    { label: "POT", original: fc.potential ?? "–", now: potential ?? "–" },
                    { label: "Alder", original: fc.age ?? "–", now: current?.age ?? "–" },
                    {
                      label: "Værdi",
                      original: formatMoney(fc.value_eur),
                      now: formatMoney(estimatedValue),
                    },
                    {
                      label: "Klub",
                      original: fc.club_name ?? "–",
                      now: data.career.club,
                    },
                  ].map((entry) => (
                    <tr key={entry.label} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{entry.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{entry.original}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{entry.now}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Spilleren er ikke koblet til FC 26-databasen endnu. Match den for at se original
            potentiale og en estimeret karriereværdi.
          </p>
        )}
      </section>

      <FcMatchDialog
        careerId={id}
        playerId={playerId}
        playerName={player.name}
        currentMatch={fc}
        open={matching}
        onOpenChange={setMatching}
      />

      {editing && (
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="font-display text-lg font-semibold">
            Ret data for {activeSeason?.label ?? "sæson"}
          </h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              updateMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="name">Navn</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={form.position}
                onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
              />
            </div>
            {numberInput("overall", "Overall")}
            {numberInput("potential", "Potentiale")}
            {numberInput("age", "Alder")}
            {numberInput("market_value", "Markedsværdi (€)")}
            {numberInput("wage", "Løn pr. uge (€)")}
            <div className="space-y-2">
              <Label htmlFor="contract">Kontrakt til</Label>
              <Input
                id="contract"
                value={form.contract_until}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contract_until: event.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Gemmer…" : "Gem ændringer"}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-border/60 bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Udvikling</h2>
        {history.length < 1 ? (
          <p className="mt-3 text-sm text-muted-foreground">Ingen historik endnu.</p>
        ) : (
          <>
            <div className="mt-5 flex items-end gap-3">
              {history.map((entry) => {
                const overall = entry.snapshot?.overall ?? null;
                const range = Math.max(maxOvr - minOvr, 1);
                const height = overall ? 20 + ((overall - minOvr) / range) * 80 : 4;
                return (
                  <div key={entry.season.id} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {overall ?? "–"}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-primary/70"
                      style={{ height: `${height}px` }}
                    />
                    <span className="text-xs text-muted-foreground">{entry.season.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Sæson</th>
                    <th className="px-3 py-2 text-right font-medium">OVR</th>
                    <th className="px-3 py-2 text-right font-medium">POT</th>
                    <th className="px-3 py-2 text-right font-medium">Alder</th>
                    <th className="px-3 py-2 text-right font-medium">Værdi</th>
                    <th className="px-3 py-2 text-right font-medium">Løn</th>
                    <th className="px-3 py-2 text-right font-medium">Kontrakt</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.season.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2">{entry.season.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {entry.snapshot?.overall ?? "–"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {entry.snapshot?.potential ?? "–"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {entry.snapshot?.age ?? "–"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(entry.snapshot?.market_value)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatWage(entry.snapshot?.wage)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {entry.snapshot?.contract_until ?? "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
