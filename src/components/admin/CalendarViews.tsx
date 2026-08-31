import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Barber, BlockedSlot, Booking, OpeningHour, Service } from "@/data/types";
import { addDays, cn, toDateKey, toMinutes } from "@/lib/utils";
import { bookingServiceLabel, Empty, STATUS_DOT, StatusBadge } from "./shared";

export interface Ctx {
  services: Service[];
  barbers: Barber[];
  openingHours: OpeningHour[];
  bookings: Booking[];
  blocked: BlockedSlot[];
  onSelect: (b: Booking) => void;
}

function NavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full border border-carbon/12 text-carbon transition-colors hover:bg-carbon/[0.05]"
    >
      {children}
    </button>
  );
}

/* -------------------------------- Tagesplan -------------------------------- */

export function DayView({
  date,
  setDate,
  compact = false,
  ...ctx
}: Ctx & { date: Date; setDate: (d: Date) => void; compact?: boolean }) {
  const { t, lang } = useLanguage();
  const key = toDateKey(date);
  const hours = ctx.openingHours.find((h) => h.weekday === date.getDay());
  const dayBookings = ctx.bookings
    .filter((b) => b.booking_date === key && b.status !== "cancelled")
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const columns = ctx.barbers;
  const open = hours?.is_open ? toMinutes(hours.open_time) : 9 * 60;
  const close = hours?.is_open ? toMinutes(hours.close_time) : 19 * 60;
  const rows: number[] = [];
  for (let m = open; m < close; m += 60) rows.push(m);

  const dayBlocks = ctx.blocked.filter((b) => b.date === key);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <NavButton onClick={() => setDate(addDays(date, -1))}>
            <ChevronLeft size={16} />
          </NavButton>
          <button
            onClick={() => setDate(new Date())}
            className="rounded-full border border-carbon/12 px-5 py-2.5 font-body text-[11px] font-semibold uppercase tracking-widest text-carbon transition-colors hover:bg-carbon/[0.05]"
          >
            {t.admin.today}
          </button>
          <NavButton onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight size={16} />
          </NavButton>
        </div>
        <p
          className={cn(
            "font-display font-semibold text-carbon",
            compact ? "text-[28px]" : "text-[22px]",
          )}
        >
          {date.toLocaleDateString(lang, { weekday: "long", day: "2-digit", month: "long" })}
        </p>
      </div>

      {!hours?.is_open ? (
        <Empty text={t.hours.closed} />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div
              className="grid gap-2 border-b border-carbon/10 pb-3"
              style={{ gridTemplateColumns: `74px repeat(${Math.max(columns.length, 1)}, 1fr)` }}
            >
              <span />
              {columns.map((b) => (
                <span
                  key={b.id}
                  className={cn(
                    "px-2 font-display font-semibold text-carbon",
                    compact ? "text-[20px]" : "text-[16px]",
                  )}
                >
                  {b.name}
                </span>
              ))}
            </div>

            {rows.map((m) => (
              <div
                key={m}
                className="grid gap-2 border-b border-carbon/[0.07]"
                style={{ gridTemplateColumns: `74px repeat(${Math.max(columns.length, 1)}, 1fr)` }}
              >
                <span
                  className={cn(
                    "py-4 font-body tabular-nums text-stone",
                    compact ? "text-[15px]" : "text-[12px]",
                  )}
                >
                  {String(Math.floor(m / 60)).padStart(2, "0")}:00
                </span>
                {columns.map((b) => {
                  const items = dayBookings.filter(
                    (bk) =>
                      bk.barber_id === b.id &&
                      toMinutes(bk.start_time) >= m &&
                      toMinutes(bk.start_time) < m + 60,
                  );
                  const blocks = dayBlocks.filter(
                    (blk) =>
                      (blk.barber_id === b.id || blk.barber_id === null) &&
                      (blk.all_day ||
                        (toMinutes(blk.start_time) < m + 60 && toMinutes(blk.end_time) > m)),
                  );
                  return (
                    <div key={b.id} className="space-y-1.5 py-1.5">
                      {blocks.map((blk) => (
                        <div
                          key={blk.id}
                          className="rounded-xl border border-dashed border-carbon/20 bg-carbon/[0.03] px-3 py-2 font-body text-[11px] text-stone"
                        >
                          {blk.all_day
                            ? t.admin.allDay
                            : `${blk.start_time} - ${blk.end_time}`}
                          {blk.reason ? ` · ${blk.reason}` : ""}
                        </div>
                      ))}
                      {items.map((bk) => (
                        <button
                          key={bk.id}
                          onClick={() => ctx.onSelect(bk)}
                          className="w-full rounded-xl border border-carbon/10 bg-paper-soft px-3 py-2.5 text-left transition-colors hover:border-carbon/30 hover:bg-white"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn("h-2 w-2 rounded-full", STATUS_DOT[bk.status])}
                            />
                            <span
                              className={cn(
                                "font-body font-semibold tabular-nums text-carbon",
                                compact ? "text-[15px]" : "text-[12px]",
                              )}
                            >
                              {bk.start_time} - {bk.end_time}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block truncate font-body font-medium text-carbon",
                              compact ? "text-[16px]" : "text-[13px]",
                            )}
                          >
                            {bk.client_name}
                          </span>
                          <span
                            className={cn(
                              "block truncate font-body text-stone",
                              compact ? "text-[14px]" : "text-[11px]",
                            )}
                          >
                            {bookingServiceLabel(bk, ctx.services, lang)}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Semaine ------------------------------- */

export function WeekView({
  weekStart,
  setWeekStart,
  ...ctx
}: Ctx & { weekStart: Date; setWeekStart: (d: Date) => void }) {
  const { t, lang } = useLanguage();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <NavButton onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft size={16} />
          </NavButton>
          <NavButton onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight size={16} />
          </NavButton>
        </div>
        <p className="font-display text-[19px] font-semibold text-carbon">
          {days[0].toLocaleDateString(lang, { day: "2-digit", month: "short" })} -{" "}
          {days[6].toLocaleDateString(lang, { day: "2-digit", month: "short" })}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const key = toDateKey(d);
          const items = ctx.bookings
            .filter((b) => b.booking_date === key && b.status !== "cancelled")
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
          const isToday = key === toDateKey(new Date());
          const closed = !ctx.openingHours.find((h) => h.weekday === d.getDay())?.is_open;
          return (
            <div
              key={key}
              className={cn(
                "rounded-2xl border p-3",
                isToday ? "border-carbon/40 bg-paper-soft" : "border-carbon/10 bg-white",
                closed && "opacity-55",
              )}
            >
              <p className="font-body text-[11px] font-semibold uppercase tracking-widest text-stone">
                {t.hours.daysShort[d.getDay()]} {d.getDate()}
              </p>
              <div className="mt-3 space-y-1.5">
                {closed ? (
                  <p className="font-body text-[11px] text-stone/60">{t.hours.closed}</p>
                ) : items.length === 0 ? (
                  <p className="font-body text-[11px] text-stone/40">-</p>
                ) : (
                  items.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => ctx.onSelect(b)}
                      className="flex w-full items-center gap-2 rounded-lg bg-paper-soft px-2 py-1.5 text-left transition-colors hover:bg-carbon/[0.07]"
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[b.status])} />
                      <span className="font-body text-[11px] font-semibold tabular-nums text-carbon">
                        {b.start_time}
                      </span>
                      <span className="truncate font-body text-[11px] text-stone">
                        {b.client_name}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- Liste -------------------------------- */

export function BookingsList({
  onStatus,
  onDelete,
  ...ctx
}: Ctx & {
  onStatus: (id: string, status: Booking["status"]) => void;
  onDelete: (id: string) => void;
}) {
  const { t, lang } = useLanguage();
  const rows = [...ctx.bookings].sort((a, b) =>
    (b.booking_date + b.start_time).localeCompare(a.booking_date + a.start_time),
  );

  if (rows.length === 0) return <Empty text={t.admin.noBookings} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse">
        <thead>
          <tr className="border-b border-carbon/10 text-left font-body text-[10px] font-semibold uppercase tracking-widest text-stone">
            <th className="py-3 pr-4">{t.booking.date}</th>
            <th className="py-3 pr-4">{t.booking.time}</th>
            <th className="py-3 pr-4">{t.admin.client}</th>
            <th className="py-3 pr-4">{t.booking.service}</th>
            <th className="py-3 pr-4">{t.booking.barber}</th>
            <th className="py-3 pr-4">{t.admin.status}</th>
            <th className="py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const brb = ctx.barbers.find((x) => x.id === b.barber_id);
            return (
              <tr key={b.id} className="border-b border-carbon/[0.07] align-middle">
                <td className="py-3 pr-4 font-body text-[13px] tabular-nums text-carbon">
                  {new Date(b.booking_date).toLocaleDateString(lang, {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </td>
                <td className="py-3 pr-4 font-body text-[13px] tabular-nums text-carbon">
                  {b.start_time} - {b.end_time}
                </td>
                <td className="py-3 pr-4">
                  <span className="block font-body text-[13px] font-medium text-carbon">
                    {b.client_name}
                  </span>
                  <span className="block font-body text-[11px] text-stone">{b.client_phone}</span>
                </td>
                <td className="py-3 pr-4 font-body text-[13px] text-stone">
                  {bookingServiceLabel(b, ctx.services, lang)}
                </td>
                <td className="py-3 pr-4 font-body text-[13px] text-stone">
                  {brb?.name ?? t.team.anyBarber}
                </td>
                <td className="py-3 pr-4">
                  <select
                    value={b.status}
                    onChange={(e) => onStatus(b.id, e.target.value as Booking["status"])}
                    className="rounded-full border border-carbon/15 bg-white px-3 py-1.5 font-body text-[11px] font-medium text-carbon outline-none focus:border-carbon/45"
                  >
                    {(Object.keys(t.admin.statuses) as Booking["status"][]).map((s) => (
                      <option key={s} value={s}>
                        {t.admin.statuses[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => {
                      if (window.confirm(t.admin.confirmDelete)) onDelete(b.id);
                    }}
                    className="font-body text-[11px] font-semibold uppercase tracking-widest text-stone/70 transition-colors hover:text-destructive"
                  >
                    {t.common.delete}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { StatusBadge };
