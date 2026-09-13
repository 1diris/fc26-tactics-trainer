import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeftRight,
  LayoutGrid,
  Star,
  Target,
  Upload,
  Users,
} from "lucide-react";
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

const NAV_ITEMS = [
  { to: "/karrierer/$id", label: "Overview", exact: true, Icon: LayoutGrid },
  { to: "/karrierer/$id/trup", label: "Squad", exact: false, Icon: Users },
  { to: "/karrierer/$id/taktik", label: "Tactics", exact: false, Icon: Target },
  { to: "/karrierer/$id/akademi", label: "Academy", exact: false, Icon: Star },
  { to: "/karrierer/$id/marked", label: "Transfers", exact: false, Icon: ArrowLeftRight },
  { to: "/karrierer/$id/import", label: "Import", exact: false, Icon: Upload },
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
    <div className="min-h-screen bg-dash-bg">
      <AppHeader />
      <div className="border-b border-border/60 bg-card/20">
        <div className="mx-auto max-w-6xl px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {data.career.league ?? "Career"}
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
                  <SelectTrigger aria-label="Active season">
                    <SelectValue placeholder="Season" />
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

          <nav className="mt-5 hidden border-b border-white/[0.06] sm:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                params={{ id }}
                activeOptions={{ exact: item.exact }}
                className="group relative px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground/80 data-[status=active]:text-foreground"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 right-0 hidden h-0.5 rounded-t-full bg-primary group-data-[status=active]:block" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-5 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-8">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 border-t border-white/[0.06] bg-dash-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
        style={{ minHeight: "calc(3.5rem + env(safe-area-inset-bottom))" }}
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            params={{ id }}
            activeOptions={{ exact: item.exact }}
            className="flex min-h-11 flex-col items-center justify-center gap-1 py-2 text-muted-foreground transition-colors data-[status=active]:text-primary"
          >
            <item.Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

    </div>
  );
}
