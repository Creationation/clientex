import type { ReactNode } from "react";
import type { Booking, BookingStatus, Service } from "@/data/types";
import { cn } from "@/lib/utils";
import { serviceName } from "@/components/sections/Services";

export const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "border-brass/40 bg-brass/[0.08] text-brass",
  confirmed: "border-success/35 bg-success/[0.08] text-success",
  done: "border-carbon/15 bg-carbon/[0.05] text-stone",
  no_show: "border-destructive/35 bg-destructive/[0.07] text-destructive",
  cancelled: "border-carbon/10 bg-transparent text-stone/60 line-through",
};

export const STATUS_DOT: Record<BookingStatus, string> = {
  pending: "bg-brass",
  confirmed: "bg-success",
  done: "bg-stone",
  no_show: "bg-destructive",
  cancelled: "bg-stone/40",
};

/** Libelle des prestations d'un rendez-vous, dans la langue courante. */
export function bookingServiceLabel(
  booking: Booking,
  services: Service[],
  lang: string,
): string {
  const names = booking.service_ids
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s))
    .map((s) => serviceName(s, lang));
  return names.length > 0 ? names.join(" + ") : "-";
}

export function StatusBadge({ status, label }: { status: BookingStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 font-body text-[11px] font-semibold",
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
    <section className="rounded-3xl border border-carbon/10 bg-white shadow-soft">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-carbon/10 px-6 py-4">
        <h2 className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
          {title}
        </h2>
        {action}
      </header>
      <div className="p-6">{children}</div>
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
      <span className="font-body text-[10px] font-semibold uppercase tracking-widest text-stone">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function Toggle({
  on,
  onClick,
  labelOn,
  labelOff,
}: {
  on: boolean;
  onClick: () => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2.5 font-body text-[11px] font-semibold uppercase tracking-widest transition-colors",
        on
          ? "border-success/40 bg-success/10 text-success"
          : "border-carbon/15 bg-white text-stone",
      )}
    >
      {on ? labelOn : labelOff}
    </button>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <p className="py-12 text-center font-body text-[13px] text-stone/70">{text}</p>
  );
}
