"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, Landmark } from "lucide-react";
import { useAllEvents, useCounty } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatFull, relativeDay, typeClasses } from "@/lib/format";
import { Badge, Skeleton } from "@/components/ui";

const FACT_ORDER: { key: string; label: string }[] = [
  { key: "taxSaleType", label: "Sale type" },
  { key: "typicalSaleDate", label: "Typical sale date" },
  { key: "redemptionPeriod", label: "Redemption period" },
  { key: "interestRate", label: "Interest / return" },
  { key: "bidProcedure", label: "Bid procedure" },
  { key: "deposit", label: "Deposit" },
  { key: "registration", label: "Registration" },
  { key: "auctionLocation", label: "Auction location" },
  { key: "contact", label: "Contact" },
  { key: "updates", label: "Updates" },
];

export function CountyView({ id }: { id: number }) {
  const county = useCounty(id);
  const { events } = useAllEvents();

  if (county.isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <Skeleton className="h-40 w-full" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (county.isError || !county.data) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center sm:px-6">
        <p className="font-display text-2xl font-semibold">County not found.</p>
        <p className="mt-2 text-sm text-muted">It may not be part of this data set yet.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-amber-500 hover:underline">
          <ArrowLeft className="size-4" /> Back to all counties
        </Link>
      </div>
    );
  }

  const c = county.data;
  const countyEvents = events.filter((e) => e.countyId === id).slice(0, 6);
  const factList = FACT_ORDER.filter((f) => c.facts && (c.facts as Record<string, unknown>)[f.key])
    .map((f) => ({ ...f, value: (c.facts as Record<string, unknown>)[f.key] as string }));
  const extra = c.facts?.extra ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6">
      <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-amber-500">
        <ArrowLeft className="size-4" /> All counties
      </Link>

      {/* hero */}
      <header className="relative mt-4 overflow-hidden rounded-3xl border border-line bg-panel p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-gradient-to-br from-amber-500/25 to-orange-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            {c.code && <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-500">{c.state ?? c.code}</Badge>}
            {c.program && <Badge className="border-line bg-panel2 text-muted">{c.program}</Badge>}
            {c.lastUpdated && (
              <span className="text-xs text-muted">Updated {c.lastUpdated.slice(0, 10)}</span>
            )}
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {c.name}
          </h1>
          <p className="mt-3 max-w-lg text-muted">
            {c.upcomingCount > 0
              ? `${c.upcomingCount} upcoming auction${c.upcomingCount === 1 ? "" : "s"} scheduled.`
              : "No upcoming auctions are listed for this county right now."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/calendar/" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 px-4 h-10 text-sm font-semibold text-zinc-950 transition-all hover:brightness-110">
              <CalendarDays className="size-4" /> View calendar
            </Link>
            <a
              href={c.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-4 h-10 text-sm font-semibold transition-colors hover:border-amber-500/40 hover:text-amber-500"
            >
              Source page <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </header>

      {/* facts */}
      {factList.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Key facts</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {factList.map((f) => (
              <div key={f.key} className="rounded-2xl border border-line bg-panel p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">{f.label}</p>
                <p className="mt-2 text-sm leading-relaxed">{f.value}</p>
              </div>
            ))}
            {extra.map((e, i) => (
              <div key={`extra-${i}`} className="rounded-2xl border border-line bg-panel p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">{e.label}</p>
                <p className="mt-2 text-sm leading-relaxed">{e.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* upcoming auctions */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight">Upcoming auctions</h2>
          <Link href={`/calendar/?county=${encodeURIComponent(c.name)}`} className="text-sm font-medium text-amber-500 hover:underline">
            View in calendar
          </Link>
        </div>
        {countyEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center">
            <Landmark className="mx-auto size-6 text-muted" />
            <p className="mt-2 text-sm text-muted">
              No auctions scheduled for this county in the current data set.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {countyEvents.map((e) => {
              const t = typeClasses(e.type);
              return (
                <li key={e.id}>
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4 transition-all hover:border-amber-500/40"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("size-1.5 shrink-0 rounded-full", t.dot)} />
                        <p className="truncate text-sm font-semibold">{e.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {formatFull(e.startDate, e.timezone)}
                        <span className="mx-1.5">·</span>
                        {relativeDay(e.startDate?.slice(0, 10) ?? "")}
                      </p>
                    </div>
                    <Badge className={cn(t.badge)}>{e.type}</Badge>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* article */}
      {c.bodyHtml && (
        <section className="mt-10">
          <div className="rounded-3xl border border-line bg-panel p-6 sm:p-10">
            <div className="prose-article" dangerouslySetInnerHTML={{ __html: c.bodyHtml }} />
          </div>
        </section>
      )}
    </div>
  );
}