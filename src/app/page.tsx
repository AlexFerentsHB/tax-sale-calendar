"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Search } from "lucide-react";
import { useManifest, prefetchCounty } from "@/lib/api";
import { Stagger, Item } from "@/components/motion";
import { Badge, Skeleton, StatChip } from "@/components/ui";
import type { CountyEntry } from "@/lib/types";

export default function DirectoryPage() {
  const manifest = useManifest();
  const [query, setQuery] = useState("");
  const [stateName, setStateName] = useState<string>("Texas");
  const qc = useQueryClient();

  const { stateNames, countiesByState } = useMemo(() => {
    const nameById = new Map((manifest.data?.states ?? []).map((s) => [s.id, s.name]));
    const byName = new Map<string, CountyEntry[]>();
    for (const c of manifest.data?.counties ?? []) {
      const n = nameById.get(c.stateId) ?? "Other";
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n)!.push(c);
    }
    const names = [...byName.keys()].sort((a, b) => {
      if (a === "Texas") return -1;
      if (b === "Texas") return 1;
      return a.localeCompare(b);
    });
    return { stateNames: names, countiesByState: byName };
  }, [manifest.data]);

  const counties = useMemo(() => {
    const base = (stateName ? countiesByState.get(stateName) ?? [] : manifest.data?.counties ?? []).filter(
      (c) => c.name !== undefined
    );
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q.replace(/\s+/g, "-")));
  }, [query, stateName, countiesByState, manifest.data]);

  const upcomingTotal = useMemo(
    () => (manifest.data?.counties ?? []).reduce((acc, c) => acc + (c.upcomingCount || 0), 0),
    [manifest.data]
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {/* hero */}
      <section className="pb-8 pt-14 sm:pt-20">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
          State tax sale directory
        </p>
        <h1 className="max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Every county.
          <br />
          <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-transparent">
            One calendar.
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          The rules behind each county&rsquo;s tax sale, next to the date of its next auction.
          Texas is fully loaded; more states follow the same pattern.
        </p>

        <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
          <StatChip label="Counties" value={manifest.data ? manifest.data.counts.counties : <Skeleton className="h-7 w-12" />} />
          <StatChip label="Upcoming auctions" value={manifest.data ? upcomingTotal.toLocaleString() : <Skeleton className="h-7 w-12" />} />
          <StatChip label="States" value={manifest.data ? stateNames.length : <Skeleton className="h-7 w-12" />} />
        </div>
      </section>

      {/* controls */}
      <section className="sticky top-16 z-30 -mx-4 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search counties…"
              className="h-11 w-full rounded-full border border-line bg-panel pl-11 pr-4 text-sm text-ink outline-none transition-all placeholder:text-muted focus:border-amber-500/60 focus:ring-4 focus:ring-amber-500/10"
            />
          </div>
          <select
            value={stateName}
            onChange={(e) => setStateName(e.target.value)}
            className="h-11 rounded-full border border-line bg-panel px-4 text-sm font-medium text-ink outline-none transition-colors focus:border-amber-500/60"
          >
            {stateNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-muted">
          {counties.length.toLocaleString()} {counties.length === 1 ? "county" : "counties"}
          {query && " matching your search"}
        </p>
      </section>

      {/* grid */}
      <section className="pt-6">
        {manifest.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : counties.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line py-20 text-center">
            <p className="font-display text-xl font-semibold">No counties match that search.</p>
            <p className="mt-1 text-sm text-muted">Try a shorter name, like “harris”.</p>
          </div>
        ) : (
          <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {counties.map((c) => (
              <Item key={c.id}>
                <CountyCard county={c} onHover={() => prefetchCounty(qc, c.id)} />
              </Item>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}

function CountyCard({ county, onHover }: { county: CountyEntry; onHover: () => void }) {
  return (
    <Link
      href={`/county/${county.id}/`}
      onMouseEnter={onHover}
      onFocus={onHover}
      className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-line bg-panel p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-[0_12px_40px_-16px_var(--glow)]"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-lg font-semibold tracking-tight">{county.name}</h3>
          {county.code && (
            <span className="rounded-md border border-line bg-panel2 px-1.5 py-0.5 text-[10px] font-bold text-muted">
              {county.code}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          {county.upcomingCount > 0
            ? `${county.upcomingCount} upcoming ${county.upcomingCount === 1 ? "auction" : "auctions"}`
            : "No upcoming auctions listed"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {county.upcomingCount > 0 && <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500">{county.upcomingCount}</Badge>}
        <span className="grid size-8 place-items-center rounded-full border border-line text-muted transition-all duration-300 group-hover:border-amber-500/50 group-hover:bg-amber-500/10 group-hover:text-amber-500">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}