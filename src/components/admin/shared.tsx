import type { ReactNode } from "react";
import type { BookingStatus } from "@/data/types";
import { cn } from "@/lib/utils";

export const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "border-brass/50 text-brass",
  confirmed: "border-success/50 text-success",
  done: "border-white/25 text-smoke",
  no_show: "border-destructive/50 text-destructive",
  cancelled: "border-white/10 text-smoke/50 line-through",
};

export const STATUS_DOT: Record<BookingStatus, string> = {
  pending: "bg-brass",
  confirmed: "bg-success",
  done: "bg-smoke",
  no_show: "bg-destructive",
  cancelled: "bg-smoke/40",
};

export function StatusBadge({ status, label }: { status: BookingStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-1 font-body text-[9px] uppercase tracking-widest",
        STATUS_STYLE[status],
      )}
    >
      {label}
    </span>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-white/10 bg-ink-soft">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <h2 className="font-body text-[10px] uppercase tracking-brand text-brass">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="font-body text-[9px] uppercase tracking-widest text-smoke">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <p className="py-12 text-center font-body text-[11px] uppercase tracking-widest text-smoke/60">
      {text}
    </p>
  );
}
