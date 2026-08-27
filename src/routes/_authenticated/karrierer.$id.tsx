import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/app-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { careerDataQuery } from "@/lib/career-queries";
import { setCurrentSeason } from "@/lib/career.functions";
import { sortedSeasons } from "@/lib/squad";

export const Route = createFileRoute("/_authenticated/karrierer/$id")({
  component: CareerLayout,
});

const tabs = [
  { to: "/karrierer/$id", label: "Overblik", exact: true },
  { to: "/karrierer/$id/trup", label: "Trup", exact: false },
  { to: "/karrierer/$id/taktik", label: "Taktik", exact: false },
  { to: "/karrierer/$id/marked", label: "Transfermarked", exact: false },
  { to: "/karrierer/$id/import", label: "Import", exact: false },
] as const;

function CareerLayout() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id" });
  const { data } = useSuspenseQuery(careerDataQuery(id));
  const queryClient = useQueryClient();
  const changeSeason = useServerFn(setCurrentSeason);

  const seasons = sortedSeasons(data.seasons);
  const activeSeasonId = data.career.current_season_id ?? seasons[0]?.id ?? "";

  const seasonMutation = useMutation({
    mutationFn: (seasonId: string) => changeSeason({ data: { careerId: id, seasonId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["career", id] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="border-b border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {data.career.league ?? "Karriere"}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
                {data.career.club}
              </h1>
            </div>
            {seasons.length > 0 && (
              <div className="min-w-[180px]">
                <Select
                  value={activeSeasonId}
                  onValueChange={(value) => seasonMutation.mutate(value)}
                >
                  <SelectTrigger aria-label="Vælg sæson">
                    <SelectValue placeholder="Sæson" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <nav className="mt-5 flex gap-1">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                params={{ id }}
                activeOptions={{ exact: tab.exact }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
