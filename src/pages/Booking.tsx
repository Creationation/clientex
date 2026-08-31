import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSalonData } from "@/hooks/useSalonData";
import { db } from "@/lib/db";
import { buildSlots, isShopOpen } from "@/lib/slots";
import { addDays, cn, formatPrice, toDateKey, toMinutes } from "@/lib/utils";
import type { Barber, BlockedSlot, BusySlot, Service } from "@/data/types";
import { Wordmark } from "@/components/Header";
import { serviceName } from "@/components/sections/Services";
import { barberRole } from "@/components/sections/Team";

const STEPS = [0, 1, 2, 3, 4] as const;

export default function Booking() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { services, barbers, openingHours, settings, loading } = useSalonData();

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string>(params.get("service") ?? "");
  const [barberId, setBarberId] = useState<string | null>(params.get("barber"));
  const [barberTouched, setBarberTouched] = useState(Boolean(params.get("barber")));
  const [dateKey, setDateKey] = useState<string>("");
  const [time, setTime] = useState<string>("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [dayBusy, setDayBusy] = useState<BusySlot[]>([]);
  const [dayBlocked, setDayBlocked] = useState<BlockedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateOffset, setDateOffset] = useState(0);

  const service: Service | undefined = services.find((s) => s.id === serviceId);
  const barber: Barber | undefined = barbers.find((b) => b.id === barberId);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  /* Jours ouvrables proposes, limites par max_advance_days */
  const availableDates = useMemo(() => {
    if (openingHours.length === 0) return [];
    const out: Date[] = [];
    for (let i = 0; i < settings.max_advance_days && out.length < 45; i++) {
      const d = addDays(new Date(), i);
      if (isShopOpen(d, openingHours, [])) out.push(d);
    }
    return out;
  }, [openingHours, settings.max_advance_days]);

  useEffect(() => {
    if (!dateKey && availableDates.length > 0) setDateKey(toDateKey(availableDates[0]));
  }, [availableDates, dateKey]);

  /* Chargement des reservations et blocages du jour selectionne */
  useEffect(() => {
    if (!dateKey) return;
    let cancelled = false;
    setSlotsLoading(true);
    Promise.all([db.listBusy(dateKey, dateKey), db.listBlocked(dateKey, dateKey)])
      .then(([b, blk]) => {
        if (cancelled) return;
        setDayBusy(b);
        setDayBlocked(blk);
      })
      .catch(() => {
        if (!cancelled) {
          setDayBusy([]);
          setDayBlocked([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey, step]);

  const slots = useMemo(() => {
    if (!service || !dateKey) return [];
    const date = availableDates.find((d) => toDateKey(d) === dateKey);
    if (!date) return [];
    return buildSlots({
      date,
      durationMin: service.duration_min,
      barberId,
      openingHours,
      busy: dayBusy,
      blocked: dayBlocked,
      settings,
    });
  }, [service, dateKey, barberId, openingHours, dayBusy, dayBlocked, settings, availableDates]);

  const grouped = useMemo(() => {
    const morning = slots.filter((s) => toMinutes(s.time) < 12 * 60);
    const afternoon = slots.filter(
      (s) => toMinutes(s.time) >= 12 * 60 && toMinutes(s.time) < 17 * 60,
    );
    const evening = slots.filter((s) => toMinutes(s.time) >= 17 * 60);
    return [
      { label: t.booking.morning, items: morning },
      { label: t.booking.afternoon, items: afternoon },
      { label: t.booking.evening, items: evening },
    ].filter((g) => g.items.length > 0);
  }, [slots, t]);

  const hasFreeSlot = slots.some((s) => s.available);

  const canContinue = (() => {
    if (step === 0) return Boolean(serviceId);
    if (step === 1) return barberTouched;
    if (step === 2) return Boolean(dateKey);
    if (step === 3) return Boolean(time);
    return false;
  })();

  const validDetails =
    name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim()) && phone.trim().length >= 6;

  const submit = async () => {
    if (!service || !dateKey || !time) return;
    setError(null);
    if (!validDetails) {
      if (name.trim().length < 2) setError(t.booking.invalidName);
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())) setError(t.booking.invalidEmail);
      else setError(t.booking.invalidPhone);
      return;
    }
    setSaving(true);
    try {
      const booking = await db.createBooking({
        barber_id: barberId,
        service_id: service.id,
        booking_date: dateKey,
        start_time: time,
        client_name: name.trim(),
        client_email: email.trim(),
        client_phone: phone.trim(),
        notes: notes.trim(),
        language: lang,
      });
      navigate("/termin/bestaetigt", {
        state: {
          booking,
          serviceLabel: serviceName(service, lang),
          // Le barbier definitif est celui renvoye par le serveur : en mode
          // "egal wer" il est affecte a la creation.
          barberLabel:
            barbers.find((b) => b.id === booking.barber_id)?.name ??
            barber?.name ??
            t.team.anyBarber,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(message === "SLOT_TAKEN" ? t.booking.errorSlotTaken : t.booking.errorGeneric);
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  const dateWindow = availableDates.slice(dateOffset, dateOffset + 7);

  return (
    <div className="min-h-screen bg-marble">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/92 backdrop-blur-xl">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-3 text-smoke transition-colors hover:text-bone">
            <ArrowLeft size={16} />
            <Wordmark compact />
          </Link>
          <span className="font-body text-[10px] uppercase tracking-brand text-brass">
            {t.booking.stepLabel} {step + 1} {t.booking.of} 5
          </span>
        </div>
        <div className="h-px w-full bg-white/[0.07]">
          <div
            className="h-px bg-brass-sheen transition-all duration-500"
            style={{ width: `${((step + 1) / 5) * 100}%` }}
          />
        </div>
      </header>

      <main className="container grid gap-12 py-12 lg:grid-cols-[1.5fr_0.85fr] lg:gap-20 lg:py-20">
        <div>
          {/* Fil des etapes */}
          <ol className="mb-10 hidden flex-wrap items-center gap-x-3 gap-y-2 md:flex">
            {STEPS.map((s) => (
              <li key={s} className="flex items-center gap-3">
                <button
                  disabled={s > step}
                  onClick={() => s < step && setStep(s)}
                  className={cn(
                    "font-body text-[10px] uppercase tracking-widest transition-colors",
                    s === step ? "text-brass" : s < step ? "text-bone hover:text-brass" : "text-smoke/40",
                  )}
                >
                  {t.booking.steps[s]}
                </button>
                {s < 4 ? <span className="h-px w-6 bg-white/10" /> : null}
              </li>
            ))}
          </ol>

          {loading ? (
            <p className="flex items-center gap-3 text-smoke">
              <Loader2 size={16} className="animate-spin" /> {t.common.loading}
            </p>
          ) : null}

          {/* Etape 0 : leistung */}
          {step === 0 && !loading ? (
            <section>
              <StepHead title={t.booking.chooseService} sub={t.booking.chooseServiceSub} />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {services.map((s) => {
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setServiceId(s.id);
                        setTime("");
                        setStep(1);
                      }}
                      className={cn(
                        "group flex items-start justify-between gap-4 border p-5 text-left transition-all duration-300",
                        active
                          ? "border-brass bg-brass/[0.07]"
                          : "border-white/10 bg-ink-soft hover:border-brass/50",
                      )}
                    >
                      <span>
                        <span className="block font-display text-lg text-bone">
                          {serviceName(s, lang)}
                        </span>
                        <span className="mt-1 block font-body text-[10px] uppercase tracking-widest text-smoke">
                          {s.duration_min} {t.common.min}
                        </span>
                      </span>
                      <span className="shrink-0 font-display text-lg text-brass">
                        {formatPrice(s.price)}
                        <span className="ml-1 text-[10px]">EUR</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Etape 1 : barbier */}
          {step === 1 && !loading ? (
            <section>
              <StepHead title={t.booking.chooseBarber} sub={t.booking.chooseBarberSub} />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setBarberId(null);
                    setBarberTouched(true);
                    setTime("");
                    setStep(2);
                  }}
                  className={cn(
                    "flex items-center gap-4 border p-5 text-left transition-all duration-300",
                    barberTouched && barberId === null
                      ? "border-brass bg-brass/[0.07]"
                      : "border-white/10 bg-ink-soft hover:border-brass/50",
                  )}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center border border-brass/30 font-display text-lg text-brass">
                    ?
                  </span>
                  <span>
                    <span className="block font-display text-lg text-bone">{t.team.anyBarber}</span>
                    <span className="mt-0.5 block font-body text-[10px] uppercase tracking-widest text-smoke">
                      {t.team.anyBarberDesc}
                    </span>
                  </span>
                </button>

                {barbers.map((b) => {
                  const active = barberId === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBarberId(b.id);
                        setBarberTouched(true);
                        setTime("");
                        setStep(2);
                      }}
                      className={cn(
                        "flex items-center gap-4 border p-5 text-left transition-all duration-300",
                        active
                          ? "border-brass bg-brass/[0.07]"
                          : "border-white/10 bg-ink-soft hover:border-brass/50",
                      )}
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center border border-brass/30 font-display text-lg text-brass">
                        {b.initials}
                      </span>
                      <span>
                        <span className="block font-display text-lg text-bone">{b.name}</span>
                        <span className="mt-0.5 block font-body text-[10px] uppercase tracking-widest text-smoke">
                          {barberRole(b, lang)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Etape 2 : date */}
          {step === 2 && !loading ? (
            <section>
              <StepHead title={t.booking.chooseDate} sub={t.booking.chooseDateSub} />
              <div className="mt-8 flex items-center gap-3">
                <button
                  disabled={dateOffset === 0}
                  onClick={() => setDateOffset((o) => Math.max(0, o - 7))}
                  className="grid h-11 w-11 shrink-0 place-items-center border border-white/10 text-smoke transition-colors hover:border-brass hover:text-brass disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="grid flex-1 grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {dateWindow.map((d) => {
                    const key = toDateKey(d);
                    const active = key === dateKey;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setDateKey(key);
                          setTime("");
                          setStep(3);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1 border py-4 transition-all duration-300",
                          active
                            ? "border-brass bg-brass/[0.07]"
                            : "border-white/10 bg-ink-soft hover:border-brass/50",
                        )}
                      >
                        <span className="font-body text-[10px] uppercase tracking-widest text-smoke">
                          {t.hours.daysShort[d.getDay()]}
                        </span>
                        <span
                          className={cn("font-display text-2xl", active ? "text-brass" : "text-bone")}
                        >
                          {d.getDate()}
                        </span>
                        <span className="font-body text-[9px] uppercase tracking-widest text-smoke/70">
                          {d.toLocaleDateString(lang, { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={dateOffset + 7 >= availableDates.length}
                  onClick={() => setDateOffset((o) => o + 7)}
                  className="grid h-11 w-11 shrink-0 place-items-center border border-white/10 text-smoke transition-colors hover:border-brass hover:text-brass disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </section>
          ) : null}

          {/* Etape 3 : heure */}
          {step === 3 && !loading ? (
            <section>
              <StepHead title={t.booking.chooseTime} sub={t.booking.chooseTimeSub} />
              {slotsLoading ? (
                <p className="mt-8 flex items-center gap-3 text-smoke">
                  <Loader2 size={16} className="animate-spin" /> {t.common.loading}
                </p>
              ) : !hasFreeSlot ? (
                <div className="mt-8 border border-white/10 bg-ink-soft p-8 text-center">
                  <p className="font-display text-xl text-bone">{t.booking.noSlots}</p>
                  <p className="mt-2 text-sm text-smoke">{t.booking.pickAnother}</p>
                  <button onClick={() => setStep(2)} className="btn-ghost mt-6">
                    {t.booking.steps[2]}
                  </button>
                </div>
              ) : (
                <div className="mt-8 space-y-8">
                  {grouped.map((group) => (
                    <div key={group.label}>
                      <h3 className="flex items-center gap-4 font-body text-[10px] uppercase tracking-brand text-brass">
                        {group.label}
                        <span className="h-px flex-1 bg-white/[0.08]" />
                      </h3>
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                        {group.items.map((s) => (
                          <button
                            key={s.time}
                            disabled={!s.available}
                            onClick={() => {
                              setTime(s.time);
                              setStep(4);
                            }}
                            className={cn(
                              "border py-3 font-body text-[13px] tracking-wide transition-all duration-200",
                              time === s.time
                                ? "border-brass bg-brass text-ink"
                                : s.available
                                  ? "border-white/10 bg-ink-soft text-bone hover:border-brass/60 hover:text-brass"
                                  : "cursor-not-allowed border-white/[0.04] bg-transparent text-smoke/25 line-through",
                            )}
                          >
                            {s.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {/* Etape 4 : coordonnees */}
          {step === 4 && !loading ? (
            <section>
              <StepHead title={t.booking.yourDetails} sub={t.booking.yourDetailsSub} />
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="eyebrow">{t.booking.name}</span>
                  <input
                    className="field mt-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
                <label>
                  <span className="eyebrow">{t.booking.email}</span>
                  <input
                    className="field mt-2"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label>
                  <span className="eyebrow">{t.booking.phone}</span>
                  <input
                    className="field mt-2"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="eyebrow">{t.booking.notes}</span>
                  <textarea
                    className="field mt-2 min-h-[96px] resize-y"
                    value={notes}
                    placeholder={t.booking.notesPlaceholder}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              </div>

              {error ? (
                <p className="mt-5 border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-bone">
                  {error}
                </p>
              ) : null}

              <button onClick={submit} disabled={saving} className="btn-brass mt-8 w-full sm:w-auto">
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> {t.booking.submitting}
                  </>
                ) : (
                  <>
                    <Check size={14} /> {t.booking.submit}
                  </>
                )}
              </button>
              <p className="mt-4 max-w-md text-[12px] font-light leading-relaxed text-smoke">
                {t.booking.policy}
              </p>
            </section>
          ) : null}

          {step > 0 ? (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="mt-12 flex items-center gap-2 font-body text-[11px] uppercase tracking-widest text-smoke transition-colors hover:text-brass"
            >
              <ChevronLeft size={14} /> {t.common.back}
            </button>
          ) : null}
        </div>

        {/* Recapitulatif */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="border border-white/10 bg-ink-soft p-6">
            <p className="eyebrow">{t.booking.summary}</p>
            <dl className="mt-6 space-y-4">
              <Row label={t.booking.service} value={service ? serviceName(service, lang) : "-"} />
              <Row
                label={t.booking.barber}
                value={barberTouched ? (barber ? barber.name : t.team.anyBarber) : "-"}
              />
              <Row
                label={t.booking.date}
                value={
                  dateKey
                    ? new Date(dateKey).toLocaleDateString(lang, {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                      })
                    : "-"
                }
              />
              <Row label={t.booking.time} value={time || "-"} />
              <Row
                label={t.booking.duration}
                value={service ? `${service.duration_min} ${t.common.min}` : "-"}
              />
            </dl>
            <div className="mt-6 flex items-baseline justify-between border-t border-white/10 pt-5">
              <span className="eyebrow">{t.booking.total}</span>
              <span className="font-display text-3xl text-bone">
                {service ? formatPrice(service.price) : "0"}
                <span className="ml-1 text-sm text-brass">EUR</span>
              </span>
            </div>
          </div>

          {canContinue && step < 4 ? (
            <button onClick={() => setStep((s) => Math.min(4, s + 1))} className="btn-brass mt-4 w-full">
              {t.common.next}
            </button>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

function StepHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="font-display text-[clamp(1.9rem,4.5vw,2.9rem)] leading-tight text-bone">
        {title}
      </h1>
      <p className="mt-3 max-w-lg text-sm font-light text-smoke">{sub}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-body text-[10px] uppercase tracking-widest text-smoke">{label}</dt>
      <dd className="text-right font-body text-sm text-bone">{value}</dd>
    </div>
  );
}
