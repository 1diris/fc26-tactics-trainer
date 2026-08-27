import { queryOptions } from "@tanstack/react-query";
import { listCareers, getCareerData } from "./career.functions";
import { listImports } from "./import.functions";
import {
  searchMarketPlayers,
  listLeagues,
  listTransferTargets,
  type MarketSearchInput,
} from "./market.functions";

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

export const marketSearchQuery = (filters: MarketSearchInput) =>
  queryOptions({
    queryKey: ["market-search", filters],
    queryFn: () => searchMarketPlayers({ data: filters }),
    placeholderData: (previous) => previous,
  });

export const leaguesQuery = () =>
  queryOptions({
    queryKey: ["fc-leagues"],
    queryFn: () => listLeagues(),
    staleTime: 1000 * 60 * 60,
  });

export const targetsQuery = (careerId: string) =>
  queryOptions({
    queryKey: ["transfer-targets", careerId],
    queryFn: () => listTransferTargets({ data: { careerId } }),
  });
