import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Barber, BlockedSlot, Booking, OpeningHour, Service } from "@/data/types";
import { addDays, cn, toDateKey, toMinutes } from "@/lib/utils";
import { serviceName } from "@/components/sections/Services";
import { Empty, STATUS_DOT, StatusBadge } from "./shared";

interface Ctx {
  services: Service[];
  barbers: Barber[];
  openingHours: OpeningHour[];
  bookings: Booking[];
  blocked: BlockedSlot[];
  onSelect: (b: Booking) => void;
}

/* -------------------------------- Jour -------------------------------- */

export function DayView({
  date,
  setDate,
  ...ctx
}: Ctx & { date: Date; setDate: (d: Date) => void }) {
  const { t, lang } = useLanguage();
  const key = toDateKey(date);
  const hours = ctx.openingHours.find((h) => h.weekday === date.getDay());
  const dayBookings = ctx.bookings
    .filter((b) => b.booking_date === key)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const columns = ctx.barbers.length > 0 ? ctx.barbers : [];
  const open = hours?.is_open ? toMinutes(hours.open_time) : 9 * 60;
  const close = hours?.is_open ? toMinutes(hours.close_time) : 19 * 60;
  const rows: number[] = [];
  for (let m = open; m < close; m += 60) rows.push(m);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="grid h-9 w-9 place-items-center border border-white/10 text-smoke hover:border-brass hover:text-brass"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setDate(new Date())}
            className="border border-white/10 px-4 py-2 font-body text-[10px] uppercase tracking-widest text-smoke hover:border-brass hover:text-brass"
          >
            {t.admin.today}
          </button>
          <button
            onClick={() => setDate(addDays(date, 1))}
            className="grid h-9 w-9 place-items-center border border-white/10 text-smoke hover:border-brass hover:text-brass"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <p className="font-display text-xl text-bone">
          {date.toLocaleDateString(lang, { weekday: "long", day: "2-digit", month: "long" })}
        </p>
      </div>

      {!hours?.is_open ? (
        <Empty text={t.hours.closed} />
      ) : dayBookings.length === 0 ? (
        <Empty text={t.admin.noBookings} />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div
              className="grid border-b border-white/10 pb-2"
              style={{ gridTemplateColumns: `70px repeat(${Math.max(columns.length, 1)}, 1fr)` }}
            >
              <span />
              {columns.map((b) => (
                <span
                  key={b.id}
                  className="px-2 font-body text-[10px] uppercase tracking-widest text-brass"
                >
                  {b.name}
                </span>
              ))}
            </div>

            {rows.map((m) => (
              <div
                key={m}
                className="grid border-b border-white/[0.06]"
                style={{ gridTemplateColumns: `70px repeat(${Math.max(columns.length, 1)}, 1fr)` }}
              >
                <span className="py-4 font-body text-[10px] tracking-widest text-smoke/60">
                  {String(Math.floor(m / 60)).padStart(2, "0")}:00
                </span>
                {columns.map((b) => {
                  const items = dayBookings.filter(
                    (bk) =>
                      bk.barber_id === b.id &&
                      toMinutes(bk.start_time) >= m &&
                      toMinutes(bk.start_time) < m + 60,
                  );
                  return (
                    <div key={b.id} className="space-y-1 px-1 py-1">
                      {items.map((bk) => {
                        const svc = ctx.services.find((s) => s.id === bk.service_id);
                        return (
                          <button
                            key={bk.id}
                            onClick={() => ctx.onSelect(bk)}
                            className="w-full border border-white/10 bg-ink px-2.5 py-2 text-left transition-colors hover:border-brass/60"
                          >
                            <span className="flex items-center gap-1.5">
                              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[bk.status])} />
                              <span className="font-body text-[11px] text-bone">
                                {bk.start_time}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate font-body text-[11px] text-smoke">
                              {bk.client_name}
                            </span>
                            <span className="block truncate font-body text-[10px] text-smoke/60">
                              {svc ? serviceName(svc, lang) : ""}
                            </span>
                          </button>
                        );
                      })}
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
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="grid h-9 w-9 place-items-center border border-white/10 text-smoke hover:border-brass hover:text-brass"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="grid h-9 w-9 place-items-center border border-white/10 text-smoke hover:border-brass hover:text-brass"
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <p className="font-display text-lg text-bone">
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
                "border p-3",
                isToday ? "border-brass/50 bg-brass/[0.05]" : "border-white/10 bg-ink",
                closed && "opacity-45",
              )}
            >
              <p className="font-body text-[10px] uppercase tracking-widest text-brass">
                {t.hours.daysShort[d.getDay()]} {d.getDate()}
              </p>
              <div className="mt-3 space-y-1.5">
                {closed ? (
                  <p className="font-body text-[10px] uppercase tracking-widest text-smoke/50">
                    {t.hours.closed}
                  </p>
                ) : items.length === 0 ? (
                  <p className="font-body text-[10px] text-smoke/40">-</p>
                ) : (
                  items.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => ctx.onSelect(b)}
                      className="flex w-full items-center gap-1.5 border-l-2 border-brass/60 bg-white/[0.03] px-2 py-1.5 text-left hover:bg-white/[0.07]"
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[b.status])} />
                      <span className="font-body text-[10px] text-bone">{b.start_time}</span>
                      <span className="truncate font-body text-[10px] text-smoke">
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

/* ------------------------------ Liste ------------------------------ */

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
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-left font-body text-[9px] uppercase tracking-widest text-smoke">
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
            const svc = ctx.services.find((s) => s.id === b.service_id);
            const brb = ctx.barbers.find((x) => x.id === b.barber_id);
            return (
              <tr key={b.id} className="border-b border-white/[0.06] align-middle">
                <td className="py-3 pr-4 font-body text-[12px] text-bone">
                  {new Date(b.booking_date).toLocaleDateString(lang, {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </td>
                <td className="py-3 pr-4 font-body text-[12px] text-bone">
                  {b.start_time} - {b.end_time}
                </td>
                <td className="py-3 pr-4">
                  <span className="block font-body text-[12px] text-bone">{b.client_name}</span>
                  <span className="block font-body text-[10px] text-smoke">{b.client_phone}</span>
                </td>
                <td className="py-3 pr-4 font-body text-[12px] text-smoke">
                  {svc ? serviceName(svc, lang) : "-"}
                </td>
                <td className="py-3 pr-4 font-body text-[12px] text-smoke">
                  {brb?.name ?? t.team.anyBarber}
                </td>
                <td className="py-3 pr-4">
                  <select
                    value={b.status}
                    onChange={(e) => onStatus(b.id, e.target.value as Booking["status"])}
                    className="border border-white/10 bg-ink px-2 py-1.5 font-body text-[10px] uppercase tracking-widest text-bone outline-none focus:border-brass"
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
                    className="font-body text-[10px] uppercase tracking-widest text-smoke/60 hover:text-destructive"
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
