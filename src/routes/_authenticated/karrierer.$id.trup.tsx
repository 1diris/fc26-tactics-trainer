import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { careerDataQuery } from "@/lib/career-queries";
import { buildSquad, sortedSeasons, type SquadRow } from "@/lib/squad";
import { POSITION_GROUPS, formatMoney, formatWage, ovrTone } from "@/lib/football";

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

type SortKey = "name" | "position" | "overall" | "potential" | "age" | "market_value" | "wage";

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Spiller" },
  { key: "position", label: "Pos" },
  { key: "overall", label: "OVR", numeric: true },
  { key: "potential", label: "POT", numeric: true },
  { key: "age", label: "Alder", numeric: true },
  { key: "market_value", label: "Værdi", numeric: true },
  { key: "wage", label: "Løn", numeric: true },
];

function value(row: SquadRow, key: SortKey): string | number | null {
  switch (key) {
    case "name":
      return row.player.name.toLowerCase();
    case "position":
      return row.position ?? "";
    default:
      return row.current?.[key] ?? null;
  }
}

function SquadPage() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id/trup" });
  const { data } = useSuspenseQuery(careerDataQuery(id));
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("alle");
  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [asc, setAsc] = useState(false);

  const seasons = sortedSeasons(data.seasons);
  const activeSeason =
    seasons.find((season) => season.id === data.career.current_season_id) ?? seasons[0];

  const rows = useMemo(() => {
    const all = buildSquad(
      data.seasons,
      data.players,
      data.snapshots,
      activeSeason?.id ?? null,
    ).filter((row) => row.current !== null);

    const filtered = all.filter((row) => {
      const matchesSearch = row.player.name.toLowerCase().includes(search.trim().toLowerCase());
      const positions = group === "alle" ? null : POSITION_GROUPS[group];
      const matchesGroup = !positions || (row.position ? positions.includes(row.position) : false);
      return matchesSearch && matchesGroup;
    });

    return filtered.sort((a, b) => {
      const left = value(a, sortKey);
      const right = value(b, sortKey);
      if (left === null && right === null) return 0;
      if (left === null) return 1;
      if (right === null) return -1;
      const result = left < right ? -1 : left > right ? 1 : 0;
      return asc ? result : -result;
    });
  }, [data, activeSeason?.id, search, group, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(key === "name" || key === "position" || key === "age");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Søg spiller…"
          className="max-w-xs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger className="w-[180px]" aria-label="Filtrér på positionsgruppe">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle positioner</SelectItem>
            {Object.keys(POSITION_GROUPS).map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {rows.length} spillere · {activeSeason?.label ?? "ingen sæson"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Ingen spillere matcher filtrene.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
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
                  Kontrakt
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
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
                    {row.current?.potential ?? "–"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.current?.age ?? "–"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatMoney(row.current?.market_value)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {formatWage(row.current?.wage)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                    {row.current?.contract_until ?? "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
