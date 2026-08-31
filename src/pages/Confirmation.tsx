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
    <div className="min-h-screen bg-paper-soft">
      <header className="border-b border-carbon/10 bg-paper">
        <div className="container flex items-center justify-center py-5">
          <Link to="/">
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="container flex max-w-xl flex-col items-center py-14 text-center md:py-20">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-carbon text-paper">
          <Check size={26} />
        </span>

        <h1 className="mt-7 font-display text-[clamp(2rem,5vw,2.9rem)] font-semibold leading-tight text-carbon">
          {t.confirmation.title}
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-stone">{t.confirmation.sub}</p>

        <div className="mt-10 w-full rounded-3xl border border-carbon/10 bg-white p-7 text-left shadow-soft">
          <div className="flex items-baseline justify-between gap-4 border-b border-carbon/10 pb-5">
            <span className="font-display text-[21px] font-medium text-carbon">{serviceLabel}</span>
            <span className="shrink-0 font-display text-[24px] font-semibold text-carbon">
              {formatPrice(booking.price)}
              <span className="ml-1 font-body text-[13px] font-medium text-stone">EUR</span>
            </span>
          </div>

          <dl className="mt-5 space-y-3.5">
            <Row label={t.booking.date} value={prettyDate} />
            <Row label={t.booking.time} value={`${booking.start_time} - ${booking.end_time}`} />
            <Row label={t.booking.barber} value={barberLabel} />
            <Row label={t.booking.duration} value={`${booking.duration_min} ${t.common.min}`} />
            <Row label={t.contact.address} value={SALON_ADDRESS_LINE} />
            <Row label={t.confirmation.reference} value={booking.id.slice(-8).toUpperCase()} />
          </dl>
        </div>

        <div className="mt-7 w-full">
          <p className="eyebrow">{t.confirmation.addToCalendar}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => downloadIcs(`delherren-${booking.booking_date}.ics`, buildIcs(icsInput))}
              className="btn-solid !px-6 !py-3.5"
            >
              <Download size={14} />
              {t.confirmation.downloadIcs}
            </button>
            <a
              href={googleCalendarUrl(icsInput)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost !px-6 !py-3.5"
            >
              <CalendarPlus size={14} />
              {t.confirmation.googleCalendar}
            </a>
          </div>
        </div>

        <p className="mt-10 font-display text-[18px] italic text-brass">{t.confirmation.seeYou}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-5">
          <Link
            to="/"
            className="font-body text-[13px] font-medium text-stone transition-colors hover:text-carbon"
          >
            {t.confirmation.backHome}
          </Link>
          <a
            href={SALON.phoneHref}
            className="flex items-center gap-2 font-body text-[13px] font-medium text-stone transition-colors hover:text-carbon"
          >
            <Phone size={13} /> {t.confirmation.callUs}
          </a>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="font-body text-[12px] text-stone">{label}</dt>
      <dd className="text-right font-body text-[14px] font-medium text-carbon">{value}</dd>
    </div>
  );
}
