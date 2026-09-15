import { useQueries, useQuery, type QueryClient } from "@tanstack/react-query";
import type { AuctionEvent, CountyDetail, EventMonth, Manifest } from "./types";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DATA = `${BASE}/data`;

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json();
}

export const qk = {
  manifest: ["manifest"] as const,
  eventMonth: (m: string) => ["eventMonth", m] as const,
  county: (id: number) => ["county", String(id)] as const,
};

export function useManifest() {
  return useQuery({ queryKey: qk.manifest, queryFn: () => getJSON<Manifest>(`${DATA}/manifest.json`), staleTime: 1000 * 60 * 60 });
}

export function useEventMonth(month: string, enabled = true) {
  return useQuery({
    queryKey: qk.eventMonth(month),
    queryFn: () => getJSON<EventMonth>(`${DATA}/events/${month}.json`),
    staleTime: 1000 * 60 * 60,
    enabled,
  });
}

export function useCounty(id: number) {
  return useQuery({
    queryKey: qk.county(id),
    queryFn: () => getJSON<CountyDetail>(`${DATA}/counties/${id}.json`),
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });
}

/** All upcoming events across the months listed in the manifest. */
export function useAllEvents() {
  const manifest = useManifest();
  const months = manifest.data?.eventMonths ?? [];
  const queries = useQueries({
    queries: months.map((m) => ({
      queryKey: qk.eventMonth(m),
      queryFn: () => getJSON<EventMonth>(`${DATA}/events/${m}.json`),
      staleTime: 1000 * 60 * 60,
    })),
  });
  const isLoading = manifest.isLoading || queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const events: AuctionEvent[] = [];
  for (const q of queries) {
    if (q.data) events.push(...q.data.events);
  }
  events.sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  return { events, isLoading, isError, months };
}

/** Warm the county detail into the query cache (used by directory hover prefetch). */
export function prefetchCounty(queryClient: QueryClient, id: number) {
  void queryClient.prefetchQuery({
    queryKey: qk.county(id),
    queryFn: () => getJSON<CountyDetail>(`${DATA}/counties/${id}.json`),
    staleTime: 1000 * 60 * 60,
  });
}