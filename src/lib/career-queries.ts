import { queryOptions } from "@tanstack/react-query";
import { listCareers, getCareerData, getPlayerHistory } from "./career.functions";
import { listImports } from "./import.functions";
import { listYouthPlayers } from "./youth.functions";
import {
  searchMarketPlayers,
  listLeagues,
  listTransferTargets,
  type MarketSearchInput,
} from "./market.functions";

/** Keeps tab switches instant instead of refetching everything on every mount. */
const FRESH = 1000 * 60 * 2;
const KEEP = 1000 * 60 * 30;

export const careersQuery = () =>
  queryOptions({
    queryKey: ["careers"],
    queryFn: () => listCareers(),
    staleTime: FRESH,
    gcTime: KEEP,
  });

export const careerDataQuery = (careerId: string) =>
  queryOptions({
    queryKey: ["career", careerId],
    queryFn: () => getCareerData({ data: { careerId } }),
    staleTime: FRESH,
    gcTime: KEEP,
  });

export const playerHistoryQuery = (careerId: string, playerId: string) =>
  queryOptions({
    queryKey: ["player-history", careerId, playerId],
    queryFn: () => getPlayerHistory({ data: { careerId, playerId } }),
    staleTime: FRESH,
    gcTime: KEEP,
  });

export const importsQuery = (careerId: string) =>
  queryOptions({
    queryKey: ["imports", careerId],
    queryFn: () => listImports({ data: { careerId } }),
    staleTime: FRESH,
    gcTime: KEEP,
  });

export const marketSearchQuery = (filters: MarketSearchInput) =>
  queryOptions({
    queryKey: ["market-search", filters],
    queryFn: () => searchMarketPlayers({ data: filters }),
    placeholderData: (previous) => previous,
    staleTime: FRESH,
    gcTime: KEEP,
  });

export const leaguesQuery = () =>
  queryOptions({
    queryKey: ["fc-leagues"],
    queryFn: () => listLeagues(),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
  });

export const targetsQuery = (careerId: string) =>
  queryOptions({
    queryKey: ["transfer-targets", careerId],
    queryFn: () => listTransferTargets({ data: { careerId } }),
    staleTime: FRESH,
    gcTime: KEEP,
  });

export const youthQuery = (careerId: string) =>
  queryOptions({
    queryKey: ["youth", careerId],
    queryFn: () => listYouthPlayers({ data: { careerId } }),
    staleTime: FRESH,
    gcTime: KEEP,
  });
