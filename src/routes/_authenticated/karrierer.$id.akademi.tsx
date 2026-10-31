import { useMemo, useRef, useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUpFromLine, ImagePlus, Plus, Trash2, User } from "lucide-react";
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

const SORT_TEXT: Record<SortKey, string> = {
  potential: "POT",
  overall: "OVR",
  age: "Age",
  name: "Name",
};

function potOf(row: YouthRow): number | null {
  return row.potential_max ?? row.potential_min ?? null;
}

function Growth({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 10));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-20 overflow-hidden rounded-full bg-[#1f1f1f]">
        <div className="h-full rounded-full bg-ov-accent" style={{ width: `${pct}%` }} />
      </div>
      <span
        className={`font-tight text-[13px] font-semibold tabular-nums ${value > 0 ? "text-ov-accent" : "text-ov-muted"}`}
      >
        {value > 0 ? `+${value}` : "0"}
      </span>
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
  const [onlyRelease, setOnlyRelease] = useState(false);

  const allRows = useMemo(() => {
    const list = [...(youth.data ?? [])];
    list.sort((a, b) => {
      if (sortKey === "age") return (a.age ?? 99) - (b.age ?? 99);
      if (sortKey === "name") return a.name.localeCompare(b.name, "en");
      if (sortKey === "overall") return (b.overall ?? 0) - (a.overall ?? 0);
      return (potOf(b) ?? 0) - (potOf(a) ?? 0);
    });
    return list;
  }, [youth.data, sortKey]);
  const rows = onlyRelease
    ? allRows.filter((r) => youthAdvice(r).action === "release")
    : allRows;

  const selected = allRows.find((row) => row.id === selectedId) ?? null;

  const pots = allRows.map(potOf).filter((v): v is number => v != null);
  const avgPot = pots.length ? (pots.reduce((s, v) => s + v, 0) / pots.length).toFixed(1) : "–";
  const maxPot = pots.length ? Math.max(...pots) : null;
  const count = (a: YouthAction) => allRows.filter((r) => youthAdvice(r).action === a).length;
  const releaseCount = count("release");

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

  const kpis: { label: string; value: string | number; green?: boolean }[] = [
    { label: "Young players", value: allRows.length },
    { label: "Avg. POT", value: avgPot },
    { label: "Highest POT", value: maxPot ?? "–", green: maxPot != null },
    {
      label: "Promote · Keep · Loan · Release",
      value: `${count("promote")} · ${count("keep")} · ${count("loan")} · ${releaseCount}`,
    },
  ];

  return (
    <div className="space-y-6 pb-24 text-ov-text">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-tight text-[32px] font-bold leading-tight tracking-[-0.03em]">
            Academy
          </h1>
          <p className="mt-1 text-sm text-ov-muted">
            Players aged 21 and under · growth since last snapshot
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-ov-control px-4 text-sm font-medium hover:bg-ov-line"
        >
          <Plus className="h-4 w-4" /> Add talent
        </button>
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-ov-border bg-ov-card sm:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className={`p-5 ${i % 2 === 1 ? "border-l border-ov-line" : ""} ${i >= 2 ? "border-t border-ov-line sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""}`}
          >
            <div className="text-xs text-ov-muted">{k.label}</div>
            <div
              className={`mt-1 font-tight text-2xl font-semibold tracking-[-0.03em] tabular-nums ${k.green ? "text-ov-accent" : ""}`}
            >
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-ov-border bg-ov-card">
        <div className="flex items-center justify-between gap-3 border-b border-ov-line px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-tight text-lg font-semibold tracking-[-0.03em]">Prospects</h2>
            <button
              type="button"
              onClick={() => setOnlyRelease((v) => !v)}
              aria-pressed={onlyRelease}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs ${onlyRelease ? "border-ov-danger bg-ov-danger/15 text-ov-danger" : "border-ov-control text-ov-muted hover:bg-ov-line"}`}
            >
              Get rid of ({releaseCount})
            </button>
          </div>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-9 w-36 rounded-[10px] border-ov-control bg-transparent text-sm">
              <span className="text-ov-muted">Sort:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_TEXT[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-ov-muted">
                <th className="px-5 py-3 font-medium">Player</th>
                <th className="px-3 py-3 font-medium">Age</th>
                <th className="px-3 py-3 font-medium">OVR</th>
                <th className="px-3 py-3 font-medium">POT</th>
                <th className="px-3 py-3 font-medium">Growth</th>
                <th className="px-5 py-3 font-medium">Advice</th>
              </tr>
            </thead>
            <tbody>
              {youth.isLoading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-ov-muted">
                    Loading talents…
                  </td>
                </tr>
              )}
              {!youth.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-ov-muted">
                    No talents yet. Add your first academy talent.
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const pot = potOf(row);
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className="cursor-pointer border-t border-[#141414] hover:bg-ov-line"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.name}</span>
                        <span className="rounded-md border border-ov-control px-1.5 py-px text-[11px] text-ov-muted">
                          {row.position ?? "–"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-ov-muted">{row.age ?? "–"}</td>
                    <td className="px-3 py-3 font-tight text-[17px] font-semibold tabular-nums">
                      {row.overall ?? "–"}
                    </td>
                    <td
                      className={`px-3 py-3 font-tight text-[15px] font-semibold tabular-nums ${pot != null && pot >= 80 ? "text-ov-accent" : "text-ov-muted"}`}
                    >
                      {row.potential_min != null &&
                      row.potential_max != null &&
                      row.potential_min !== row.potential_max
                        ? `${row.potential_min}–${row.potential_max}`
                        : (pot ?? "–")}
                    </td>
                    <td className="px-3 py-3">
                      <Growth value={0} />
                    </td>
                    <td className="px-5 py-3">
                      <YouthAdvicePill action={youthAdvice(row).action} />
                      <div className="mt-1 text-[11px] text-ov-muted">{youthAdvice(row).reason}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ov-muted">
        Growth compares OVR with your previous upload. Upload a new screenshot each season to keep
        it current.
      </p>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>
              {selected?.position} · {selected?.age} yrs · OVR {selected?.overall ?? "–"}
            </DialogDescription>
            {selected && (
              <div className="flex items-center gap-2 pt-1">
                <YouthAdvicePill action={youthAdvice(selected).action} />
                <span className="text-xs text-ov-muted">{youthAdvice(selected).reason}</span>
              </div>
            )}
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
