import { useState } from "react";
import type { Fit } from "@/lib/formations";

export type PitchNode = {
  id: string;
  position: string;
  /** Percentages: x from left, y from own goal line (0) to opponent goal (100). */
  x: number;
  y: number;
  playerId: string | null;
  playerName: string | null;
  playerFullName?: string | null;
  faceUrl?: string | null;
  overall: number | null;
  roleLabel: string;
  mastery: "base" | "+" | "++";
  fit: Fit | null;
  /** Ring colour: top rated (green), weak spot (orange) or normal (grey). */
  tone?: "top" | "weak" | "normal";
};

export type DropPayload = {
  playerId: string;
  sourceSlotId: string | null;
};

const toneRing = {
  top: "border-ov-accent",
  weak: "border-ov-warn",
  normal: "border-[#3a3a3a]",
} as const;

const LINE = "pointer-events-none absolute border-[#262626]";

export function PitchView({
  nodes,
  selectedId,
  onSelect,
  onDropOnSlot,
}: {
  nodes: PitchNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDropOnSlot: (targetSlotId: string, payload: DropPayload) => void;
}) {
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  function handleDrop(targetSlotId: string, event: React.DragEvent) {
    event.preventDefault();
    setDragOverSlot(null);
    try {
      const raw = event.dataTransfer.getData("application/json");
      if (!raw) return;
      const payload = JSON.parse(raw) as DropPayload;
      if (!payload.playerId) return;
      onDropOnSlot(targetSlotId, payload);
    } catch {
      // Ignore malformed drag payloads.
    }
  }

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#0d0d0d]">
      <div className={`${LINE} inset-3 rounded-sm border`} />
      <div className={`${LINE} inset-x-3 top-1/2 border-t`} />
      <div className={`${LINE} left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border`} />
      <div className={`${LINE} inset-x-[22%] top-3 h-[15%] border-x border-b`} />
      <div className={`${LINE} inset-x-[36%] top-3 h-[6%] border-x border-b`} />
      <div className={`${LINE} inset-x-[22%] bottom-3 h-[15%] border-x border-t`} />
      <div className={`${LINE} inset-x-[36%] bottom-3 h-[6%] border-x border-t`} />

      <div className="absolute inset-x-[6%] bottom-[7%] top-[5%]">
      {nodes.map((node) => {
        const active = node.id === selectedId;
        const dragOver = node.id === dragOverSlot;
        const occupied = Boolean(node.playerName && node.playerId);
        const ring = occupied ? toneRing[node.tone ?? "normal"] : "border-dashed border-[#3a3a3a]";
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            draggable={occupied}
            onDragStart={(event) => {
              if (!occupied) return;
              event.dataTransfer.setData(
                "application/json",
                JSON.stringify({ playerId: node.playerId, sourceSlotId: node.id }),
              );
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => setDragOverSlot(node.id)}
            onDragLeave={() => setDragOverSlot((prev) => (prev === node.id ? null : prev))}
            onDrop={(event) => handleDrop(node.id, event)}
            title={node.playerFullName ? `${node.playerFullName} · ${node.position} · ${node.roleLabel}` : node.position}
            style={{ left: `${node.x}%`, bottom: `${node.y}%` }}
            className={`absolute flex -translate-x-1/2 translate-y-1/2 flex-col items-center gap-1 focus:outline-none ${
              occupied ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            <span
              className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 bg-black font-tight text-sm font-semibold text-ov-text transition ${ring} ${
                active ? "ring-2 ring-ov-text ring-offset-2 ring-offset-[#0d0d0d]" : ""
              } ${dragOver ? "ring-2 ring-ov-accent" : ""}`}
            >
              {occupied ? (node.overall ?? "–") : <span className="text-[10px] text-ov-muted">{node.position}</span>}
              {node.mastery !== "base" && (
                <span className="absolute -right-1.5 -top-1.5 rounded-full border border-ov-control bg-black px-1 text-[9px] font-bold text-ov-muted">
                  {node.mastery}
                </span>
              )}
            </span>
            <span className={`max-w-[90px] truncate text-xs leading-tight ${occupied ? "text-ov-text" : "text-ov-muted"}`}>
              {node.playerName ?? "Empty"}
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}
