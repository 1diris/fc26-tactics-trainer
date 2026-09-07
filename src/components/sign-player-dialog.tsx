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
import { signMarketPlayer, type MarketPlayer } from "@/lib/market.functions";
import { formatMoney, formatWage, normalizePosition } from "@/lib/football";

type Props = {
  careerId: string;
  seasonId: string | null;
  seasonLabel: string | null;
  player: MarketPlayer | null;
  budget: number | null;
  onOpenChange: (open: boolean) => void;
};

/** Signs a market player into the squad, with an editable transfer fee. */
export function SignPlayerDialog({
  careerId,
  seasonId,
  seasonLabel,
  player,
  budget,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const sign = useServerFn(signMarketPlayer);
  const [fee, setFee] = useState("");
  const [shirt, setShirt] = useState("");

  useEffect(() => {
    if (!player) return;
    setFee(player.value_eur == null ? "" : String(Math.round(Number(player.value_eur))));
    setShirt("");
  }, [player]);

  const feeNumber = fee.trim() === "" ? 0 : Number(fee.replaceAll(".", "").replace(",", "."));
  const feeInvalid = !Number.isFinite(feeNumber) || feeNumber < 0;
  const overBudget = budget != null && !feeInvalid && feeNumber > budget;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!player || !seasonId) throw new Error("No season selected.");
      return sign({
        data: {
          careerId,
          seasonId,
          fcPlayerId: player.id,
          fee: feeInvalid ? 0 : feeNumber,
          shirtNumber: shirt.trim() === "" ? null : Number(shirt),
        },
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["career", careerId] });
      await queryClient.invalidateQueries({ queryKey: ["transfer-targets", careerId] });
      await router.invalidate();
      toast.success(
        result.alreadyInSquad
          ? `${result.name} was already in the squad and has been updated.`
          : `${result.name} has been signed to the squad.`,
      );
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const position = player ? normalizePosition(player.positions?.[0] ?? null) : null;

  return (
    <Dialog open={player !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign to squad</DialogTitle>
          <DialogDescription>
            {player
              ? `${player.short_name} · ${player.overall ?? "–"} OVR / POT ${player.potential ?? "–"} · ${player.age ?? "–"} yrs · ${position ?? "–"}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {player && (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Value {formatMoney(player.value_eur == null ? null : Number(player.value_eur))}{" "}
              · Wage {formatWage(player.wage_eur == null ? null : Number(player.wage_eur))} · Contract expiry{" "}
              {player.contract_until ?? "–"}
            </p>

            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                Transfer fee (EUR)
              </span>
              <Input
                inputMode="numeric"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
                placeholder="0"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                Shirt number (optional)
              </span>
              <Input
                inputMode="numeric"
                value={shirt}
                onChange={(event) => setShirt(event.target.value)}
                placeholder="–"
              />
            </label>

            <p className="text-xs text-muted-foreground">
              Season: {seasonLabel ?? "–"} · Budget {budget == null ? "–" : formatMoney(budget)}
            </p>

            {feeInvalid && (
              <p className="text-xs text-destructive">The transfer fee must be a positive number.</p>
            )}
            {overBudget && (
              <p className="text-xs text-destructive">
                The transfer fee exceeds your budget — the budget will be set to 0.
              </p>
            )}
            {!seasonId && (
              <p className="text-xs text-destructive">
                Create a season in the career before you can sign players to the squad.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || feeInvalid || !seasonId}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Signing…" : "Sign to squad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
