import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUpFromLine, ChevronDown, ImagePlus, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { POSITIONS } from "@/lib/football";
import { careerDataQuery } from "@/lib/career-queries";
import { sortedSeasons } from "@/lib/squad";
import {
  createYouthPlayer,
  deleteYouthPlayer,
  listYouthPlayers,
  promoteYouthPlayer,
} from "@/lib/youth.functions";

export const Route = createFileRoute("/_authenticated/karrierer/$id/akademi")({
  head: () => ({
    meta: [
      { title: "Ungdomsakademi — Career Chronicles" },
      {
        name: "description",
        content:
          "Styr dine ungdomstalenter i FC 26 Career Mode: potentiale, udviklingsplan og forfremmelse til førsteholdet.",
      },
      { property: "og:title", content: "Ungdomsakademi — Career Chronicles" },
      {
        property: "og:description",
        content: "Overblik over dine unge talenter, deres potentiale og udviklingsplaner.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AcademyPage,
});

type YouthRow = {
  id: string;
  name: string;
  position: string | null;
  age: number | null;
  overall: number | null;
  potential_min: number | null;
  potential_max: number | null;
  plan: string;
  photo_data_url: string | null;
  created_at: string;
};

const SORT_KEYS = ["overall", "potential", "age"] as const;
type SortKey = (typeof SORT_KEYS)[number];
const SORT_LABEL: Record<SortKey, string> = {
  overall: "SML",
  potential: "POT",
  age: "År",
};

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]?.[0]}. ${parts.slice(1).join(" ")}`;
}

function AcademyPage() {
  const { id } = useParams({ from: "/_authenticated/karrierer/$id" });
  const queryClient = useQueryClient();
  const listFn = useServerFn(listYouthPlayers);
  const createFn = useServerFn(createYouthPlayer);
  const deleteFn = useServerFn(deleteYouthPlayer);
  const promoteFn = useServerFn(promoteYouthPlayer);

  const careerQuery = useQuery(careerDataQuery(id));
  const seasons = sortedSeasons(careerQuery.data?.seasons ?? []);
  const activeSeasonId = careerQuery.data?.career.current_season_id ?? seasons[0]?.id ?? "";

  const youth = useQuery({
    queryKey: ["youth", id],
    queryFn: () => listFn({ data: { careerId: id } }) as Promise<YouthRow[]>,
  });

  const [sortKey, setSortKey] = useState<SortKey>("overall");
  const [cursor, setCursor] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const rows = useMemo(() => {
    const list = [...(youth.data ?? [])];
    list.sort((a, b) => {
      if (sortKey === "age") return (a.age ?? 99) - (b.age ?? 99);
      if (sortKey === "potential")
        return (b.potential_max ?? b.potential_min ?? 0) - (a.potential_max ?? a.potential_min ?? 0);
      return (b.overall ?? 0) - (a.overall ?? 0);
    });
    return list;
  }, [youth.data, sortKey]);

  useEffect(() => {
    if (cursor > rows.length - 1) setCursor(Math.max(0, rows.length - 1));
  }, [rows.length, cursor]);

  const selected = rows[cursor];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (addOpen) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((value) => Math.min(rows.length - 1, value + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((value) => Math.max(0, value - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows.length, addOpen]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["youth", id] });
    void queryClient.invalidateQueries({ queryKey: ["career", id] });
  };

  const promote = useMutation({
    mutationFn: (youthId: string) =>
      promoteFn({ data: { youthId, careerId: id, seasonId: activeSeasonId } }),
    onSuccess: (result) => {
      toast.success(`${result.name} er forfremmet til førsteholdet.`);
      setShowActions(false);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const release = useMutation({
    mutationFn: (youthId: string) => deleteFn({ data: { youthId } }),
    onSuccess: () => {
      toast.success("Talentet er frigivet.");
      setShowActions(false);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cycleSort = () => {
    const index = SORT_KEYS.indexOf(sortKey);
    const next = SORT_KEYS[(index + 1) % SORT_KEYS.length] ?? "overall";
    setSortKey(next);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(160deg,#1a0826_0%,#240d38_55%,#2d0f45_100%)] text-white shadow-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 48%, #fff 49%, #fff 50%, transparent 51%), linear-gradient(65deg, transparent 68%, #fff 69%, #fff 70%, transparent 71%), radial-gradient(circle at 80% 15%, #fff 0, transparent 45%)",
          backgroundSize: "220px 220px, 320px 320px, 100% 100%",
        }}
      />

      <div className="relative px-4 pb-24 pt-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span className="mr-2 rounded border border-white/25 px-1.5 py-0.5 text-[10px] font-bold text-white/50">
              L2
            </span>
            {["Akademi", "Ungdomshold", "Udvikling"].map((tab) => (
              <span
                key={tab}
                className={
                  tab === "Ungdomshold"
                    ? "rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#1a0826]"
                    : "rounded-full px-4 py-1.5 text-sm font-medium text-white/45"
                }
              >
                {tab}
              </span>
            ))}
            <span className="ml-2 rounded border border-white/25 px-1.5 py-0.5 text-[10px] font-bold text-white/50">
              R2
            </span>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-white text-[#1a0826] hover:bg-white/85"
          >
            <Plus className="mr-1 h-4 w-4" /> Tilføj talent
          </Button>
        </div>

        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">Ungdomsakademi</h1>
        <p className="text-sm text-white/50">
          {rows.length} {rows.length === 1 ? "talent" : "talenter"} · sorteret efter{" "}
          {SORT_LABEL[sortKey]}
        </p>

        <div className="mt-5 grid grid-cols-[3rem_2.75rem_1fr_3rem_3.5rem_5.5rem] items-center gap-3 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#c9a8e8] sm:grid-cols-[3.5rem_3rem_1fr_3.5rem_4rem_6rem_7rem]">
          <span>Pos</span>
          <span />
          <span>Navn</span>
          <span className="text-center">År</span>
          <button
            type="button"
            onClick={() => setSortKey("overall")}
            className="flex items-center justify-center gap-0.5 text-center uppercase tracking-wider"
          >
            SML {sortKey === "overall" && <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={() => setSortKey("potential")}
            className="flex items-center gap-0.5 text-center uppercase tracking-wider"
          >
            POT {sortKey === "potential" && <ChevronDown className="h-3 w-3" />}
          </button>
          <span className="hidden sm:block">Plan</span>
        </div>

        <div className="space-y-1">
          {youth.isLoading && <p className="px-3 py-6 text-sm text-white/50">Henter talenter…</p>}
          {!youth.isLoading && rows.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-white/50">
              Ingen talenter endnu. Tilføj dit første akademitalent.
            </p>
          )}
          {rows.map((row, index) => {
            const active = index === cursor;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  setCursor(index);
                  setShowActions(true);
                }}
                className={`grid w-full grid-cols-[3rem_2.75rem_1fr_3rem_3.5rem_5.5rem] items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors sm:grid-cols-[3.5rem_3rem_1fr_3.5rem_4rem_6rem_7rem] ${
                  active
                    ? "bg-white/10 outline outline-2 outline-white/90"
                    : "hover:bg-white/[0.06]"
                }`}
              >
                <span className="font-bold tracking-wide text-white">{row.position ?? "–"}</span>
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#3a1558]">
                  {row.photo_data_url ? (
                    <img
                      src={row.photo_data_url}
                      alt={`Portræt af ${row.name}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <User className="h-5 w-5 text-white/40" />
                  )}
                </span>
                <span className="truncate font-semibold text-white">{shortName(row.name)}</span>
                <span className="text-center text-white/85">{row.age ?? "–"}</span>
                <span className="text-center font-bold text-white">{row.overall ?? "–"}</span>
                <span className="font-semibold text-white">
                  {row.potential_min ?? "–"} <span className="font-bold text-white/50">-</span>{" "}
                  {row.potential_max ?? row.potential_min ?? "–"}
                </span>
                <span className="hidden truncate text-white/60 sm:block">{row.plan}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-4 border-t border-white/10 bg-black/30 px-4 py-3 text-xs font-medium text-white/60 backdrop-blur sm:px-7">
        <button
          type="button"
          disabled={!selected}
          onClick={() => setShowActions(true)}
          className="flex items-center gap-2 disabled:opacity-40"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 text-[10px] font-bold text-white">
            X
          </span>
          Vis handlinger
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="flex items-center gap-2"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 text-[10px] font-bold text-white">
            O
          </span>
          Tilbage
        </button>
        <button type="button" onClick={cycleSort} className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-white/40 text-[10px] font-bold text-white">
            ◻
          </span>
          Sortér ({SORT_LABEL[sortKey]})
        </button>
      </div>

      <Dialog open={showActions && !!selected} onOpenChange={setShowActions}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.position} · {selected?.age} år · SML {selected?.overall ?? "–"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              disabled={!activeSeasonId || promote.isPending}
              onClick={() => selected && promote.mutate(selected.id)}
            >
              <ArrowUpFromLine className="mr-2 h-4 w-4" /> Forfrem til førstehold
            </Button>
            <Button
              variant="destructive"
              disabled={release.isPending}
              onClick={() => selected && release.mutate(selected.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Frigiv
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddTalentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={async (values) => {
          await createFn({ data: { careerId: id, ...values } });
          toast.success(`${values.name} er tilføjet til akademiet.`);
          invalidate();
        }}
      />
    </div>
  );
}

type NewTalent = {
  name: string;
  position: string;
  age: number;
  overall: number | null;
  potentialMin: number | null;
  potentialMax: number | null;
  plan: string;
  photoDataUrl: string | null;
};

function AddTalentDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NewTalent) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState<string>("CM");
  const [age, setAge] = useState("16");
  const [overall, setOverall] = useState("");
  const [potMin, setPotMin] = useState("");
  const [potMax, setPotMax] = useState("");
  const [plan, setPlan] = useState("Dynamisk");
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setPosition("CM");
    setAge("16");
    setOverall("");
    setPotMin("");
    setPotMax("");
    setPlan("Dynamisk");
    setPhoto(null);
  };

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("Billedet må højst være 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Indtast et navn.");
      return;
    }
    const ageValue = Number(age);
    if (!Number.isFinite(ageValue) || ageValue < 14 || ageValue > 19) {
      toast.error("Alder skal være mellem 14 og 19.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        position,
        age: ageValue,
        overall: overall ? Number(overall) : null,
        potentialMin: potMin ? Number(potMin) : null,
        potentialMax: potMax ? Number(potMax) : null,
        plan: plan.trim() || "Dynamisk",
        photoDataUrl: photo,
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kunne ikke gemme talentet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tilføj talent</DialogTitle>
          <DialogDescription>Opret et nyt akademitalent i din karriere.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {photo ? (
                <img src={photo} alt="Valgt portræt" className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </span>
            <div>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" /> Vælg portræt
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => pickPhoto(event.target.files?.[0])}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="youth-name">Navn</Label>
              <Input
                id="youth-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jonas Pineau"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="youth-age">Alder</Label>
              <Input
                id="youth-age"
                type="number"
                min={14}
                max={19}
                value={age}
                onChange={(event) => setAge(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="youth-ovr">SML (OVR)</Label>
              <Input
                id="youth-ovr"
                type="number"
                min={30}
                max={99}
                value={overall}
                onChange={(event) => setOverall(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="youth-pot-min">POT min</Label>
                <Input
                  id="youth-pot-min"
                  type="number"
                  min={30}
                  max={99}
                  value={potMin}
                  onChange={(event) => setPotMin(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="youth-pot-max">POT max</Label>
                <Input
                  id="youth-pot-max"
                  type="number"
                  min={30}
                  max={99}
                  value={potMax}
                  onChange={(event) => setPotMax(event.target.value)}
                />
              </div>
            </div>
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="youth-plan">Udviklingsplan</Label>
              <Input
                id="youth-plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value)}
                placeholder="Dynamisk"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuller
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Gemmer…" : "Gem talent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
