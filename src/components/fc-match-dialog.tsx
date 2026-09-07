import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchFcPlayersByName, setPlayerFcMatch } from "@/lib/fc-match.functions";
import { formatMoney } from "@/lib/football";
import type { FcOriginal } from "@/lib/valuation";

type Props = {
  careerId: string;
  playerId: string;
  playerName: string;
  currentMatch: FcOriginal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Manual link between a career player and a player in the FC 26 database. */
export function FcMatchDialog({
  careerId,
  playerId,
  playerName,
  currentMatch,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const search = useServerFn(searchFcPlayersByName);
  const save = useServerFn(setPlayerFcMatch);
  const [term, setTerm] = useState(playerName);
  const [results, setResults] = useState<FcOriginal[] | null>(null);

  const searchMutation = useMutation({
    mutationFn: async () => {
      const rows = await search({ data: { query: term.trim(), limit: 25 } });
      return rows as unknown as FcOriginal[];
    },
    onSuccess: (rows) => setResults(rows),
    onError: (error: Error) => toast.error(error.message),
  });

  const saveMutation = useMutation({
    mutationFn: (fcPlayerId: string | null) => save({ data: { playerId, fcPlayerId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["career", careerId] });
      toast.success("Match updated.");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Match {playerName}</DialogTitle>
          <DialogDescription>
            Select the correct player in the FC 26 database so the original POT and value are accurate.
          </DialogDescription>
        </DialogHeader>

        {currentMatch && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
            <span>
              Matched with <strong>{currentMatch.short_name}</strong> · OVR {currentMatch.overall} ·
              POT {currentMatch.potential}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => saveMutation.mutate(null)}
              disabled={saveMutation.isPending}
            >
              Remove match
            </Button>
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (term.trim().length >= 2) searchMutation.mutate();
          }}
        >
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search name in the FC 26 database…"
            aria-label="Search the FC 26 database"
          />
          <Button type="submit" disabled={searchMutation.isPending || term.trim().length < 2}>
            {searchMutation.isPending ? "Searching…" : "Search"}
          </Button>
        </form>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {results?.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">No players found.</p>
          )}
          {(results ?? []).map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => saveMutation.mutate(candidate.id)}
              disabled={saveMutation.isPending}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/50 p-2.5 text-left text-sm hover:border-primary/60 hover:bg-muted/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{candidate.short_name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {(candidate.positions ?? []).join("/")} · {candidate.club_name ?? "free agent"} ·{" "}
                  {candidate.age ?? "–"} yrs
                </span>
              </span>
              <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                <span className="block font-semibold text-foreground">
                  {candidate.overall} / {candidate.potential}
                </span>
                {formatMoney(candidate.value_eur)}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
