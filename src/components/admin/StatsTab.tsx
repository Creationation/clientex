import { useMemo } from "react";
import { AlertTriangle, CalendarCheck, Euro, TrendingUp, Users, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Barber, Booking, Service } from "@/data/types";
import { addDays, cn, formatPrice, startOfWeek, toDateKey } from "@/lib/utils";
import { serviceName } from "@/components/sections/Services";
import { Empty } from "./shared";

/** Un rendez-vous compte dans le chiffre d'affaires s'il a eu lieu ou va avoir lieu. */
const COUNTS = new Set<Booking["status"]>(["confirmed", "done"]);

export function StatsTab({
  bookings,
  services,
  barbers,
}: {
  bookings: Booking[];
  services: Service[];
  barbers: Barber[];
}) {
  const { t, lang } = useLanguage();

  const stats = useMemo(() => {
    const today = toDateKey(new Date());
    const weekStart = toDateKey(startOfWeek(new Date()));
    const monthStart = today.slice(0, 8) + "01";
    const past = bookings.filter((b) => b.booking_date < today);

    const revenue = (rows: Booking[]) =>
      rows.filter((b) => COUNTS.has(b.status)).reduce((sum, b) => sum + b.price, 0);

    const thisMonth = bookings.filter((b) => b.booking_date >= monthStart && b.booking_date <= today);
    const countedMonth = thisMonth.filter((b) => COUNTS.has(b.status));

    const noShows = past.filter((b) => b.status === "no_show").length;
    const cancelled = bookings.filter((b) => b.status === "cancelled").length;
    const pastTotal = past.filter((b) => b.status !== "cancelled").length;

    const upcoming = bookings.filter((b) => b.booking_date >= today && COUNTS.has(b.status)).length;

    // Top prestations et barbiers (sur tout l'historique charge)
    const svcMap = new Map<string, { count: number; revenue: number }>();
    const brbMap = new Map<string, { count: number; revenue: number }>();
    for (const b of bookings) {
      if (!COUNTS.has(b.status)) continue;
      const share = b.service_ids.length > 0 ? b.price / b.service_ids.length : 0;
      for (const id of b.service_ids) {
        const cur = svcMap.get(id) ?? { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += share;
        svcMap.set(id, cur);
      }
      if (b.barber_id) {
        const cur = brbMap.get(b.barber_id) ?? { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += b.price;
        brbMap.set(b.barber_id, cur);
      }
    }
    const topServices = [...svcMap.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const topBarbers = [...brbMap.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    // Serie des 30 derniers jours
    const series: { key: string; label: string; revenue: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(new Date(), -i);
      const key = toDateKey(d);
      const rows = bookings.filter((b) => b.booking_date === key && COUNTS.has(b.status));
      series.push({
        key,
        label: d.toLocaleDateString(lang, { day: "2-digit", month: "2-digit" }),
        revenue: rows.reduce((s, b) => s + b.price, 0),
        count: rows.length,
      });
    }

    // Repartition par jour de semaine (lundi en premier)
    const weekday = [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
      wd,
      count: bookings.filter(
        (b) => b.status !== "cancelled" && new Date(`${b.booking_date}T00:00:00`).getDay() === wd,
      ).length,
    }));

    return {
      revToday: revenue(bookings.filter((b) => b.booking_date === today)),
      revWeek: revenue(bookings.filter((b) => b.booking_date >= weekStart && b.booking_date <= today)),
      revMonth: revenue(thisMonth),
      countMonth: countedMonth.length,
      avgTicket: countedMonth.length ? revenue(thisMonth) / countedMonth.length : 0,
      noShowRate: pastTotal ? (noShows / pastTotal) * 100 : 0,
      cancelRate: bookings.length ? (cancelled / bookings.length) * 100 : 0,
      upcoming,
      topServices,
      topBarbers,
      series,
      weekday,
    };
  }, [bookings, lang]);

  if (bookings.length === 0) return <Empty text={t.admin.stats.noData} />;

  const maxRev = Math.max(1, ...stats.series.map((s) => s.revenue));
  const maxWd = Math.max(1, ...stats.weekday.map((w) => w.count));
  const maxBrb = Math.max(1, ...stats.topBarbers.map((b) => b.revenue));

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Euro} label={t.admin.stats.revenueToday} value={`${formatPrice(stats.revToday)} EUR`} />
        <Kpi icon={Euro} label={t.admin.stats.revenueWeek} value={`${formatPrice(stats.revWeek)} EUR`} />
        <Kpi icon={TrendingUp} label={t.admin.stats.revenueMonth} value={`${formatPrice(stats.revMonth)} EUR`} accent />
        <Kpi icon={CalendarCheck} label={t.admin.stats.bookingsMonth} value={String(stats.countMonth)} />
        <Kpi icon={Users} label={t.admin.stats.avgTicket} value={`${formatPrice(Math.round(stats.avgTicket))} EUR`} />
        <Kpi icon={CalendarCheck} label={t.admin.stats.upcoming} value={String(stats.upcoming)} />
        <Kpi icon={AlertTriangle} label={t.admin.stats.noShowRate} value={`${stats.noShowRate.toFixed(1)} %`} warn />
        <Kpi icon={XCircle} label={t.admin.stats.cancelRate} value={`${stats.cancelRate.toFixed(1)} %`} warn />
      </div>
      <p className="font-body text-[12px] text-stone">{t.admin.stats.hint}</p>

      {/* 30 jours */}
      <div className="rounded-2xl border border-carbon/10 bg-paper-soft p-5">
        <h3 className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
          {t.admin.stats.last30}
        </h3>
        <div className="mt-4 flex h-40 items-end gap-[3px]">
          {stats.series.map((s) => (
            <div key={s.key} className="group relative flex h-full flex-1 flex-col justify-end" title={`${s.label} · ${formatPrice(s.revenue)} EUR · ${s.count}`}>
              <div
                className={cn("rounded-t-sm bg-carbon/80 transition-colors group-hover:bg-brass", s.revenue === 0 && "bg-carbon/10")}
                style={{ height: `${Math.max(2, (s.revenue / maxRev) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between font-body text-[10px] text-stone">
          <span>{stats.series[0].label}</span>
          <span>{stats.series[stats.series.length - 1].label}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top prestations */}
        <div className="rounded-2xl border border-carbon/10 bg-paper-soft p-5">
          <h3 className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
            {t.admin.stats.topServices}
          </h3>
          <ol className="mt-4 space-y-2.5">
            {stats.topServices.map((s, i) => {
              const svc = services.find((x) => x.id === s.id);
              return (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="w-5 font-display text-[16px] font-semibold text-stone/60">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-body text-[13px] font-medium text-carbon">
                    {svc ? serviceName(svc, lang) : s.id}
                  </span>
                  <span className="font-body text-[12px] tabular-nums text-stone">{s.count}×</span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Barbiers */}
        <div className="rounded-2xl border border-carbon/10 bg-paper-soft p-5">
          <h3 className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
            {t.admin.stats.topBarbers}
          </h3>
          <ul className="mt-4 space-y-3">
            {stats.topBarbers.map((b) => (
              <li key={b.id}>
                <div className="flex items-center justify-between font-body text-[13px]">
                  <span className="font-medium text-carbon">
                    {barbers.find((x) => x.id === b.id)?.name ?? "-"}
                    <span className="ml-2 text-[11px] text-stone">{b.count}×</span>
                  </span>
                  <span className="tabular-nums text-carbon">{formatPrice(Math.round(b.revenue))} EUR</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-carbon/[0.07]">
                  <div className="h-1.5 rounded-full bg-brass" style={{ width: `${(b.revenue / maxBrb) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Jours de semaine */}
        <div className="rounded-2xl border border-carbon/10 bg-paper-soft p-5">
          <h3 className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
            {t.admin.stats.byWeekday}
          </h3>
          <div className="mt-4 flex h-32 items-end gap-2">
            {stats.weekday.map((w) => (
              <div key={w.wd} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="font-body text-[10px] tabular-nums text-stone">{w.count}</span>
                <div
                  className="w-full rounded-t-md bg-carbon/75"
                  style={{ height: `${Math.max(3, (w.count / maxWd) * 100)}%` }}
                />
                <span className="font-body text-[10px] font-semibold uppercase text-stone">
                  {t.hours.daysShort[w.wd]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent = false,
  warn = false,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-carbon/10 bg-paper-soft p-4">
      <div className="flex items-center gap-2 font-body text-[10px] font-semibold uppercase tracking-widest text-stone">
        <Icon size={12} className={cn(accent && "text-brass", warn && "text-destructive")} />
        {label}
      </div>
      <p className={cn("mt-2 font-display text-[26px] font-semibold tabular-nums", accent ? "text-brass" : "text-carbon")}>
        {value}
      </p>
    </div>
  );
}
