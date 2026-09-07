import { useMemo, useRef, useState } from "react";
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
import { POSITIONS, POSITION_GROUPS } from "@/lib/football";
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
      { title: "Youth academy — Career Chronicles" },
      {
        name: "description",
        content:
          "Manage your youth talents in FC 26 Career Mode: potential, growth plan and promotion to the first team.",
      },
      { property: "og:title", content: "Youth academy — Career Chronicles" },
      {
        property: "og:description",
        content: "Overview of your young talents, their potential and growth plans.",
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

const SORT_KEYS = ["potential", "overall", "age", "name"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const GROUP_PILL: Record<string, string> = {
  Målmand: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  Forsvar: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  Midtbane: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  Angreb: "border-red-500/40 bg-red-500/15 text-red-300",
  Ukendt: "border-dash-border bg-dash-elevated text-muted-foreground",
};

// NOTE: keys above are internal POSITION_GROUPS values, not user-facing text.

function groupOfPosition(position: string | null): string {
  if (!position) return "Ukendt";
  for (const [group, list] of Object.entries(POSITION_GROUPS)) {
    if (list.includes(position)) return group;
  }
  return "Ukendt";
}

function PositionPill({ position }: { position: string | null }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${GROUP_PILL[groupOfPosition(position)]}`}
    >
      {position ?? "–"}
    </span>
  );
}

/** Rating badge: green >= 80, amber 70-79, red below 70. */
function ratingClass(value: number | null | undefined): string {
  if (value == null) return "border-dash-border bg-dash-elevated text-muted-foreground";
  if (value >= 80) return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (value >= 70) return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  return "border-red-500/40 bg-red-500/15 text-red-300";
}

function RatingBadge({ value }: { value: number | null | undefined }) {
  return (
    <span
      className={`inline-flex min-w-10 items-center justify-center rounded-md border px-2 py-0.5 font-stat text-sm tabular-nums ${ratingClass(value)}`}
    >
      {value ?? "–"}
    </span>
  );
}

function PotentialRange({ row }: { row: YouthRow }) {
  const min = row.potential_min;
  const max = row.potential_max ?? row.potential_min;
  const ovr = row.overall;
  const target = max ?? min ?? null;
  const progress =
    ovr != null && target != null && target > 0 ? Math.min(100, Math.round((ovr / target) * 100)) : 0;
  return (
    <div className="min-w-[9rem] space-y-1.5">
      <div className="font-stat text-xs tabular-nums text-muted-foreground">
        OVR <span className="text-foreground">{ovr ?? "–"}</span> →{" "}
        <span className="text-emerald-300">
          {min ?? "–"}
          {max != null && min != null && max !== min ? `–${max}` : ""}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-dash-elevated">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
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

  const [sortKey, setSortKey] = useState<SortKey>("potential");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const rows = useMemo(() => {
    const list = [...(youth.data ?? [])];
    list.sort((a, b) => {
      if (sortKey === "age") return (a.age ?? 99) - (b.age ?? 99);
      if (sortKey === "name") return a.name.localeCompare(b.name, "en");
      if (sortKey === "overall") return (b.overall ?? 0) - (a.overall ?? 0);
      return (
        (b.potential_max ?? b.potential_min ?? 0) - (a.potential_max ?? a.potential_min ?? 0)
      );
    });
    return list;
  }, [youth.data, sortKey]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["youth", id] });
    void queryClient.invalidateQueries({ queryKey: ["career", id] });
  };

  const promote = useMutation({
    mutationFn: (youthId: string) =>
      promoteFn({ data: { youthId, careerId: id, seasonId: activeSeasonId } }),
    onSuccess: (result) => {
      toast.success(`${result.name} has been promoted to the first team.`);
      setSelectedId(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const release = useMutation({
    mutationFn: (youthId: string) => deleteFn({ data: { youthId } }),
    onSuccess: () => {
      toast.success("The talent has been released.");
      setSelectedId(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const SORT_TEXT: Record<SortKey, string> = {
    potential: "potential",
    overall: "OVR",
    age: "age",
    name: "name",
  };

  const headerButton = (key: SortKey, label: string, extra = "") => (
    <button
      type="button"
      onClick={() => setSortKey(key)}
      className={`flex items-center gap-1 uppercase tracking-wider ${extra} ${
        sortKey === key ? "text-foreground" : ""
      }`}
    >
      {label}
      {sortKey === key && <ChevronDown className="h-3 w-3" />}
    </button>
  );

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Academy{" "}
            <span className="font-stat text-lg font-normal text-muted-foreground">
              {rows.length}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "talent" : "talents"} · sorted by {SORT_TEXT[sortKey]}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setAddOpen(true)}
          className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
        >
          <Plus className="mr-1 h-4 w-4" /> Add talent
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-dash-border bg-dash-card">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-dash-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 text-left">{headerButton("name", "Name")}</th>
              <th className="px-3 py-2 text-left font-semibold">Pos</th>
              <th className="px-3 py-2 text-left">{headerButton("age", "Age")}</th>
              <th className="px-3 py-2 text-left">{headerButton("overall", "OVR")}</th>
              <th className="px-3 py-2 text-left">{headerButton("potential", "Potential")}</th>
              <th className="px-4 py-2 text-left font-semibold">Plan</th>
            </tr>
          </thead>
          <tbody>
            {youth.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading talents…
                </td>
              </tr>
            )}
            {!youth.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No talents yet. Add your first academy talent.
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                className={`cursor-pointer transition-colors hover:bg-dash-elevated/70 ${
                  index % 2 === 1 ? "bg-dash-elevated/40" : ""
                }`}
              >
                <td className="px-4 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2">
                  <PositionPill position={row.position} />
                </td>
                <td className="px-3 py-2 font-stat tabular-nums text-muted-foreground">
                  {row.age ?? "–"}
                </td>
                <td className="px-3 py-2">
                  <RatingBadge value={row.overall} />
                </td>
                <td className="px-3 py-2">
                  <PotentialRange row={row} />
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center rounded-full bg-dash-elevated px-2.5 py-0.5 text-[11px] text-muted-foreground">
                    {row.plan}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.position} · {selected?.age} yrs · OVR {selected?.overall ?? "–"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button
              disabled={!activeSeasonId || promote.isPending}
              onClick={() => selected && promote.mutate(selected.id)}
            >
              <ArrowUpFromLine className="mr-2 h-4 w-4" /> Promote to first team
            </Button>
            <Button
              variant="destructive"
              disabled={release.isPending}
              onClick={() => selected && release.mutate(selected.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Release
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddTalentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={async (values) => {
          await createFn({ data: { careerId: id, ...values } });
          toast.success(`${values.name} has been added to the academy.`);
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
  const [plan, setPlan] = useState("Dynamic");
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setPosition("CM");
    setAge("16");
    setOverall("");
    setPotMin("");
    setPotMax("");
    setPlan("Dynamic");
    setPhoto(null);
  };

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("The image must not exceed 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Enter a name.");
      return;
    }
    const ageValue = Number(age);
    if (!Number.isFinite(ageValue) || ageValue < 13 || ageValue > 18) {
      toast.error("Age must be between 13 and 18.");
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
        plan: plan.trim() || "Dynamic",
        photoDataUrl: photo,
      });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the talent.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add talent</DialogTitle>
          <DialogDescription>Create a new academy talent in your career.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {photo ? (
                <img src={photo} alt="Selected portrait" className="h-full w-full object-cover" />
              ) : (
                <User className="h-6 w-6 text-muted-foreground" />
              )}
            </span>
            <div>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" /> Select portrait
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
              <Label htmlFor="youth-name">Name</Label>
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
              <Label htmlFor="youth-age">Age</Label>
              <Input
                id="youth-age"
                type="number"
                min={13}
                max={18}
                value={age}
                onChange={(event) => setAge(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="youth-ovr">OVR</Label>
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
              <Label htmlFor="youth-plan">Growth plan</Label>
              <Input
                id="youth-plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value)}
                placeholder="Dynamic"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save talent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
