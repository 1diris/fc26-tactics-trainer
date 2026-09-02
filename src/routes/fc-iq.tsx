import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ClipboardCopy, Copy, Download, Shield, Sparkles, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/fc-iq")({
  component: FcIqPage,
  head: () => ({
    meta: [
      { title: "FC IQ – Tactic Builder til FC 26 Career Mode" },
      {
        name: "description",
        content:
          "Byg og visualisér din FC 26-taktik: formationer, spillerroller, fokus, rolle-mastery og delbare taktikkoder.",
      },
      { property: "og:title", content: "FC IQ – Tactic Builder til FC 26" },
      {
        property: "og:description",
        content:
          "Interaktiv 2D-bane, roller pr. position og eksporterbare taktikkoder til FC 26 Career Mode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* ---------------------------------- data ---------------------------------- */

const ROLES_BY_POS = {
  GK: ["Goalkeeper", "Sweeper Keeper"],
  CB: ["Defender", "Stopper", "Ball-Playing Defender"],
  LB: ["Fullback", "Wingback", "Falseback", "Attacking Wingback"],
  RB: ["Fullback", "Wingback", "Falseback", "Attacking Wingback"],
  CDM: ["Holding", "Center-Half", "Deep-Lying Playmaker"],
  CM: ["Box-to-Box", "Holding", "Deep-Lying Playmaker", "Playmaker", "Half-Winger"],
  CAM: ["Playmaker", "Shadow Striker", "Half-Winger"],
  LM: ["Winger", "Inside Forward", "Wide Playmaker", "Wide Midfielder"],
  RM: ["Winger", "Inside Forward", "Wide Playmaker", "Wide Midfielder"],
  LW: ["Winger", "Inside Forward", "Wide Playmaker"],
  RW: ["Winger", "Inside Forward", "Wide Playmaker"],
  ST: ["Advanced Forward", "Poacher", "Target Forward", "False 9"],
} as const;

type Position = keyof typeof ROLES_BY_POS;
type Focus = "Defend" | "Balanced" | "Attack" | "Roaming";
type Mastery = "base" | "+" | "++";

interface PlayerNode {
  id: string;
  pos: Position;
  role: string;
  focus: Focus;
  mastery: Mastery;
  x: number;
  y: number;
}

interface SlotDef {
  id: string;
  pos: Position;
  x: number;
  y: number;
}

const FORMATIONS: Record<string, SlotDef[]> = {
  "4-3-3": [
    { id: "GK", pos: "GK", x: 50, y: 90 },
    { id: "LB", pos: "LB", x: 15, y: 72 },
    { id: "CB1", pos: "CB", x: 38, y: 75 },
    { id: "CB2", pos: "CB", x: 62, y: 75 },
    { id: "RB", pos: "RB", x: 85, y: 72 },
    { id: "CDM", pos: "CDM", x: 50, y: 55 },
    { id: "CM1", pos: "CM", x: 32, y: 42 },
    { id: "CM2", pos: "CM", x: 68, y: 42 },
    { id: "LW", pos: "LW", x: 18, y: 20 },
    { id: "ST", pos: "ST", x: 50, y: 15 },
    { id: "RW", pos: "RW", x: 82, y: 20 },
  ],
  "4-2-3-1": [
    { id: "GK", pos: "GK", x: 50, y: 90 },
    { id: "LB", pos: "LB", x: 15, y: 72 },
    { id: "CB1", pos: "CB", x: 38, y: 75 },
    { id: "CB2", pos: "CB", x: 62, y: 75 },
    { id: "RB", pos: "RB", x: 85, y: 72 },
    { id: "CDM1", pos: "CDM", x: 35, y: 58 },
    { id: "CDM2", pos: "CDM", x: 65, y: 58 },
    { id: "CAM", pos: "CAM", x: 50, y: 38 },
    { id: "LM", pos: "LM", x: 18, y: 35 },
    { id: "RM", pos: "RM", x: 82, y: 35 },
    { id: "ST", pos: "ST", x: 50, y: 15 },
  ],
  "4-4-2": [
    { id: "GK", pos: "GK", x: 50, y: 90 },
    { id: "LB", pos: "LB", x: 15, y: 72 },
    { id: "CB1", pos: "CB", x: 38, y: 75 },
    { id: "CB2", pos: "CB", x: 62, y: 75 },
    { id: "RB", pos: "RB", x: 85, y: 72 },
    { id: "LM", pos: "LM", x: 15, y: 45 },
    { id: "CM1", pos: "CM", x: 38, y: 48 },
    { id: "CM2", pos: "CM", x: 62, y: 48 },
    { id: "RM", pos: "RM", x: 85, y: 45 },
    { id: "ST1", pos: "ST", x: 38, y: 18 },
    { id: "ST2", pos: "ST", x: 62, y: 18 },
  ],
};

/** Which focus options a given role supports. */
const ROLE_FOCUS: Record<string, Focus[]> = {
  Goalkeeper: ["Defend", "Balanced"],
  "Sweeper Keeper": ["Balanced", "Attack"],
  Defender: ["Defend", "Balanced"],
  Stopper: ["Defend", "Balanced"],
  "Ball-Playing Defender": ["Balanced", "Attack"],
  Fullback: ["Defend", "Balanced"],
  Wingback: ["Balanced", "Attack"],
  Falseback: ["Defend", "Balanced"],
  "Attacking Wingback": ["Attack"],
  Holding: ["Defend", "Balanced"],
  "Center-Half": ["Defend"],
  "Deep-Lying Playmaker": ["Defend", "Balanced"],
  "Box-to-Box": ["Balanced", "Attack", "Roaming"],
  Playmaker: ["Balanced", "Attack", "Roaming"],
  "Half-Winger": ["Balanced", "Attack"],
  "Shadow Striker": ["Attack"],
  Winger: ["Balanced", "Attack"],
  "Inside Forward": ["Balanced", "Attack"],
  "Wide Playmaker": ["Balanced", "Attack", "Roaming"],
  "Wide Midfielder": ["Defend", "Balanced"],
  "Advanced Forward": ["Balanced", "Attack"],
  Poacher: ["Attack"],
  "Target Forward": ["Balanced", "Attack"],
  "False 9": ["Balanced", "Roaming"],
};

const ALL_FOCUS: Focus[] = ["Defend", "Balanced", "Attack", "Roaming"];

function focusesFor(role: string): Focus[] {
  return ROLE_FOCUS[role] ?? ["Balanced"];
}

function defaultFocus(role: string): Focus {
  const list = focusesFor(role);
  return list.includes("Balanced") ? "Balanced" : list[0]!;
}

function buildPlayers(formation: string): PlayerNode[] {
  return (FORMATIONS[formation] ?? FORMATIONS["4-3-3"]!).map((slot) => {
    const role = ROLES_BY_POS[slot.pos][0]!;
    return {
      id: slot.id,
      pos: slot.pos,
      role,
      focus: defaultFocus(role),
      mastery: "base" as Mastery,
      x: slot.x,
      y: slot.y,
    };
  });
}

function randomCode() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `#fc26-${out}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 14);
}

const BUILD_UP = ["Short Passing", "Balanced", "Direct Counter"] as const;

function defensiveLabel(value: number) {
  if (value < 25) return "Deep";
  if (value < 50) return "Balanced";
  if (value < 75) return "High";
  return "Aggressive Press";
}

/* ---------------------------------- page ---------------------------------- */

function FcIqPage() {
  const [formation, setFormation] = useState<string>("4-3-3");
  const [players, setPlayers] = useState<PlayerNode[]>(() => buildPlayers("4-3-3"));
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("ST");
  const [buildUp, setBuildUp] = useState<string>("Balanced");
  const [defensive, setDefensive] = useState<number>(50);
  const [code, setCode] = useState<string>(() => randomCode());
  const [importCode, setImportCode] = useState("");
  const [tab, setTab] = useState("team");

  const selected = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? players[0]!,
    [players, selectedPlayerId],
  );

  function changeFormation(next: string) {
    setFormation(next);
    const fresh = buildPlayers(next);
    setPlayers(fresh);
    setSelectedPlayerId(fresh.find((player) => player.pos === "ST")?.id ?? fresh[0]!.id);
  }

  function patchPlayer(id: string, patch: Partial<PlayerNode>) {
    setPlayers((prev) =>
      prev.map((player) => (player.id === id ? { ...player, ...patch } : player)),
    );
  }

  function setRole(role: string) {
    const allowed = focusesFor(role);
    patchPlayer(selected.id, {
      role,
      focus: allowed.includes(selected.focus) ? selected.focus : defaultFocus(role),
    });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Taktikkode kopieret", { description: code });
    } catch {
      toast.error("Kunne ikke kopiere koden");
    }
  }

  function importTactic() {
    const value = importCode.trim();
    if (!value) {
      toast.error("Indtast en taktikkode først");
      return;
    }
    const formations = Object.keys(FORMATIONS);
    const picked = formations[Math.abs(hash(value)) % formations.length]!;
    changeFormation(picked);
    setBuildUp(BUILD_UP[Math.abs(hash(value + "b")) % BUILD_UP.length]!);
    setDefensive(30 + (Math.abs(hash(value + "d")) % 60));
    setCode(value.startsWith("#") ? value : `#${value}`);
    setImportCode("");
    setTab("team");
    toast.success(`Taktik importeret (${picked})`, { description: value });
  }

  const attackers = players.filter((player) => player.focus === "Attack").length;
  const defenders = players.filter((player) => player.focus === "Defend").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">
              <Sparkles className="h-3.5 w-3.5" /> FC IQ
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              Tactic Builder &amp; Visualizer
            </h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              Byg din FC 26-opstilling, tildel roller og fokus pr. plads, og del taktikken som kode.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge className="border-zinc-800 bg-zinc-900 text-zinc-300">{formation}</Badge>
            <Badge className="border-zinc-800 bg-zinc-900 text-zinc-300">
              <Shield className="mr-1 h-3 w-3" /> {defenders} defensive
            </Badge>
            <Badge className="border-lime-500/30 bg-lime-500/10 text-lime-400">
              <Target className="mr-1 h-3 w-3" /> {attackers} offensive
            </Badge>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Pitch */}
          <section className="lg:col-span-7">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <Users className="h-4 w-4 text-lime-400" /> Opstilling
                </h2>
                <span className="text-xs text-zinc-500">Klik på en spiller for at redigere</span>
              </div>
              <Pitch
                players={players}
                selectedId={selected.id}
                onSelect={(id) => {
                  setSelectedPlayerId(id);
                  setTab("player");
                }}
              />
            </div>
          </section>

          {/* Config */}
          <section className="lg:col-span-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-3 bg-zinc-950">
                  <TabsTrigger value="team">Holdtaktik</TabsTrigger>
                  <TabsTrigger value="player">Spillerrolle</TabsTrigger>
                  <TabsTrigger value="export">Eksport</TabsTrigger>
                </TabsList>

                {/* Team */}
                <TabsContent value="team" className="mt-4 space-y-5">
                  <Field label="Formation">
                    <Select value={formation} onValueChange={changeFormation}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(FORMATIONS).map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Build-up Style">
                    <Select value={buildUp} onValueChange={setBuildUp}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUILD_UP.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Defensive Approach">
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[defensive]}
                        min={1}
                        max={100}
                        step={1}
                        onValueChange={(value) => setDefensive(value[0] ?? 50)}
                        className="flex-1"
                      />
                      <span className="w-10 text-right text-sm font-semibold tabular-nums text-lime-400">
                        {defensive}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{defensiveLabel(defensive)}</p>
                  </Field>
                </TabsContent>

                {/* Player */}
                <TabsContent value="player" className="mt-4 space-y-5">
                  <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                    <div>
                      <p className="text-lg font-bold text-lime-400">{selected.pos}</p>
                      <p className="text-xs text-zinc-400">{selected.role}</p>
                    </div>
                    <Badge className="border-zinc-800 bg-zinc-900 text-zinc-300">
                      {selected.mastery === "base" ? "Standard" : `Role (${selected.mastery})`}
                    </Badge>
                  </div>

                  <Field label="Rolle">
                    <Select value={selected.role} onValueChange={setRole}>
                      <SelectTrigger className="border-zinc-800 bg-zinc-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES_BY_POS[selected.pos].map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Fokus">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {ALL_FOCUS.map((focus) => {
                        const enabled = focusesFor(selected.role).includes(focus);
                        const active = selected.focus === focus;
                        return (
                          <button
                            key={focus}
                            type="button"
                            disabled={!enabled}
                            onClick={() => patchPlayer(selected.id, { focus })}
                            className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                              active
                                ? "border-lime-400 bg-lime-500/15 text-lime-300 ring-1 ring-lime-400"
                                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
                            } ${enabled ? "" : "cursor-not-allowed opacity-35"}`}
                          >
                            {focus}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Kun fokus der passer til {selected.role} kan vælges.
                    </p>
                  </Field>

                  <Field label="Role Mastery">
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["base", "Standard"],
                          ["+", "Role (+)"],
                          ["++", "Role (++)"],
                        ] as [Mastery, string][]
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => patchPlayer(selected.id, { mastery: value })}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                            selected.mastery === value
                              ? "border-lime-400 bg-lime-500/15 text-lime-300 ring-1 ring-lime-400"
                              : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>
                </TabsContent>

                {/* Export */}
                <TabsContent value="export" className="mt-4 space-y-5">
                  <Field label="Din taktikkode">
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-lime-400">
                        {code}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-zinc-800 bg-zinc-950"
                        onClick={() => {
                          setCode(randomCode());
                          toast.success("Ny kode genereret");
                        }}
                        aria-label="Generér ny kode"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>

                  <Button
                    className="w-full bg-lime-500 text-zinc-950 hover:bg-lime-400"
                    onClick={copyCode}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Kopiér Taktikkode
                  </Button>

                  <Field label="Importér taktikkode">
                    <div className="flex gap-2">
                      <Input
                        value={importCode}
                        onChange={(event) => setImportCode(event.target.value)}
                        placeholder="#fc26-k8X9"
                        className="border-zinc-800 bg-zinc-950"
                      />
                      <Button
                        variant="outline"
                        className="border-zinc-800 bg-zinc-950"
                        onClick={importTactic}
                      >
                        <Download className="mr-2 h-4 w-4" /> Importér
                      </Button>
                    </div>
                  </Field>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                    <p className="mb-2 flex items-center gap-2 font-medium text-zinc-200">
                      <ClipboardCopy className="h-3.5 w-3.5 text-lime-400" /> Opsummering
                    </p>
                    <ul className="space-y-1">
                      <li>Formation: {formation}</li>
                      <li>Build-up: {buildUp}</li>
                      <li>
                        Defensiv: {defensiveLabel(defensive)} ({defensive})
                      </li>
                      <li>
                        Roller med mastery:{" "}
                        {players.filter((player) => player.mastery !== "base").length}/11
                      </li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function hash(value: string) {
  let out = 0;
  for (let i = 0; i < value.length; i++) out = (out * 31 + value.charCodeAt(i)) | 0;
  return out;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      {children}
    </div>
  );
}

function Pitch({
  players,
  selectedId,
  onSelect,
}: {
  players: PlayerNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-zinc-800 bg-[radial-gradient(ellipse_at_center,#123a1e_0%,#0a1f11_60%,#08150c_100%)]">
      {/* stripes */}
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0_8%,transparent_8%_16%)]" />
      {/* markings */}
      <div className="pointer-events-none absolute inset-2 rounded-md border border-lime-200/20" />
      <div className="pointer-events-none absolute inset-x-2 top-1/2 h-px bg-lime-200/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime-200/20" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-200/30" />
      <div className="pointer-events-none absolute inset-x-[22%] top-2 h-[15%] border-x border-b border-lime-200/20" />
      <div className="pointer-events-none absolute inset-x-[34%] top-2 h-[6%] border-x border-b border-lime-200/20" />
      <div className="pointer-events-none absolute inset-x-[22%] bottom-2 h-[15%] border-x border-t border-lime-200/20" />
      <div className="pointer-events-none absolute inset-x-[34%] bottom-2 h-[6%] border-x border-t border-lime-200/20" />

      {players.map((player) => {
        const active = player.id === selectedId;
        return (
          <button
            key={player.id}
            type="button"
            onClick={() => onSelect(player.id)}
            style={{ left: `${player.x}%`, top: `${player.y}%` }}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 focus:outline-none"
          >
            <span
              className={`relative flex h-11 w-11 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                active
                  ? "border-lime-400 bg-lime-500 text-zinc-950 shadow-[0_0_22px_rgba(163,230,53,0.65)] ring-2 ring-lime-400"
                  : "border-zinc-700 bg-zinc-900/90 text-zinc-100 hover:border-lime-400/60"
              }`}
            >
              {player.pos}
              {player.mastery !== "base" && (
                <span className="absolute -right-1 -top-1 rounded-full border border-lime-400/60 bg-zinc-950 px-1 text-[9px] font-bold text-lime-400">
                  {player.mastery}
                </span>
              )}
            </span>
            <span
              className={`max-w-[86px] truncate rounded px-1 text-[10px] leading-tight ${
                active ? "text-lime-300" : "text-zinc-300"
              }`}
            >
              {player.role}
            </span>
          </button>
        );
      })}
    </div>
  );
}
