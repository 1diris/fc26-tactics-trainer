import { queryOptions } from "@tanstack/react-query";
import { listCareers, getCareerData } from "./career.functions";
import { listImports } from "./import.functions";

export const careersQuery = () =>
  queryOptions({
    queryKey: ["careers"],
    queryFn: () => listCareers(),
  });

export const careerDataQuery = (careerId: string) =>
  queryOptions({
    queryKey: ["career", careerId],
    queryFn: () => getCareerData({ data: { careerId } }),
  });

export const importsQuery = (careerId: string) =>
  queryOptions({
    queryKey: ["imports", careerId],
    queryFn: () => listImports({ data: { careerId } }),
  });
