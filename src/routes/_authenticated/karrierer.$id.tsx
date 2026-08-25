import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/app-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { careerDataQuery } from "@/lib/career-queries";
import { setCurrentSeason } from "@/lib/career.functions";
import { sortedSeasons } from "@/lib/squad";

export const Route = createFileRoute("/_authenticated/karrierer/$id")({
  component: CareerLayout;
});

function CareerLayout() {
  return <Outlet />;
}
