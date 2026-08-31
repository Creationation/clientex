import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ban, CalendarDays, Clock, KeyRound, LayoutGrid, List, LogOut, Maximize2, Scissors, Users, X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useSalonData } from "@/hooks/useSalonData";
import { db } from "@/lib/db";
import { SEED_ADMIN } from "@/data/seed";
import { addDays, cn, startOfWeek, toDateKey } from "@/lib/utils";
import type { AdminAccount, BlockedSlot, Booking } from "@/data/types";
import { Wordmark } from "@/components/Header";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { BookingsList, DayView, WeekView } from "@/components/admin/CalendarViews";
import { AdminsTab, BarbersTab, BlocksTab, HoursTab, ServicesTab } from "@/components/admin/EditorTabs";
import { bookingServiceLabel, Panel, StatusBadge } from "@/components/admin/shared";

type TabId =
  | "today" | "week" | "bookings" | "services" | "barbers" | "hours" | "blocks" | "admins";

const TABS: { id: TabId; Icon: typeof CalendarDays }[] = [
  { id: "today", Icon: LayoutGrid },
  { id: "week", Icon: CalendarDays },
  { id: "bookings", Icon: List },
  { id: "services", Icon: Scissors },
  { id: "barbers", Icon: Users },
  { id: "hours", Icon: Clock },
  { id: "blocks", Icon: Ban },
  { id: "admins", Icon: KeyRound },
];

export default function Admin() {
  const { t } = useLanguage();
  const { ready, isAdmin } = useAdminAuth();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-stone">
        {t.common.loading}
      </div>
    );
  }

  if (!isAdmin) return <SignIn />;
  return <Dashboard />;
}

/* ------------------------------- Connexion ------------------------------- */

function SignIn() {
  const { t } = useLanguage();
  const { signIn, demo } = useAdminAuth();
  const [mail, setMail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid min-h-screen place-items-center bg-paper-soft px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Wordmark />
        </div>

        <div className="mt-8 rounded-3xl border border-carbon/10 bg-white p-7 shadow-soft">
          <h1 className="font-display text-[26px] font-semibold text-carbon">{t.admin.title}</h1>
          <p className="mt-1 font-body text-[13px] text-stone">{t.admin.signInSub}</p>

          <form
            className="mt-6 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await signIn(mail, pw);
              } catch (err) {
                const code = err instanceof Error ? err.message : "";
                setError(code === "NOT_ADMIN" ? t.admin.notAdmin : t.admin.signInError);
              } finally {
                setBusy(false);
              }
            }}
          >
            <input
              className="field"
              type="email"
              autoComplete="username"
              placeholder={t.admin.email}
              value={mail}
              onChange={(e) => setMail(e.target.value)}
            />
            <input
              className="field"
              type="password"
              autoComplete="current-password"
              placeholder={t.admin.password}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/[0.07] px-4 py-2.5 font-body text-[13px] text-destructive">
                {error}
              </p>
            ) : null}
            <button disabled={busy} className="btn-solid w-full">
              {t.admin.signIn}
            </button>
          </form>

          {demo ? (
            <div className="mt-6 rounded-2xl border border-brass/25 bg-brass/[0.06] p-4">
              <p className="font-body text-[10px] font-semibold uppercase tracking-widest text-brass">
                {t.admin.demoCredentials}
              </p>
              <p className="mt-2 font-body text-[13px] leading-relaxed text-carbon">
                {SEED_ADMIN.email}
                <br />
                {SEED_ADMIN.password}
              </p>
              <p className="mt-2 font-body text-[12px] leading-relaxed text-stone">
                {t.admin.demoNotice}
              </p>
            </div>
          ) : null}
        </div>

        <Link
          to="/"
          className="mt-6 block text-center font-body text-[12px] font-medium text-stone transition-colors hover:text-carbon"
        >
          {t.confirmation.backHome}
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------- Dashboard ------------------------------- */

function Dashboard() {
  const { t, lang } = useLanguage();
  const { email, name, demo, signOut } = useAdminAuth();
  const { services, barbers, openingHours, settings, reload } = useSalonData(true);

  const [tab, setTab] = useState<TabId>("today");
  const [day, setDay] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [version, setVersion] = useState(0);

  const range = useMemo(() => {
    if (tab === "today") return [toDateKey(day), toDateKey(day)] as const;
    if (tab === "week") return [toDateKey(weekStart), toDateKey(addDays(weekStart, 6))] as const;
    return [toDateKey(addDays(new Date(), -60)), toDateKey(addDays(new Date(), 120))] as const;
  }, [tab, day, weekStart]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      db.listBookings(range[0], range[1]),
      db.listBlocked(range[0], range[1]),
      db.listAdmins(),
    ])
      .then(([b, blk, adm]) => {
        if (cancelled) return;
        setBookings(b);
        setBlocked(blk);
        setAdmins(adm);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [range, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const ctx = {
    services,
    barbers: barbers.filter((b) => b.active),
    openingHours,
    bookings,
    blocked,
    onSelect: setSelected,
  };

  const todayCount = bookings.filter(
    (b) => b.booking_date === toDateKey(new Date()) && b.status !== "cancelled",
  ).length;

  return (
    <div className="min-h-screen bg-paper-soft">
      <header className="sticky top-0 z-40 border-b border-carbon/10 bg-paper/95 backdrop-blur-xl">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Wordmark compact />
            </Link>
            <span className="font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
              {t.admin.title}
            </span>
            {demo ? (
              <span className="rounded-full border border-brass/35 px-3 py-1 font-body text-[10px] font-semibold uppercase tracking-widest text-brass">
                Demo
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden font-body text-[12px] text-stone sm:block">
              {t.admin.today}: <strong className="text-carbon">{todayCount}</strong>
            </span>
            <LanguageSwitcher />
            {name || email ? (
              <span className="hidden font-body text-[12px] text-stone lg:block">
                {name || email}
              </span>
            ) : null}
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-full border border-carbon/15 px-4 py-2 font-body text-[11px] font-semibold uppercase tracking-widest text-stone transition-colors hover:text-carbon"
            >
              <LogOut size={13} /> {t.admin.signOut}
            </button>
          </div>
        </div>

        <nav className="no-scrollbar overflow-x-auto border-t border-carbon/[0.07]">
          <div className="container flex min-w-max gap-1.5 py-2.5">
            {TABS.map(({ id, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 font-body text-[11px] font-semibold uppercase tracking-widest transition-colors",
                  tab === id ? "bg-carbon text-paper" : "text-stone hover:bg-carbon/[0.06]",
                )}
              >
                <Icon size={13} />
                {t.admin.tabs[id]}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="container space-y-6 py-8">
        {tab === "today" ? (
          <Panel
            title={t.admin.tabs.today}
            action={
              <Link
                to="/tagesplan"
                className="flex items-center gap-2 rounded-full border border-carbon/15 px-4 py-2 font-body text-[11px] font-semibold uppercase tracking-widest text-stone transition-colors hover:text-carbon"
              >
                <Maximize2 size={13} /> {t.admin.fullscreen}
              </Link>
            }
          >
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

        {tab === "admins" ? (
          <Panel title={t.admin.tabs.admins}>
            <AdminsTab admins={admins} demo={demo} reload={refresh} />
          </Panel>
        ) : null}
      </main>

      {/* Detail d'un rendez-vous */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/40 p-4 backdrop-blur-sm md:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-carbon/10 bg-white p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">{t.admin.client}</p>
                <h3 className="mt-1.5 font-display text-[24px] font-semibold text-carbon">
                  {selected.client_name}
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="grid h-10 w-10 place-items-center rounded-full border border-carbon/12 text-stone transition-colors hover:text-carbon"
              >
                <X size={15} />
              </button>
            </div>

            <dl className="mt-5 space-y-3">
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
                value={bookingServiceLabel(selected, services, lang)}
              />
              <DetailRow
                label={t.booking.barber}
                value={barbers.find((b) => b.id === selected.barber_id)?.name ?? t.team.anyBarber}
              />
              <DetailRow label={t.booking.total} value={`${selected.price} EUR`} />
              <DetailRow label={t.booking.phone} value={selected.client_phone} />
              <DetailRow label={t.booking.email} value={selected.client_email} />
              {selected.notes ? <DetailRow label={t.booking.notes} value={selected.notes} /> : null}
            </dl>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-carbon/10 pt-5">
              <StatusBadge status={selected.status} label={t.admin.statuses[selected.status]} />
              <select
                value={selected.status}
                onChange={async (e) => {
                  const status = e.target.value as Booking["status"];
                  await db.updateBooking(selected.id, { status });
                  setSelected({ ...selected, status });
                  refresh();
                }}
                className="rounded-full border border-carbon/15 bg-white px-4 py-2 font-body text-[12px] font-medium text-carbon outline-none focus:border-carbon/45"
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
      <dt className="font-body text-[12px] text-stone">{label}</dt>
      <dd className="text-right font-body text-[14px] font-medium text-carbon">{value}</dd>
    </div>
  );
}
