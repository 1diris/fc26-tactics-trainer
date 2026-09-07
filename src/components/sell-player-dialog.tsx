import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sellPlayer } from "@/lib/career.functions";
import { formatMoney } from "@/lib/football";

type Props = {
  careerId: string;
  playerId: string | null;
  playerName: string | null;
  suggestedFee: number | null;
  budget: number | null;
  onOpenChange: (open: boolean) => void;
  onSold?: () => void;
};

/** Sells a player out of the squad, adding the sale price to the transfer budget. */
export function SellPlayerDialog({
  careerId,
  playerId,
  playerName,
  suggestedFee,
  budget,
  onOpenChange,
  onSold,
}: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const sell = useServerFn(sellPlayer);
  const [fee, setFee] = useState("");

  useEffect(() => {
    if (!playerId) return;
    setFee(suggestedFee == null ? "" : String(Math.round(suggestedFee)));
  }, [playerId, suggestedFee]);

  const feeNumber = fee.trim() === "" ? 0 : Number(fee.replaceAll(".", "").replace(",", "."));
  const feeInvalid = !Number.isFinite(feeNumber) || feeNumber < 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!playerId) throw new Error("No player selected.");
      return sell({ data: { careerId, playerId, fee: feeInvalid ? 0 : feeNumber } });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["career", careerId] });
      await router.invalidate();
      toast.success(
        `${result.name} sold for ${formatMoney(result.fee)}` +
          (result.budget != null ? ` — budget now ${formatMoney(result.budget)}` : ""),
      );
      onOpenChange(false);
      onSold?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={playerId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sell player</DialogTitle>
          <DialogDescription>
            {playerName
              ? `${playerName} will be removed from the squad, and the sale fee will be added to the transfer budget.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              Sold for (EUR)
            </span>
            <Input
              inputMode="numeric"
              value={fee}
              onChange={(event) => setFee(event.target.value)}
              placeholder="0"
            />
          </label>

          <p className="text-xs text-muted-foreground">
            Estimated value {formatMoney(suggestedFee)} · Budget{" "}
            {budget == null ? "–" : formatMoney(budget)}
            {budget != null && !feeInvalid ? ` → ${formatMoney(budget + feeNumber)}` : ""}
          </p>

          {feeInvalid && (
            <p className="text-xs text-destructive">The sale fee must be a positive number.</p>
          )}
          <p className="text-xs text-muted-foreground">
            The player and his history will be deleted, and he will be removed from saved lineups.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending || feeInvalid}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Selling…" : "Sell player"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
