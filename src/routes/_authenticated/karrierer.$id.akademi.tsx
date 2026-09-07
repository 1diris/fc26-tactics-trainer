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

const SORT_KEYS = ["potential", "overall", "age", "name"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const GROUP_PILL: Record<string, string> = {
  Målmand: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  Forsvar: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  Midtbane: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  Angreb: "border-red-500/40 bg-red-500/15 text-red-300",
  Ukendt: "border-dash-border bg-dash-elevated text-muted-foreground",
};

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
    if (!Number.isFinite(ageValue) || ageValue < 13 || ageValue > 18) {
      toast.error("Alder skal være mellem 13 og 18.");
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
                min={13}
                max={18}
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
