import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarPlus, Check, Download, Loader2, Phone, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SALON, SALON_ADDRESS_LINE } from "@/data/salon";
import { db } from "@/lib/db";
import { buildIcs, downloadIcs, googleCalendarUrl } from "@/lib/ics";
import { canSelfCancel } from "@/lib/pricing";
import { cn, formatPrice, fromDateKey } from "@/lib/utils";
import type { ManagedBooking } from "@/data/types";
import { Wordmark } from "@/components/Header";
import { StatusBadge } from "@/components/admin/shared";

/**
 * Page ouverte depuis le lien secret de la confirmation ou de l'e-mail.
 * Le client voit son rendez-vous et peut l'annuler tant que le delai le
 * permet. Aucun compte, aucun mot de passe : le jeton suffit, et il ne donne
 * acces qu'a ce seul rendez-vous.
 */
export default function ManageBooking() {
  const { t, lang } = useLanguage();
  const { token = "" } = useParams();

  const [booking, setBooking] = useState<ManagedBooking | null | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCancelled, setJustCancelled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    db.getManagedBooking(token)
      .then((b) => {
        if (!cancelled) setBooking(b);
      })
      .catch(() => {
        if (!cancelled) setBooking(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const cancel = async () => {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      await db.cancelByToken(token);
      setBooking({ ...booking, status: "cancelled" });
      setJustCancelled(true);
      setConfirming(false);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(
        code === "TOO_LATE"
          ? t.manage.tooLate.replace("{hours}", String(booking.cancel_deadline_hours))
          : t.manage.errorGeneric,
      );
    } finally {
      setBusy(false);
    }
  };

  const serviceLabel = booking
    ? (lang === "en" ? booking.service_names_en : booking.service_names_de).join(" + ")
    : "";

  const isPast = booking
    ? new Date(`${booking.booking_date}T${booking.end_time}:00`).getTime() < Date.now()
    : false;
  const cancellable =
    booking &&
    booking.status !== "cancelled" &&
    !isPast &&
    canSelfCancel(booking.booking_date, booking.start_time, booking.cancel_deadline_hours);

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
        {booking === undefined ? (
          <p className="flex items-center gap-3 text-stone">
            <Loader2 size={16} className="animate-spin" /> {t.common.loading}
          </p>
        ) : booking === null ? (
          <>
            <span className="grid h-16 w-16 place-items-center rounded-full bg-carbon/[0.06] text-stone">
              <XCircle size={26} />
            </span>
            <h1 className="mt-7 font-display text-[clamp(1.8rem,4vw,2.4rem)] font-semibold text-carbon">
              {t.manage.notFound}
            </h1>
            <Link to="/termin" className="btn-solid mt-8">
              {t.manage.bookAgain}
            </Link>
          </>
        ) : (
          <>
            <span
              className={cn(
                "grid h-16 w-16 place-items-center rounded-full",
                booking.status === "cancelled" ? "bg-carbon/[0.06] text-stone" : "bg-carbon text-paper",
              )}
            >
              {booking.status === "cancelled" ? <XCircle size={26} /> : <Check size={26} />}
            </span>

            <h1 className="mt-7 font-display text-[clamp(2rem,5vw,2.9rem)] font-semibold leading-tight text-carbon">
              {justCancelled ? t.manage.cancelDone : t.manage.title}
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-stone">
              {booking.status === "cancelled"
                ? justCancelled
                  ? ""
                  : t.manage.cancelledNotice
                : isPast
                  ? t.manage.pastNotice
                  : t.manage.sub}
            </p>

            <div
              className={cn(
                "mt-10 w-full rounded-3xl border border-carbon/10 bg-white p-7 text-left shadow-soft",
                booking.status === "cancelled" && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-4 border-b border-carbon/10 pb-5">
                <div>
                  <span className="block font-display text-[21px] font-medium text-carbon">
                    {serviceLabel}
                  </span>
                  <span className="mt-2 inline-block">
                    <StatusBadge status={booking.status} label={t.admin.statuses[booking.status]} />
                  </span>
                </div>
                <span className="shrink-0 text-right">
                  {booking.discount > 0 ? (
                    <span className="block font-body text-[12px] text-stone line-through">
                      {formatPrice(booking.price + booking.discount)} EUR
                    </span>
                  ) : null}
                  <span className="font-display text-[24px] font-semibold text-carbon">
                    {formatPrice(booking.price)}
                    <span className="ml-1 font-body text-[13px] font-medium text-stone">EUR</span>
                  </span>
                </span>
              </div>

              <dl className="mt-5 space-y-3.5">
                <Row label={t.admin.client} value={booking.client_name} />
                <Row
                  label={t.booking.date}
                  value={fromDateKey(booking.booking_date).toLocaleDateString(lang, {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                />
                <Row label={t.booking.time} value={`${booking.start_time} - ${booking.end_time}`} />
                <Row label={t.booking.barber} value={booking.barber_name || t.team.anyBarber} />
                <Row label={t.booking.duration} value={`${booking.duration_min} ${t.common.min}`} />
                <Row label={t.contact.address} value={SALON_ADDRESS_LINE} />
              </dl>
            </div>

            {booking.status !== "cancelled" && !isPast ? (
              <>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() =>
                      downloadIcs(
                        `delherren-${booking.booking_date}.ics`,
                        buildIcs({
                          title: `${SALON.shortName} · ${serviceLabel}`,
                          description: `${serviceLabel} · ${booking.barber_name}\n${SALON_ADDRESS_LINE}\n${SALON.phone}`,
                          date: booking.booking_date,
                          startTime: booking.start_time,
                          endTime: booking.end_time,
                          uid: token,
                        }),
                      )
                    }
                    className="btn-ghost !px-6 !py-3.5"
                  >
                    <Download size={14} /> {t.confirmation.downloadIcs}
                  </button>
                  <a
                    href={googleCalendarUrl({
                      title: `${SALON.shortName} · ${serviceLabel}`,
                      description: `${serviceLabel} · ${booking.barber_name}\n${SALON_ADDRESS_LINE}`,
                      date: booking.booking_date,
                      startTime: booking.start_time,
                      endTime: booking.end_time,
                      uid: token,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !px-6 !py-3.5"
                  >
                    <CalendarPlus size={14} /> {t.confirmation.googleCalendar}
                  </a>
                </div>

                <div className="mt-8 w-full rounded-3xl border border-carbon/10 bg-white p-6 text-left">
                  {cancellable ? (
                    confirming ? (
                      <div>
                        <p className="font-display text-[19px] font-medium text-carbon">
                          {t.manage.cancelConfirm}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button onClick={cancel} disabled={busy} className="btn-solid !px-5 !py-3">
                            {busy ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                            {t.manage.cancelYes}
                          </button>
                          <button
                            onClick={() => setConfirming(false)}
                            disabled={busy}
                            className="btn-ghost !px-5 !py-3"
                          >
                            {t.manage.cancelKeep}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="font-body text-[13px] leading-relaxed text-stone">
                          {t.manage.deadlineNote.replace("{hours}", String(booking.cancel_deadline_hours))}
                        </p>
                        <button
                          onClick={() => setConfirming(true)}
                          className="btn-ghost shrink-0 !px-5 !py-3 hover:!border-destructive/50 hover:!text-destructive"
                        >
                          <XCircle size={13} /> {t.manage.cancelBtn}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="font-body text-[13px] leading-relaxed text-stone">
                        {t.manage.tooLate.replace("{hours}", String(booking.cancel_deadline_hours))}
                      </p>
                      <a href={SALON.phoneHref} className="btn-solid shrink-0 !px-5 !py-3">
                        <Phone size={13} /> {t.common.call}
                      </a>
                    </div>
                  )}
                  {error ? (
                    <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/[0.07] px-4 py-3 text-[13px] text-destructive">
                      {error}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            {booking.status === "cancelled" || isPast ? (
              <Link to="/termin" className="btn-solid mt-8">
                {t.manage.bookAgain}
              </Link>
            ) : null}
          </>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-5">
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
