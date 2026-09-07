import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppHeader } from "@/components/app-header";
import { careersQuery } from "@/lib/career-queries";
import { createCareer, deleteCareer } from "@/lib/career.functions";
import { Plus, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/karrierer/")({
  head: () => ({
    meta: [
      { title: "Mine karrierer — Career Chronicles" },
      {
        name: "description",
        content: "Overview of your FC 26 careers, clubs and squad sizes.",
      },
      { property: "og:title", content: "Mine karrierer — Career Chronicles" },
      { property: "og:description", content: "All your FC 26 careers in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CareersPage,
});

function CareersPage() {
  const { data: careers } = useSuspenseQuery(careersQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const create = useServerFn(createCareer);
  const remove = useServerFn(deleteCareer);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [club, setClub] = useState("");
  const [league, setLeague] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("2025/26");

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          name: name.trim() || club.trim(),
          club: club.trim(),
          league: league.trim() || undefined,
          seasonLabel: seasonLabel.trim(),
        },
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["careers"] });
      setOpen(false);
      setName("");
      setClub("");
      setLeague("");
      toast.success("Karriere oprettet.");
      void navigate({
        to: "/karrierer/$id/import",
        params: { id: result.careerId },
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (careerId: string) => remove({ data: { careerId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["careers"] });
      toast.success("Karriere slettet.");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Mine karrierer</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              One career per save. Every season gets its own squad snapshot.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Ny karriere
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ny karriere</DialogTitle>
                <DialogDescription>
                  Enter club and starting season. You can add more seasons later.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  createMutation.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="club">Klub</Label>
                  <Input
                    id="club"
                    required
                    value={club}
                    placeholder="e.g. Wolves"
                    onChange={(event) => setClub(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Career name (optional)</Label>
                  <Input
                    id="name"
                    value={name}
                    placeholder="fx Rebuild med unge spillere"
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="league">Liga (valgfrit)</Label>
                    <Input
                      id="league"
                      value={league}
                      onChange={(event) => setLeague(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="season">Starting season</Label>
                    <Input
                      id="season"
                      required
                      value={seasonLabel}
                      onChange={(event) => setSeasonLabel(event.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Opretter…" : "Opret karriere"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {careers.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="font-display text-lg font-semibold">Ingen karrierer endnu</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Create your first career, upload a screenshot of the squad screen, and get the whole team in
              automatisk.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {careers.map((career) => (
              <li
                key={career.id}
                className="group relative rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
              >
                <Link
                  to="/karrierer/$id"
                  params={{ id: career.id }}
                  className="block focus-visible:outline-none"
                >
                  <p className="font-display text-lg font-semibold tracking-tight">
                    {career.club}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {career.name !== career.club ? career.name : (career.league ?? "Karriere")}
                  </p>
                  <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {career.player_count} spillere
                  </p>
                </Link>
                <button
                  type="button"
                  aria-label={`Slet ${career.club}`}
                  className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={() => {
                    if (window.confirm(`Slet karrieren "${career.club}" med alle data?`)) {
                      deleteMutation.mutate(career.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
