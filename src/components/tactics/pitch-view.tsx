import type { Fit } from "@/lib/formations";
import { PlayerAvatar } from "@/components/player-avatar";

export type PitchNode = {
  id: string;
  position: string;
  /** Percentages: x from left, y from own goal line (0) to opponent goal (100). */
  x: number;
  y: number;
  playerName: string | null;
  playerFullName?: string | null;
  faceUrl?: string | null;
  overall: number | null;
  roleLabel: string;
  mastery: "base" | "+" | "++";
  fit: Fit | null;
};

const fitRing: Record<Fit, string> = {
  natural: "border-lime-400/70",
  ok: "border-amber-400/70",
  out: "border-red-500/70",
};

export function PitchView({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: PitchNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-zinc-800 bg-[radial-gradient(ellipse_at_center,#123a1e_0%,#0a1f11_60%,#08150c_100%)]">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0_8%,transparent_8%_16%)]" />
      <div className="pointer-events-none absolute inset-2 rounded-md border border-lime-200/20" />
      <div className="pointer-events-none absolute inset-x-2 top-1/2 h-px bg-lime-200/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime-200/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-200/30" />
      <div className="pointer-events-none absolute inset-x-[22%] top-2 h-[15%] border-x border-b border-lime-200/20" />
      <div className="pointer-events-none absolute inset-x-[34%] top-2 h-[6%] border-x border-b border-lime-200/20" />
      <div className="pointer-events-none absolute inset-x-[22%] bottom-2 h-[15%] border-x border-t border-lime-200/20" />
      <div className="pointer-events-none absolute inset-x-[34%] bottom-2 h-[6%] border-x border-t border-lime-200/20" />

      {nodes.map((node) => {
        const active = node.id === selectedId;
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            style={{ left: `${node.x}%`, bottom: `${node.y}%` }}
            className="absolute flex -translate-x-1/2 translate-y-1/2 flex-col items-center gap-1 focus:outline-none"
          >
            <span
              className={`relative flex h-11 w-11 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                active
                  ? "border-lime-400 bg-lime-500 text-zinc-950 shadow-[0_0_22px_rgba(163,230,53,0.65)] ring-2 ring-lime-400"
                  : `bg-zinc-900/90 text-zinc-100 hover:border-lime-400/60 ${
                      node.fit ? fitRing[node.fit] : "border-zinc-700"
                    }`
              }`}
            >
              {node.position}
              {node.mastery !== "base" && (
                <span className="absolute -right-1 -top-1 rounded-full border border-lime-400/60 bg-zinc-950 px-1 text-[9px] font-bold text-lime-400">
                  {node.mastery}
                </span>
              )}
            </span>
            <span
              className={`max-w-[96px] truncate rounded px-1 text-[11px] font-medium leading-tight ${
                active ? "text-lime-300" : "text-zinc-100"
              }`}
            >
              {node.playerName ?? "Tom"}
              {node.overall != null && (
                <span className="ml-1 text-lime-400">{node.overall}</span>
              )}
            </span>
            <span className="max-w-[96px] truncate text-[10px] leading-tight text-zinc-400">
              {node.roleLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
