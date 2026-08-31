import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, LayoutGrid, List, LogOut, Scissors, Users, Clock, Ban, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useSalonData } from "@/hooks/useSalonData";
import { db } from "@/lib/db";
import { addDays, cn, startOfWeek, toDateKey } from "@/lib/utils";
import type { BlockedSlot, Booking } from "@/data/types";
import { Wordmark } from "@/components/Header";
import { BookingsList, DayView, WeekView } from "@/components/admin/CalendarViews";
import { BarbersTab, BlocksTab, HoursTab, ServicesTab } from "@/components/admin/EditorTabs";
import { Panel, StatusBadge } from "@/components/admin/shared";
import { serviceName } from "@/components/sections/Services";

type TabId = "today" | "week" | "bookings" | "services" | "barbers" | "hours" | "blocks";

const TABS: { id: TabId; Icon: typeof CalendarDays }[] = [
  { id: "today", Icon: LayoutGrid },
  { id: "week", Icon: CalendarDays },
  { id: "bookings", Icon: List },
  { id: "services", Icon: Scissors },
  { id: "barbers", Icon: Users },
  { id: "hours", Icon: Clock },
  { id: "blocks", Icon: Ban },
];

export default function Admin() {
  const { t } = useLanguage();
  const { ready, isAdmin, demo, email, signIn, signInDemo, signOut } = useAdminAuth();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink text-smoke">
        {t.common.loading}
      </div>
    );
  }

  if (!isAdmin) return <SignIn demo={demo} signIn={signIn} signInDemo={signInDemo} />;

  return <Dashboard email={email} demo={demo} signOut={signOut} />;
}

/* ------------------------------- Connexion ------------------------------- */

function SignIn({
  demo,
  signIn,
  signInDemo,
}: {
  demo: boolean;
  signIn: (e: string, p: string) => Promise<void>;
  signInDemo: () => void;
}) {
  const { t } = useLanguage();
  const [mail, setMail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-marble px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Wordmark />
        </div>
        <h1 className="mt-8 text-center font-display text-3xl text-bone">{t.admin.title}</h1>

        {demo ? (
          <div className="mt-8 border border-brass/30 bg-brass/[0.06] p-5 text-center">
            <p className="text-[12px] font-light leading-relaxed text-smoke">
              {t.admin.demoNotice}
            </p>
            <button onClick={signInDemo} className="btn-brass mt-5 w-full">
              {t.admin.demoEnter}
            </button>
          </div>
        ) : (
          <form
            className="mt-8 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await signIn(mail, pw);
              } catch {
                setError(t.admin.signInError);
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              className="field"
              type="email"
              placeholder={t.admin.email}
              value={mail}
              onChange={(e) => setMail(e.target.value)}
            />
            <input
              className="field"
              type="password"
              placeholder={t.admin.password}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button disabled={busy} className="btn-brass w-full">
              {t.admin.signIn}
            </button>
          </form>
        )}

        <Link
          to="/"
          className="mt-8 block text-center font-body text-[10px] uppercase tracking-widest text-smoke hover:text-brass"
        >
          {t.confirmation.backHome}
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------- Dashboard ------------------------------- */

function Dashboard({
  email,
  demo,
  signOut,
}: {
  email: string | null;
  demo: boolean;
  signOut: () => Promise<void>;
}) {
  const { t, lang } = useLanguage();
  const { services, barbers, openingHours, settings, reload } = useSalonData(true);

  const [tab, setTab] = useState<TabId>("today");
  const [day, setDay] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [version, setVersion] = useState(0);

  const range = useMemo(() => {
    if (tab === "today") return [toDateKey(day), toDateKey(day)] as const;
    if (tab === "week") return [toDateKey(weekStart), toDateKey(addDays(weekStart, 6))] as const;
    return [toDateKey(addDays(new Date(), -60)), toDateKey(addDays(new Date(), 120))] as const;
  }, [tab, day, weekStart]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([db.listBookings(range[0], range[1]), db.listBlocked(range[0], range[1])])
      .then(([b, blk]) => {
        if (cancelled) return;
        setBookings(b);
        setBlocked(blk);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [range, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const activeBarbers = barbers.filter((b) => b.active);

  const ctx = {
    services,
    barbers: activeBarbers,
    openingHours,
    bookings,
    blocked,
    onSelect: setSelected,
  };

  const todayCount = bookings.filter(
    (b) => b.booking_date === toDateKey(new Date()) && b.status !== "cancelled",
  ).length;

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 backdrop-blur-xl">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-5">
            <Link to="/">
              <Wordmark compact />
            </Link>
            <span className="font-body text-[10px] uppercase tracking-brand text-brass">
              {t.admin.title}
            </span>
            {demo ? (
              <span className="border border-brass/40 px-2 py-1 font-body text-[9px] uppercase tracking-widest text-brass">
                Demo
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden font-body text-[10px] uppercase tracking-widest text-smoke sm:block">
              {t.admin.today}: {todayCount}
            </span>
            {email ? (
              <span className="hidden font-body text-[10px] text-smoke md:block">{email}</span>
            ) : null}
            <button
              onClick={signOut}
              className="flex items-center gap-2 border border-white/10 px-3 py-2 font-body text-[10px] uppercase tracking-widest text-smoke hover:border-bone/50 hover:text-bone"
            >
              <LogOut size={12} /> {t.admin.signOut}
            </button>
          </div>
        </div>

        <nav className="no-scrollbar overflow-x-auto border-t border-white/[0.06]">
          <div className="container flex min-w-max gap-1 py-2">
            {TABS.map(({ id, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 font-body text-[10px] uppercase tracking-widest transition-colors",
                  tab === id ? "bg-bone text-ink" : "text-smoke hover:text-bone",
                )}
              >
                <Icon size={12} />
                {t.admin.tabs[id]}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="container space-y-6 py-8">
        {tab === "today" ? (
          <Panel title={t.admin.tabs.today}>
            <DayView {...ctx} date={day} setDate={setDay} />
          </Panel>
        ) : null}

        {tab === "week" ? (
          <Panel title={t.admin.tabs.week}>
            <WeekView {...ctx} weekStart={weekStart} setWeekStart={setWeekStart} />
          </Panel>
        ) : null}

        {tab === "bookings" ? (
          <Panel title={t.admin.tabs.bookings}>
            <BookingsList
              {...ctx}
              onStatus={async (id, status) => {
                await db.updateBooking(id, { status });
                refresh();
              }}
              onDelete={async (id) => {
                await db.deleteBooking(id);
                refresh();
              }}
            />
          </Panel>
        ) : null}

        {tab === "services" ? (
          <Panel title={t.admin.tabs.services}>
            <ServicesTab services={services} reload={reload} />
          </Panel>
        ) : null}

        {tab === "barbers" ? (
          <Panel title={t.admin.tabs.barbers}>
            <BarbersTab barbers={barbers} reload={reload} />
          </Panel>
        ) : null}

        {tab === "hours" ? (
          <Panel title={t.admin.tabs.hours}>
            <HoursTab openingHours={openingHours} settings={settings} reload={reload} />
          </Panel>
        ) : null}

        {tab === "blocks" ? (
          <Panel title={t.admin.tabs.blocks}>
            <BlocksTab barbers={barbers} blocked={blocked} reload={refresh} />
          </Panel>
        ) : null}
      </main>

      {/* Detail d'une reservation */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md border border-white/10 bg-ink-soft p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{t.admin.client}</p>
                <h3 className="mt-2 font-display text-2xl text-bone">{selected.client_name}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="grid h-9 w-9 place-items-center border border-white/10 text-smoke hover:text-bone"
              >
                <X size={14} />
              </button>
            </div>

            <dl className="mt-6 space-y-3">
              <DetailRow
                label={t.booking.date}
                value={new Date(selected.booking_date).toLocaleDateString(lang, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              />
              <DetailRow
                label={t.booking.time}
                value={`${selected.start_time} - ${selected.end_time}`}
              />
              <DetailRow
                label={t.booking.service}
                value={
                  services.find((s) => s.id === selected.service_id)
                    ? serviceName(services.find((s) => s.id === selected.service_id)!, lang)
                    : "-"
                }
              />
              <DetailRow
                label={t.booking.barber}
                value={barbers.find((b) => b.id === selected.barber_id)?.name ?? t.team.anyBarber}
              />
              <DetailRow label={t.booking.phone} value={selected.client_phone} />
              <DetailRow label={t.booking.email} value={selected.client_email} />
              {selected.notes ? (
                <DetailRow label={t.booking.notes} value={selected.notes} />
              ) : null}
            </dl>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
              <StatusBadge status={selected.status} label={t.admin.statuses[selected.status]} />
              <select
                value={selected.status}
                onChange={async (e) => {
                  const status = e.target.value as Booking["status"];
                  await db.updateBooking(selected.id, { status });
                  setSelected({ ...selected, status });
                  refresh();
                }}
                className="border border-white/10 bg-ink px-3 py-2 font-body text-[10px] uppercase tracking-widest text-bone outline-none focus:border-brass"
              >
                {(Object.keys(t.admin.statuses) as Booking["status"][]).map((s) => (
                  <option key={s} value={s}>
                    {t.admin.statuses[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="font-body text-[10px] uppercase tracking-widest text-smoke">{label}</dt>
      <dd className="text-right font-body text-sm text-bone">{value}</dd>
    </div>
  );
}
