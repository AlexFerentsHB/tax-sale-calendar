import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({
  className,
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 h-10 text-sm font-semibold transition-all duration-200 select-none disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60";
  const variants = {
    primary:
      "text-zinc-950 bg-gradient-to-br from-amber-300 to-orange-500 hover:brightness-110 hover:-translate-y-px active:translate-y-0 shadow-[0_6px_24px_-6px_rgba(245,158,11,0.55)]",
    secondary:
      "bg-panel2 text-ink border border-line hover:border-amber-500/40 hover:text-amber-500 active:translate-y-px",
    ghost: "text-muted hover:text-ink hover:bg-panel2",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function Badge({
  className,
  children,
}: { className?: string; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-panel2", className)} />;
}

export function StatChip({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-4 py-3">
      <div className="font-display text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}