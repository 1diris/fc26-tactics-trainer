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
    <div className="min-h-screen bg-ov-bg">
      <AppHeader />
      <div className="border-b border-ov-line bg-ov-bg font-body">
        <div className="mx-auto max-w-[1200px] px-5 pt-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs text-ov-muted">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ov-accent" />
                {data.career.league ?? "Career"}
              </p>
              <h1 className="mt-1 truncate font-tight text-3xl font-bold tracking-[-0.03em] text-ov-text sm:text-[40px] sm:leading-[1.1]">
                {data.career.club}
              </h1>
            </div>
            {seasons.length > 0 && (
              <div className="w-[140px] sm:w-[160px]">
                <p className="mb-1.5 text-xs text-ov-muted">Season</p>
                <Select
                  value={activeSeasonId}
                  onValueChange={(value) => seasonMutation.mutate(value)}
                >
                  <SelectTrigger
                    aria-label="Active season"
                    className="h-11 rounded-[10px] border-ov-control bg-ov-card font-medium text-ov-text"
                  >
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

          <nav className="-mx-5 mt-6 flex overflow-x-auto px-5 [scrollbar-width:none]">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                params={{ id }}
                activeOptions={{ exact: item.exact }}
                className="group relative mr-7 shrink-0 whitespace-nowrap py-3 text-[15px] text-ov-muted transition-colors hover:text-ov-text data-[status=active]:font-medium data-[status=active]:text-ov-text"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 right-0 hidden h-0.5 rounded-t-full bg-ov-accent group-data-[status=active]:block" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-[1200px] px-5 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-8">
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
