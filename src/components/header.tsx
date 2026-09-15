"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Landmark, Moon, RefreshCw, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useManifest } from "@/lib/api";
import { lastSyncedLabel } from "@/lib/format";
import { useTheme } from "./theme";

const NAV = [
  { href: "/", label: "Counties" },
  { href: "/calendar/", label: "Auction calendar" },
];

export function Header() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const manifest = useManifest();
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function refresh() {
    if (syncing) return;
    setSyncing(true);
    setFlash(null);
    await qc.invalidateQueries();
    await qc.refetchQueries();
    setSyncing(false);
    setFlash("Up to date");
    window.setTimeout(() => setFlash(null), 2600);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-zinc-950 shadow-[0_4px_18px_-4px_rgba(245,158,11,0.6)]">
            <Landmark className="size-4.5" strokeWidth={2.2} />
          </span>
          <span className="hidden font-display text-lg font-bold tracking-tight sm:block">
            Tax Sale<span className="text-amber-500">.</span>
          </span>
        </Link>

        <nav className="ml-2 flex items-center gap-1">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-panel2 text-ink" : "text-muted hover:text-ink"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-muted md:flex">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {flash ?? (manifest.data ? lastSyncedLabel(manifest.data.generatedAt) : "Loading…")}
          </span>
          <button
            onClick={refresh}
            aria-label="Refresh data"
            title="Check for fresh data"
            className="grid size-9 place-items-center rounded-full border border-line bg-panel2 text-muted transition-colors hover:border-amber-500/40 hover:text-amber-500"
          >
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
          </button>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid size-9 place-items-center rounded-full border border-line bg-panel2 text-muted transition-colors hover:text-ink"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link
            href="/calendar/"
            className="hidden items-center gap-2 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 px-4 h-9 text-sm font-semibold text-zinc-950 transition-all hover:brightness-110 sm:inline-flex"
          >
            <CalendarDays className="size-4" />
            Next auctions
          </Link>
        </div>
      </div>
    </header>
  );
}