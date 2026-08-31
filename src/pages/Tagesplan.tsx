import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Minimize2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useSalonData } from "@/hooks/useSalonData";
import { db } from "@/lib/db";
import { toDateKey } from "@/lib/utils";
import type { BlockedSlot, Booking } from "@/data/types";
import { DayView } from "@/components/admin/CalendarViews";
import { bookingServiceLabel, StatusBadge } from "@/components/admin/shared";
import { Wordmark } from "@/components/Header";

/**
 * Tagesplan plein ecran, pense pour la tablette posee au salon.
 * Grands caracteres, une seule journee, rafraichissement automatique.
 */
export default function Tagesplan() {
  const { t, lang } = useLanguage();
  const { ready, isAdmin } = useAdminAuth();
  const { services, barbers, openingHours } = useSalonData();

  const [day, setDay] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [version, setVersion] = useState(0);

  const key = toDateKey(day);

  useEffect(() => {
    let cancelled = false;
    Promise.all([db.listBookings(key, key), db.listBlocked(key, key)])
      .then(([b, blk]) => {
        if (cancelled) return;
        setBookings(b);
        setBlocked(blk);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  // Rafraichissement automatique : la tablette reste ouverte toute la journee.
  useEffect(() => {
    const id = window.setInterval(() => setVersion((v) => v + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-stone">
        {t.common.loading}
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/admin" replace />;

  const open = bookings.filter((b) => b.status !== "cancelled").length;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-carbon/10 bg-paper-soft">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-5">
            <Wordmark />
            <span className="font-body text-[11px] font-semibold uppercase tracking-brand text-brass">
              {t.admin.tabs.today}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-body text-[14px] text-stone">
              {t.admin.today}: <strong className="text-carbon">{open}</strong>
            </span>
            <button
              onClick={refresh}
              className="grid h-11 w-11 place-items-center rounded-full border border-carbon/15 text-stone transition-colors hover:text-carbon"
              aria-label={t.common.loading}
            >
              <RefreshCw size={16} />
            </button>
            <Link to="/admin" className="btn-ghost !px-5 !py-3">
              <Minimize2 size={14} /> {t.admin.title}
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <DayView
          compact
          services={services}
          barbers={barbers}
          openingHours={openingHours}
          bookings={bookings}
          blocked={blocked}
          onSelect={setSelected}
          date={day}
          setDate={setDay}
        />
      </main>

      {selected ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-carbon/40 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-carbon/10 bg-white p-8 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="eyebrow">{t.admin.client}</p>
            <h2 className="mt-2 font-display text-[32px] font-semibold text-carbon">
              {selected.client_name}
            </h2>
            <p className="mt-1 font-body text-[16px] text-stone">
              {bookingServiceLabel(selected, services, lang)}
            </p>
            <p className="mt-4 font-display text-[26px] font-semibold tabular-nums text-carbon">
              {selected.start_time} - {selected.end_time}
            </p>
            <p className="mt-1 font-body text-[15px] text-stone">
              {barbers.find((b) => b.id === selected.barber_id)?.name ?? t.team.anyBarber} ·{" "}
              {selected.client_phone}
            </p>
            <div className="mt-6 flex items-center justify-between gap-3">
              <StatusBadge status={selected.status} label={t.admin.statuses[selected.status]} />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await db.updateBooking(selected.id, { status: "done" });
                    setSelected(null);
                    refresh();
                  }}
                  className="btn-solid !px-5 !py-3"
                >
                  {t.admin.statuses.done}
                </button>
                <button
                  onClick={async () => {
                    await db.updateBooking(selected.id, { status: "no_show" });
                    setSelected(null);
                    refresh();
                  }}
                  className="btn-ghost !px-5 !py-3"
                >
                  {t.admin.statuses.no_show}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
