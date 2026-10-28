import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { challenges, currentRank, score, type Completion } from "@/lib/challenges/catalogue";
import { getCareerChallenges, startChallenge } from "@/lib/challenges.functions";

export function CareerChallengeCard({ careerId, club, seasonIndex }: { careerId: string; club: string; seasonIndex: number }) {
  const fetchRuns = useServerFn(getCareerChallenges);
  const start = useServerFn(startChallenge);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const runs = useQuery({ queryKey: ["career-challenges", careerId], queryFn: () => fetchRuns({ data: { careerId } }) });
  const startMutation = useMutation({
    mutationFn: (challengeId: string) => start({ data: { challengeId, careerId } }),
    onSuccess: (_r, challengeId) => {
      queryClient.invalidateQueries({ queryKey: ["career-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["challenge", challengeId] });
      navigate({ to: "/challenges/$challengeId", params: { challengeId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = runs.data?.[0];
  const challenge = run ? challenges.find((c) => c.id === run.challenge_id) : undefined;

  if (runs.isLoading) return null;

  if (run && challenge) {
    const completions = (run.completions ?? {}) as Record<string, Completion>;
    const points = score(challenge, completions, run.penalty_count);
    const rank = currentRank(challenge, points);
    const season = Math.min(Math.max(seasonIndex, 1), challenge.seasons);
    const open = (challenge.seasonGoals.find((s) => s.season === season)?.goals ?? []).filter((g) => !completions[g.id]?.completed).slice(0, 3);
    const pct = Math.max(0, Math.min(100, (points / challenge.maxPoints) * 100));
    return (
      <section className="rounded-2xl border border-ov-border bg-ov-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[13px] text-ov-muted"><Trophy className="size-4 text-ov-accent" />Challenge · Season {season}</p>
            <h2 className="mt-1 font-tight text-lg font-semibold tracking-[-0.03em]">{challenge.title}</h2>
            <p className="mt-1 text-sm text-ov-muted">{rank?.title} · {run.penalty_count} house-rule penalt{run.penalty_count === 1 ? "y" : "ies"}</p>
          </div>
          <p className="font-tight text-2xl font-bold tracking-[-0.03em]">{points} <span className="text-base text-ov-muted">/ {challenge.maxPoints} p</span></p>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-ov-control"><div className="h-full bg-ov-accent" style={{ width: `${pct}%` }} /></div>
        {open.length > 0 && (
          <ul className="mt-4 divide-y divide-ov-line">
            {open.map((g) => <li key={g.id} className="flex justify-between gap-3 py-2 text-sm"><span>{g.text}</span><span className="shrink-0 text-ov-muted">{g.points} p</span></li>)}
          </ul>
        )}
        <Link to="/challenges/$challengeId" params={{ challengeId: challenge.id }} className="mt-4 inline-flex h-11 items-center rounded-[10px] border border-ov-control px-4 text-sm font-medium">Open challenge</Link>
      </section>
    );
  }

  const clubLower = club.trim().toLowerCase();
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ov-border bg-ov-card px-6 py-5">
      <div className="flex items-center gap-3"><Trophy className="size-5 text-ov-accent" /><div><h2 className="font-body text-[15px] font-semibold">Challenge</h2><p className="text-sm text-ov-muted">Add a challenge to track goals for this career.</p></div></div>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center rounded-[10px] border border-ov-control px-4 text-sm font-medium">Add challenge</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-ov-border bg-ov-card text-ov-text">
          <DialogHeader><DialogTitle>Add challenge</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {challenges.map((c) => (
              <div key={c.id} className="rounded-xl border border-ov-border p-4">
                {c.club.toLowerCase() === clubLower && <p className="mb-1 text-xs text-ov-accent">Recommended for your club</p>}
                <p className="font-tight font-semibold">{c.title}</p>
                <p className="text-sm text-ov-muted">{c.club} · {c.seasons} seasons · {c.maxPoints} p</p>
                <button type="button" disabled={startMutation.isPending} onClick={() => startMutation.mutate(c.id)} className="mt-3 inline-flex h-11 items-center gap-2 rounded-[10px] bg-ov-accent px-4 text-sm font-semibold text-ov-bg">
                  {startMutation.isPending && <Loader2 className="size-4 animate-spin" />}Start challenge
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
