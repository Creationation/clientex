import { Link, Navigate, useLocation } from "react-router-dom";
import { CalendarPlus, Check, Download, Phone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SALON, SALON_ADDRESS_LINE } from "@/data/salon";
import { buildIcs, downloadIcs, googleCalendarUrl } from "@/lib/ics";
import { formatPrice } from "@/lib/utils";
import type { Booking } from "@/data/types";
import { Wordmark } from "@/components/Header";

interface ConfirmationState {
  booking: Booking;
  serviceLabel: string;
  barberLabel: string;
}

export default function Confirmation() {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const state = location.state as ConfirmationState | null;

  if (!state?.booking) return <Navigate to="/termin" replace />;

  const { booking, serviceLabel, barberLabel } = state;

  const icsInput = {
    title: `${SALON.shortName} · ${serviceLabel}`,
    description: `${serviceLabel} · ${barberLabel}\n${SALON_ADDRESS_LINE}\n${SALON.phone}`,
    date: booking.booking_date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    uid: booking.id,
  };

  const prettyDate = new Date(booking.booking_date).toLocaleDateString(lang, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="grain relative min-h-screen bg-marble">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brass/[0.07] blur-[130px]" />

      <header className="relative border-b border-white/10">
        <div className="container flex items-center justify-center py-6">
          <Link to="/">
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="container relative flex max-w-2xl flex-col items-center py-16 text-center md:py-24">
        <span className="grid h-16 w-16 place-items-center rounded-full border border-brass/40 bg-brass/10 text-brass">
          <Check size={26} />
        </span>

        <h1 className="mt-9 font-display text-[clamp(2.2rem,6vw,3.4rem)] leading-tight text-bone">
          {t.confirmation.title}
        </h1>
        <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-smoke">
          {t.confirmation.sub}
        </p>

        <div className="mt-12 w-full border border-white/10 bg-ink-soft/80 p-7 text-left backdrop-blur-sm">
          <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-5">
            <span className="font-display text-2xl text-bone">{serviceLabel}</span>
            <span className="font-display text-2xl text-brass">
              {formatPrice(booking.price)}
              <span className="ml-1 text-xs">EUR</span>
            </span>
          </div>

          <dl className="mt-6 space-y-4">
            <Row label={t.booking.date} value={prettyDate} />
            <Row label={t.booking.time} value={`${booking.start_time} - ${booking.end_time}`} />
            <Row label={t.booking.barber} value={barberLabel} />
            <Row label={t.booking.duration} value={`${booking.duration_min} ${t.common.min}`} />
            <Row label={t.contact.address} value={SALON_ADDRESS_LINE} />
            <Row label={t.confirmation.reference} value={booking.id.slice(-8).toUpperCase()} />
          </dl>
        </div>

        <div className="mt-8 w-full">
          <p className="eyebrow text-center">{t.confirmation.addToCalendar}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => downloadIcs(`delherren-${booking.booking_date}.ics`, buildIcs(icsInput))}
              className="btn-brass"
            >
              <Download size={13} />
              {t.confirmation.downloadIcs}
            </button>
            <a
              href={googleCalendarUrl(icsInput)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              <CalendarPlus size={13} />
              {t.confirmation.googleCalendar}
            </a>
          </div>
        </div>

        <p className="mt-12 font-display text-lg italic text-smoke">{t.confirmation.seeYou}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-brass"
          >
            {t.confirmation.backHome}
          </Link>
          <a
            href={SALON.phoneHref}
            className="flex items-center gap-2 font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-brass"
          >
            <Phone size={12} /> {t.confirmation.callUs}
          </a>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="font-body text-[10px] uppercase tracking-widest text-smoke">{label}</dt>
      <dd className="text-right font-body text-sm text-bone">{value}</dd>
    </div>
  );
}
