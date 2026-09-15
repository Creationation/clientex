import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ban, BarChart3, CalendarDays, Clock, KeyRound, LayoutGrid, List, LogOut, Maximize2, Plus,
  Scissors, Tag, Users,
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
import { BookingSheet } from "@/components/admin/BookingSheet";
import { NewBookingSheet } from "@/components/admin/NewBookingSheet";
import { PromoCodesTab } from "@/components/admin/PromoCodesTab";
import { StatsTab } from "@/components/admin/StatsTab";
import { Panel } from "@/components/admin/shared";

type TabId =
  | "today" | "week" | "bookings" | "stats" | "services" | "barbers" | "hours" | "blocks"
  | "promos" | "admins";

const TABS: { id: TabId; Icon: typeof CalendarDays }[] = [
  { id: "today", Icon: LayoutGrid },
  { id: "week", Icon: CalendarDays },
  { id: "bookings", Icon: List },
  { id: "stats", Icon: BarChart3 },
  { id: "services", Icon: Scissors },
  { id: "barbers", Icon: Users },
  { id: "hours", Icon: Clock },
  { id: "blocks", Icon: Ban },
  { id: "promos", Icon: Tag },
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
  const { t } = useLanguage();
  const { email, name, demo, signOut } = useAdminAuth();
  const { services, barbers, openingHours, barberHours, settings, reload } = useSalonData(true);

  const [tab, setTab] = useState<TabId>("today");
  const [day, setDay] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [version, setVersion] = useState(0);

  const range = useMemo(() => {
    if (tab === "today") return [toDateKey(day), toDateKey(day)] as const;
    if (tab === "week") return [toDateKey(weekStart), toDateKey(addDays(weekStart, 6))] as const;
    if (tab === "stats") return [toDateKey(addDays(new Date(), -365)), toDateKey(addDays(new Date(), 120))] as const;
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

  // Temps reel : une reservation prise sur le site apparait sans recharger.
  useEffect(() => db.subscribeBookings(refresh), [refresh]);

  // La fiche ouverte suit les donnees rechargees (deplacement, statut).
  useEffect(() => {
    if (!selected) return;
    const fresh = bookings.find((b) => b.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  const activeBarbers = useMemo(() => barbers.filter((b) => b.active), [barbers]);

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

  const newBookingButton = (
    <button onClick={() => setCreating(true)} className="btn-solid !px-4 !py-2 !text-[11px]">
      <Plus size={13} /> {t.admin.newBooking}
    </button>
  );

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
              <div className="flex items-center gap-2">
                {newBookingButton}
                <Link
                  to="/tagesplan"
                  className="flex items-center gap-2 rounded-full border border-carbon/15 px-4 py-2 font-body text-[11px] font-semibold uppercase tracking-widest text-stone transition-colors hover:text-carbon"
                >
                  <Maximize2 size={13} /> {t.admin.fullscreen}
                </Link>
              </div>
            }
          >
            <DayView {...ctx} date={day} setDate={setDay} />
          </Panel>
        ) : null}

        {tab === "week" ? (
          <Panel title={t.admin.tabs.week} action={newBookingButton}>
            <WeekView {...ctx} weekStart={weekStart} setWeekStart={setWeekStart} />
          </Panel>
        ) : null}

        {tab === "bookings" ? (
          <Panel title={t.admin.tabs.bookings} action={newBookingButton}>
            <BookingsList
              {...ctx}
              onStatus={async (id, status) => {
                if (status === "cancelled") await db.cancelBooking(id);
                else await db.updateBooking(id, { status });
                refresh();
              }}
              onDelete={async (id) => {
                await db.deleteBooking(id);
                refresh();
              }}
            />
          </Panel>
        ) : null}

        {tab === "stats" ? (
          <Panel title={t.admin.tabs.stats}>
            <StatsTab bookings={bookings} services={services} barbers={barbers} />
          </Panel>
        ) : null}

        {tab === "services" ? (
          <Panel title={t.admin.tabs.services}>
            <ServicesTab services={services} reload={reload} />
          </Panel>
        ) : null}

        {tab === "barbers" ? (
          <Panel title={t.admin.tabs.barbers}>
            <BarbersTab
              barbers={barbers}
              openingHours={openingHours}
              barberHours={barberHours}
              reload={reload}
            />
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

        {tab === "promos" ? (
          <Panel title={t.admin.tabs.promos}>
            <PromoCodesTab />
          </Panel>
        ) : null}

        {tab === "admins" ? (
          <Panel title={t.admin.tabs.admins}>
            <AdminsTab admins={admins} demo={demo} reload={refresh} />
          </Panel>
        ) : null}
      </main>

      {selected ? (
        <BookingSheet
          booking={selected}
          services={services}
          barbers={activeBarbers}
          onClose={() => setSelected(null)}
          onChanged={(updated) => {
            if (updated) setSelected(updated);
            refresh();
          }}
        />
      ) : null}

      {creating ? (
        <NewBookingSheet
          services={services.filter((s) => s.active)}
          barbers={activeBarbers}
          openingHours={openingHours}
          barberHours={barberHours}
          settings={settings}
          initialDate={tab === "today" ? toDateKey(day) : undefined}
          onClose={() => setCreating(false)}
          onCreated={refresh}
        />
      ) : null}
    </div>
  );
}
