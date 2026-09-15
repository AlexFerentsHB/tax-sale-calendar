"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, MapPin } from "lucide-react";
import { useAllEvents } from "@/lib/api";
import { cn } from "@/lib/cn";
import { dayKey, download, formatDayHeader, formatTime, relativeDay, toCSV, toICS, typeClasses } from "@/lib/format";
import { Stagger, Item } from "@/components/motion";
import { Button, Skeleton } from "@/components/ui";
import type { AuctionEvent } from "@/lib/types";

const RANGES = [
  { key: "30", label: "Next 30 days" },
  { key: "90", label: "Next 90 days" },
  { key: "180", label: "Next 6 months" },
  { key: "all", label: "All upcoming" },
];

const TYPES = ["All", "Tax Deed", "Redeemable Deed", "Tax Lien"];

// Fixed at module load so render stays pure.
const NOW = Date.now();

function CalendarInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { events, isLoading } = useAllEvents();

  const countyFromUrl = params.get("county") ?? "";
  const [type, setType] = useState("All");
  const [range, setRange] = useState("90");
  const [county, setCounty] = useState(countyFromUrl);
  const [state, setState] = useState("");

  function push(filter: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(filter, value);
    else next.delete(filter);
    router.replace(`/calendar/?${next.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    const limitDays = range === "all" ? null : Number(range);
    return events.filter((e) => {
      if (type !== "All" && e.type !== type) return false;
      if (state && e.code !== state) return false;
      if (county && !e.title.toLowerCase().includes(county.toLowerCase())) return false;
      if (limitDays) {
        const t = new Date((e.startDate ?? "").replace(" ", "T") + "Z").getTime();
        if (!isNaN(t) && t > NOW + limitDays * 86400000) return false;
      }
      return true;
    });
  }, [events, type, range, county, state]);

  const groups = useMemo(() => {
    const map = new Map<string, AuctionEvent[]>();
    for (const e of filtered) {
      const k = dayKey(e.startDate);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) if (e.code) set.add(e.code);
    return [...set].sort();
  }, [events]);

  function exportICS() {
    download("tax-sale-auctions.ics", toICS(filtered), "text/calendar");
  }
  function exportCSV() {
    download("tax-sale-auctions.csv", toCSV(filtered), "text/csv");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <section className="pb-6 pt-12 sm:pt-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">Auction calendar</p>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          What&rsquo;s coming up
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Upcoming tax deed, redeemable deed, and tax lien auctions, grouped by date. Filter the
          field to the states and counties you care about, then export to your calendar.
        </p>
      </section>

      {/* filters */}
      <section className="sticky top-16 z-30 -mx-4 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                  type === t
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                    : "border-line bg-panel text-muted hover:text-ink"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="h-10 rounded-full border border-line bg-panel px-3 text-sm font-medium outline-none focus:border-amber-500/60"
            >
              <option value="">All states</option>
              {stateOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              value={county}
              onChange={(e) => {
                setCounty(e.target.value);
                push("county", e.target.value);
              }}
              placeholder="Filter by county…"
              className="h-10 w-full rounded-full border border-line bg-panel px-4 text-sm outline-none placeholder:text-muted focus:border-amber-500/60 sm:w-52"
            />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-10 rounded-full border border-line bg-panel px-3 text-sm font-medium outline-none focus:border-amber-500/60"
            >
              {RANGES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={exportICS} className="h-10 px-3.5">
                <Download className="size-4" /> ICS
              </Button>
              <Button variant="secondary" onClick={exportCSV} className="h-10 px-3.5">
                <Download className="size-4" /> CSV
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          {filtered.length.toLocaleString()} auctions ·{" "}
          {range === "all" ? "all future dates" : `next ${range} days`}
          {state && ` · state ${state}`}
          {county && ` · county “${county}”`}
        </p>
      </section>

      {/* grouped list */}
      <section className="pt-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line py-20 text-center">
            <p className="font-display text-xl font-semibold">No auctions match those filters.</p>
            <p className="mt-1 text-sm text-muted">Try widening the date range or clearing the county filter.</p>
          </div>
        ) : (
          <Stagger className="space-y-6">
            {groups.map(([day, dayEvents]) => (
              <Item key={day}>
                <DayGroup day={day} events={dayEvents} />
              </Item>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}

function DayGroup({ day, events }: { day: string; events: AuctionEvent[] }) {
  return (
    <div>
      <div className="sticky top-28 z-20 mb-2 flex items-baseline gap-3 rounded-xl bg-bg/90 py-1 backdrop-blur-xl">
        <h2 className="font-display text-base font-bold tracking-tight">{formatDayHeader(day)}</h2>
        <span className={cn("text-xs font-medium", relativeDay(day, NOW) === "Today" || relativeDay(day, NOW) === "Tomorrow" ? "text-amber-500" : "text-muted")}>
          {relativeDay(day, NOW)}
        </span>
        <span className="text-xs text-muted">
          {events.length} auction{events.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <EventRow key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: AuctionEvent }) {
  const t = typeClasses(event.type);
  const time = formatTime(event.startDate, event.timezone);
  return (
    <a
      href={event.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-4 rounded-2xl border border-line bg-panel p-4 transition-all hover:border-amber-500/40 hover:shadow-[0_10px_34px_-18px_var(--glow)]"
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line bg-panel2">
        <span className={cn("size-2.5 rounded-full", t.dot)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-semibold">{event.title}</p>
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", t.badge)}>
            {event.type}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
          {time && <span className="font-medium">{time}</span>}
          {event.venue?.city && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="size-3" /> {event.venue.city}
            </span>
          )}
        </p>
      </div>
    </a>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-4 py-16"><Skeleton className="h-20 w-full" /></div>}>
      <CalendarInner />
    </Suspense>
  );
}