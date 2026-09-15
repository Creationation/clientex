import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Plus, RotateCcw, Tag, X,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSalonData } from "@/hooks/useSalonData";
import { useNextAvailability } from "@/hooks/useNextAvailability";
import { db } from "@/lib/db";
import { buildSlots, isShopOpen, type NextSlot } from "@/lib/slots";
import { addDays, cn, formatPrice, fromDateKey, toDateKey, toMinutes } from "@/lib/utils";
import type { BarberAbsence, BlockedSlot, BusySlot, PromoQuote, Service } from "@/data/types";
import { Wordmark } from "@/components/Header";
import { serviceName } from "@/components/sections/Services";
import { barberRole } from "@/components/sections/Team";

const STEPS = [0, 1, 2, 3, 4] as const;

/**
 * Brouillon de reservation. Un client qui quitte la page (appel, autre
 * onglet, telephone verrouille) retrouve sa selection en revenant. Meme idee
 * que sur sitdown, sans notification native.
 */
const DRAFT_KEY = "delherren_booking_draft";
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Draft {
  savedAt: number;
  step: number;
  serviceIds: string[];
  barberId: string | null;
  barberTouched: boolean;
  dateKey: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  promoInput: string;
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export default function Booking() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { services, barbers, openingHours, barberHours, settings, loading } = useSalonData();

  const presetService = params.get("service");
  const presetBarber = params.get("barber");

  // Le brouillon est lu une seule fois. Un lien direct (?service=, ?barber=)
  // a la priorite sur la selection memorisee, mais on garde les coordonnees.
  const initialDraft = useRef<Draft | null>(readDraft());
  const draft = initialDraft.current;
  const draftUsed = Boolean(draft) && !presetService && !presetBarber;

  const [step, setStep] = useState(draftUsed ? Math.min(draft!.step, 3) : 0);
  const [serviceIds, setServiceIds] = useState<string[]>(() => {
    if (presetService) return [presetService];
    return draftUsed ? draft!.serviceIds : [];
  });
  const [barberId, setBarberId] = useState<string | null>(
    presetBarber ?? (draftUsed ? draft!.barberId : null),
  );
  const [barberTouched, setBarberTouched] = useState(
    Boolean(presetBarber) || (draftUsed ? draft!.barberTouched : false),
  );
  const [dateKey, setDateKey] = useState<string>(draftUsed ? draft!.dateKey : "");
  const [time, setTime] = useState<string>(draftUsed ? draft!.time : "");
  const [restored, setRestored] = useState(draftUsed && draft!.serviceIds.length > 0);

  const [name, setName] = useState(draft?.name ?? "");
  const [email, setEmail] = useState(draft?.email ?? "");
  const [phone, setPhone] = useState(draft?.phone ?? "");
  const [notes, setNotes] = useState(draft?.notes ?? "");

  const [promoInput, setPromoInput] = useState(draft?.promoInput ?? "");
  const [promo, setPromo] = useState<PromoQuote | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);

  const [dayBusy, setDayBusy] = useState<BusySlot[]>([]);
  const [dayBlocked, setDayBlocked] = useState<BlockedSlot[]>([]);
  const [dayAbsences, setDayAbsences] = useState<BarberAbsence[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateOffset, setDateOffset] = useState(0);

  const selected: Service[] = serviceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));

  const totalDuration = selected.reduce((sum, s) => sum + s.duration_min, 0);
  const subtotal = selected.reduce((sum, s) => sum + s.price, 0);
  const discount = promo ? Math.min(promo.discount, subtotal) : 0;
  const total = subtotal - discount;
  const barber = barbers.find((b) => b.id === barberId);

  const toggleService = (id: string) => {
    setTime("");
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  /* Sauvegarde du brouillon a chaque changement */
  useEffect(() => {
    if (loading) return;
    const payload: Draft = {
      savedAt: Date.now(),
      step,
      serviceIds,
      barberId,
      barberTouched,
      dateKey,
      time,
      name,
      email,
      phone,
      notes,
      promoInput,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [loading, step, serviceIds, barberId, barberTouched, dateKey, time, name, email, phone, notes, promoInput]);

  const startOver = () => {
    clearDraft();
    initialDraft.current = null;
    setRestored(false);
    setStep(0);
    setServiceIds([]);
    setBarberId(null);
    setBarberTouched(false);
    setDateKey("");
    setTime("");
    setPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

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
    if (availableDates.length === 0) return;
    const valid = dateKey && availableDates.some((d) => toDateKey(d) === dateKey);
    if (!valid) setDateKey(toDateKey(availableDates[0]));
  }, [availableDates, dateKey]);

  /* Chargement des creneaux occupes du jour selectionne */
  useEffect(() => {
    if (!dateKey) return;
    let cancelled = false;
    setSlotsLoading(true);
    Promise.all([
      db.listBusy(dateKey, dateKey),
      db.listBlocked(dateKey, dateKey),
      db.listAbsences(dateKey, dateKey),
    ])
      .then(([b, blk, abs]) => {
        if (cancelled) return;
        setDayBusy(b);
        setDayBlocked(blk);
        setDayAbsences(abs);
      })
      .catch(() => {
        if (!cancelled) {
          setDayBusy([]);
          setDayBlocked([]);
          setDayAbsences([]);
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
    if (totalDuration === 0 || !dateKey) return [];
    const date = availableDates.find((d) => toDateKey(d) === dateKey);
    if (!date) return [];
    return buildSlots({
      date,
      durationMin: totalDuration,
      barberId,
      barbers,
      openingHours,
      barberHours,
      absences: dayAbsences,
      busy: dayBusy,
      blocked: dayBlocked,
      settings,
    });
  }, [totalDuration, dateKey, barberId, barbers, openingHours, barberHours, dayAbsences, dayBusy, dayBlocked, settings, availableDates]);

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

  /* Prochain creneau libre par barbier, pour la duree choisie */
  const nextFree = useNextAvailability(
    barbers,
    openingHours,
    barberHours,
    settings,
    totalDuration || 30,
  );

  const formatNext = useCallback(
    (n: NextSlot | null | undefined): string => {
      if (n === undefined) return "";
      if (n === null) return t.team.noneSoon;
      const today = toDateKey(new Date());
      const tomorrow = toDateKey(addDays(new Date(), 1));
      const day =
        n.date === today
          ? t.team.today
          : n.date === tomorrow
            ? t.team.tomorrow
            : fromDateKey(n.date).toLocaleDateString(lang, { weekday: "short", day: "2-digit", month: "2-digit" });
      return `${day} · ${n.time}`;
    },
    [lang, t],
  );

  /* Code promo */
  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || subtotal === 0) return;
    setPromoBusy(true);
    setPromoError(null);
    try {
      const quote = await db.quotePromo(code, subtotal);
      setPromo(quote);
      setPromoInput(quote.code);
    } catch (e) {
      const key = e instanceof Error ? e.message : "NOT_FOUND";
      setPromo(null);
      setPromoError(
        t.booking.promoErrors[key as keyof typeof t.booking.promoErrors] ?? t.booking.promoErrors.NOT_FOUND,
      );
    } finally {
      setPromoBusy(false);
    }
  };

  const removePromo = () => {
    setPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  // Si le panier change, la remise est recalculee (un code a montant minimum
  // peut ne plus s'appliquer).
  useEffect(() => {
    if (!promo) return;
    if (subtotal === 0) {
      setPromo(null);
      return;
    }
    let cancelled = false;
    db.quotePromo(promo.code, subtotal)
      .then((q) => {
        if (!cancelled) setPromo(q);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const key = e instanceof Error ? e.message : "NOT_FOUND";
        setPromo(null);
        setPromoError(
          t.booking.promoErrors[key as keyof typeof t.booking.promoErrors] ?? t.booking.promoErrors.NOT_FOUND,
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const canContinue = (() => {
    if (step === 0) return selected.length > 0;
    if (step === 1) return barberTouched;
    if (step === 2) return Boolean(dateKey);
    if (step === 3) return Boolean(time);
    return false;
  })();

  const emailOk = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(value.trim());
  const validDetails = name.trim().length >= 2 && emailOk(email) && phone.trim().length >= 6;

  const submit = async () => {
    if (selected.length === 0 || !dateKey || !time) return;
    setError(null);
    if (!validDetails) {
      if (name.trim().length < 2) setError(t.booking.invalidName);
      else if (!emailOk(email)) setError(t.booking.invalidEmail);
      else setError(t.booking.invalidPhone);
      return;
    }
    setSaving(true);
    try {
      const booking = await db.createBooking({
        barber_id: barberId,
        service_ids: selected.map((s) => s.id),
        booking_date: dateKey,
        start_time: time,
        client_name: name.trim(),
        client_email: email.trim(),
        client_phone: phone.trim(),
        notes: notes.trim(),
        language: lang,
        promo_code: promo?.code,
      });
      clearDraft();
      navigate("/termin/bestaetigt", {
        state: {
          booking,
          serviceLabel: selected.map((s) => serviceName(s, lang)).join(" + "),
          barberLabel:
            barbers.find((b) => b.id === booking.barber_id)?.name ??
            barber?.name ??
            t.team.anyBarber,
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message === "SLOT_TAKEN") {
        setError(t.booking.errorSlotTaken);
        setStep(3);
      } else if (message === "OUTSIDE_HOURS") {
        setError(t.booking.errorOutsideHours);
        setStep(3);
      } else if (message.startsWith("PROMO_")) {
        const key = message.replace("PROMO_", "") as keyof typeof t.booking.promoErrors;
        setPromo(null);
        setPromoError(t.booking.promoErrors[key] ?? t.booking.promoErrors.NOT_FOUND);
        setError(t.booking.promoErrors[key] ?? t.booking.promoErrors.NOT_FOUND);
      } else {
        setError(t.booking.errorGeneric);
      }
    } finally {
      setSaving(false);
    }
  };

  const dateWindow = availableDates.slice(dateOffset, dateOffset + 7);
  const policy = t.booking.policy.replace("{hours}", String(settings.cancel_deadline_hours));

  return (
    <div className="min-h-screen bg-paper-soft pb-28 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-carbon/10 bg-paper/92 backdrop-blur-xl">
        <div className="container flex items-center justify-between py-4">
          <Link
            to="/"
            className="flex items-center gap-3 text-stone transition-colors hover:text-carbon"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-carbon/12">
              <ArrowLeft size={15} />
            </span>
            <Wordmark compact />
          </Link>
          <span className="font-body text-[11px] font-semibold uppercase tracking-widest text-stone">
            {t.booking.stepLabel} {step + 1} {t.booking.of} 5
          </span>
        </div>
        <div className="h-[3px] w-full bg-carbon/[0.07]">
          <div
            className="h-[3px] rounded-r-full bg-carbon transition-all duration-500"
            style={{ width: `${((step + 1) / 5) * 100}%` }}
          />
        </div>
      </header>

      <main className="container grid gap-10 py-10 lg:grid-cols-[1.5fr_0.8fr] lg:gap-16 lg:py-16">
        <div>
          {/* Fil des etapes */}
          <ol className="mb-8 hidden flex-wrap items-center gap-x-2 gap-y-2 md:flex">
            {STEPS.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <button
                  disabled={s > step}
                  onClick={() => s < step && setStep(s)}
                  className={cn(
                    "rounded-full px-3 py-1.5 font-body text-[11px] font-semibold uppercase tracking-widest transition-colors",
                    s === step
                      ? "bg-carbon text-paper"
                      : s < step
                        ? "text-carbon hover:bg-carbon/[0.06]"
                        : "text-stone/45",
                  )}
                >
                  {t.booking.steps[s]}
                </button>
                {s < 4 ? <span className="h-px w-4 bg-carbon/15" /> : null}
              </li>
            ))}
          </ol>

          {restored ? (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brass/30 bg-brass/[0.07] px-4 py-3">
              <p className="font-body text-[13px] text-carbon">{t.booking.draftRestored}</p>
              <button
                onClick={startOver}
                className="flex items-center gap-2 font-body text-[11px] font-semibold uppercase tracking-widest text-brass transition-colors hover:text-carbon"
              >
                <RotateCcw size={12} /> {t.booking.draftDiscard}
              </button>
            </div>
          ) : null}

          {loading ? (
            <p className="flex items-center gap-3 text-stone">
              <Loader2 size={16} className="animate-spin" /> {t.common.loading}
            </p>
          ) : null}

          {/* Etape 0 : une ou plusieurs prestations */}
          {step === 0 && !loading ? (
            <section>
              <StepHead title={t.booking.chooseService} sub={t.booking.chooseServiceSub} />
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {services.map((s) => {
                  const active = serviceIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleService(s.id)}
                      aria-pressed={active}
                      className={cn(
                        "group flex items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-all duration-200",
                        active
                          ? "border-carbon shadow-soft"
                          : "border-carbon/12 hover:border-carbon/30",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors",
                          active
                            ? "border-carbon bg-carbon text-paper"
                            : "border-carbon/20 text-carbon/40",
                        )}
                      >
                        {active ? <Check size={15} /> : <Plus size={15} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[18px] font-medium text-carbon">
                          {serviceName(s, lang)}
                        </span>
                        <span className="mt-0.5 block font-body text-[12px] text-stone">
                          {s.duration_min} {t.common.min} · {t.services.groups[s.category]}
                        </span>
                      </span>
                      <span className="shrink-0 font-display text-[18px] font-semibold text-carbon">
                        {formatPrice(s.price)}
                        <span className="ml-1 font-body text-[11px] font-medium text-stone">EUR</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Etape 1 : barbier, avec le prochain creneau libre de chacun */}
          {step === 1 && !loading ? (
            <section>
              <StepHead title={t.booking.chooseBarber} sub={t.booking.chooseBarberSub} />
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  active={barberTouched && barberId === null}
                  onClick={() => {
                    setBarberId(null);
                    setBarberTouched(true);
                    setTime("");
                    setStep(2);
                  }}
                  badge="?"
                  title={t.team.anyBarber}
                  sub={t.team.anyBarberDesc}
                  meta={formatNext(nextFree.any)}
                  metaLabel={t.booking.nextFree}
                />
                {barbers.map((b) => (
                  <ChoiceCard
                    key={b.id}
                    active={barberId === b.id}
                    onClick={() => {
                      setBarberId(b.id);
                      setBarberTouched(true);
                      setTime("");
                      setStep(2);
                    }}
                    badge={b.initials}
                    image={b.image_url}
                    title={b.name}
                    sub={barberRole(b, lang)}
                    meta={formatNext(nextFree[b.id])}
                    metaLabel={t.booking.nextFree}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* Etape 2 : date */}
          {step === 2 && !loading ? (
            <section>
              <StepHead title={t.booking.chooseDate} sub={t.booking.chooseDateSub} />
              <div className="mt-7 flex items-center gap-2">
                <button
                  disabled={dateOffset === 0}
                  onClick={() => setDateOffset((o) => Math.max(0, o - 7))}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-carbon/15 text-carbon transition-colors hover:bg-carbon/[0.05] disabled:opacity-30"
                  aria-label={t.admin.prev}
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
                          "flex flex-col items-center gap-0.5 rounded-2xl border py-4 transition-all duration-200",
                          active
                            ? "border-carbon bg-carbon text-paper shadow-soft"
                            : "border-carbon/12 bg-white hover:border-carbon/30",
                        )}
                      >
                        <span
                          className={cn(
                            "font-body text-[11px] font-semibold uppercase tracking-widest",
                            active ? "text-paper/70" : "text-stone",
                          )}
                        >
                          {t.hours.daysShort[d.getDay()]}
                        </span>
                        <span className="font-display text-[22px] font-semibold">{d.getDate()}</span>
                        <span
                          className={cn(
                            "font-body text-[10px] uppercase tracking-widest",
                            active ? "text-paper/60" : "text-stone/70",
                          )}
                        >
                          {d.toLocaleDateString(lang, { month: "short" })}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={dateOffset + 7 >= availableDates.length}
                  onClick={() => setDateOffset((o) => o + 7)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-carbon/15 text-carbon transition-colors hover:bg-carbon/[0.05] disabled:opacity-30"
                  aria-label={t.admin.next}
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
                <p className="mt-7 flex items-center gap-3 text-stone">
                  <Loader2 size={16} className="animate-spin" /> {t.common.loading}
                </p>
              ) : !hasFreeSlot ? (
                <div className="mt-7 rounded-2xl border border-carbon/12 bg-white p-8 text-center">
                  <p className="font-display text-[20px] font-medium text-carbon">
                    {t.booking.noSlots}
                  </p>
                  <p className="mt-2 text-[14px] text-stone">{t.booking.pickAnother}</p>
                  <button onClick={() => setStep(2)} className="btn-ghost mt-6">
                    {t.booking.steps[2]}
                  </button>
                </div>
              ) : (
                <div className="mt-7 space-y-7">
                  {grouped.map((group) => (
                    <div key={group.label}>
                      <h3 className="flex items-center gap-4 font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
                        {group.label}
                        <span className="h-px flex-1 bg-carbon/10" />
                      </h3>
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                        {group.items.map((s) => (
                          <button
                            key={s.time}
                            disabled={!s.available}
                            onClick={() => {
                              setTime(s.time);
                              setError(null);
                              setStep(4);
                            }}
                            className={cn(
                              "rounded-full border py-2.5 font-body text-[14px] font-medium tabular-nums transition-all duration-150",
                              time === s.time
                                ? "border-carbon bg-carbon text-paper"
                                : s.available
                                  ? "border-carbon/12 bg-white text-carbon hover:border-carbon/40"
                                  : "cursor-not-allowed border-transparent bg-carbon/[0.04] text-stone/35",
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
              {error ? (
                <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/[0.07] px-4 py-3 text-[14px] text-destructive">
                  {error}
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Etape 4 : coordonnees */}
          {step === 4 && !loading ? (
            <section>
              <StepHead title={t.booking.yourDetails} sub={t.booking.yourDetailsSub} />
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
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

              {/* Code promo, dans le flux mobile : l'aside est sous le formulaire */}
              <div className="mt-6 lg:hidden">
                <PromoField
                  value={promoInput}
                  onChange={setPromoInput}
                  onApply={applyPromo}
                  onRemove={removePromo}
                  applied={promo}
                  busy={promoBusy}
                  error={promoError}
                />
              </div>

              {error ? (
                <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/[0.07] px-4 py-3 text-[14px] text-destructive">
                  {error}
                </p>
              ) : null}

              <button onClick={submit} disabled={saving} className="btn-solid mt-7 w-full sm:w-auto">
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> {t.booking.submitting}
                  </>
                ) : (
                  <>
                    <Check size={14} /> {t.booking.submit}
                    {total > 0 ? ` · ${formatPrice(total)} EUR` : ""}
                  </>
                )}
              </button>
              <p className="mt-4 max-w-md text-[13px] leading-relaxed text-stone">{policy}</p>
            </section>
          ) : null}

          {step > 0 ? (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="mt-10 inline-flex items-center gap-2 font-body text-[12px] font-semibold uppercase tracking-widest text-stone transition-colors hover:text-carbon"
            >
              <ChevronLeft size={14} /> {t.common.back}
            </button>
          ) : null}
        </div>

        {/* Recapitulatif */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-carbon/10 bg-white p-6 shadow-soft">
            <p className="eyebrow">{t.booking.summary}</p>

            <div className="mt-5 space-y-2">
              {selected.length === 0 ? (
                <p className="font-body text-[13px] text-stone">{t.booking.noServiceYet}</p>
              ) : (
                selected.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl bg-paper-soft px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-body text-[14px] font-medium text-carbon">
                        {serviceName(s, lang)}
                      </span>
                      <span className="font-body text-[11px] text-stone">
                        {s.duration_min} {t.common.min}
                      </span>
                    </span>
                    <span className="font-body text-[14px] font-semibold text-carbon">
                      {formatPrice(s.price)}
                    </span>
                    <button
                      onClick={() => toggleService(s.id)}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-stone transition-colors hover:bg-carbon/10 hover:text-carbon"
                      aria-label={t.common.delete}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <dl className="mt-5 space-y-3 border-t border-carbon/10 pt-5">
              <Row
                label={t.booking.barber}
                value={barberTouched ? (barber ? barber.name : t.team.anyBarber) : "-"}
              />
              <Row
                label={t.booking.date}
                value={
                  dateKey
                    ? fromDateKey(dateKey).toLocaleDateString(lang, {
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
                value={totalDuration ? `${totalDuration} ${t.common.min}` : "-"}
              />
            </dl>

            {step >= 3 ? (
              <div className="mt-5 hidden border-t border-carbon/10 pt-5 lg:block">
                <PromoField
                  value={promoInput}
                  onChange={setPromoInput}
                  onApply={applyPromo}
                  onRemove={removePromo}
                  applied={promo}
                  busy={promoBusy}
                  error={promoError}
                />
              </div>
            ) : null}

            <div className="mt-5 border-t border-carbon/10 pt-5">
              {promo && discount > 0 ? (
                <dl className="mb-3 space-y-2">
                  <Row label={t.booking.subtotal} value={`${formatPrice(subtotal)} EUR`} />
                  <Row
                    label={`${t.booking.discount} · ${promo.code}`}
                    value={`- ${formatPrice(discount)} EUR`}
                    accent
                  />
                </dl>
              ) : null}
              <div className="flex items-baseline justify-between">
                <span className="eyebrow">{t.booking.total}</span>
                <span className="font-display text-[30px] font-semibold text-carbon">
                  {formatPrice(total)}
                  <span className="ml-1 font-body text-[14px] font-medium text-stone">EUR</span>
                </span>
              </div>
            </div>

            {canContinue && step < 4 ? (
              <button
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="btn-solid mt-5 w-full"
              >
                {t.booking.continueBtn}
              </button>
            ) : null}
          </div>
        </aside>
      </main>

      {/* Barre de progression mobile */}
      {canContinue && step < 4 ? (
        <div className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
          <button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            className="btn-solid w-full shadow-lift"
          >
            {t.booking.continueBtn}
            {total > 0 ? ` · ${formatPrice(total)} EUR` : ""}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PromoField({
  value,
  onChange,
  onApply,
  onRemove,
  applied,
  busy,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  onRemove: () => void;
  applied: PromoQuote | null;
  busy: boolean;
  error: string | null;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <span className="eyebrow flex items-center gap-2">
        <Tag size={11} /> {t.booking.promoCode}
      </span>
      {applied ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-success/35 bg-success/[0.08] px-3 py-2.5">
          <span className="font-body text-[13px] font-semibold tracking-wider text-success">
            {applied.code}
            <span className="ml-2 font-normal text-carbon">
              - {formatPrice(applied.discount)} EUR
            </span>
          </span>
          <button
            onClick={onRemove}
            className="font-body text-[11px] font-semibold uppercase tracking-widest text-stone transition-colors hover:text-carbon"
          >
            {t.booking.promoRemove}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            className="field !py-2.5 uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal"
            value={value}
            placeholder={t.booking.promoPlaceholder}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onApply();
              }
            }}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            onClick={onApply}
            disabled={busy || !value.trim()}
            className="btn-ghost shrink-0 !px-4 !py-2.5"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : t.booking.promoApply}
          </button>
        </div>
      )}
      {error ? <p className="mt-2 font-body text-[12px] text-destructive">{error}</p> : null}
    </div>
  );
}

function StepHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-tight text-carbon">
        {title}
      </h1>
      <p className="mt-2 max-w-lg text-[15px] text-stone">{sub}</p>
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  badge,
  image,
  title,
  sub,
  meta,
  metaLabel,
}: {
  active: boolean;
  onClick: () => void;
  badge: string;
  image?: string | null;
  title: string;
  sub: string;
  meta?: string;
  metaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-all duration-200",
        active ? "border-carbon shadow-soft" : "border-carbon/12 hover:border-carbon/30",
      )}
    >
      {image ? (
        <img
          src={image}
          alt=""
          className={cn(
            "h-12 w-12 shrink-0 rounded-full object-cover ring-2 transition-all",
            active ? "ring-carbon" : "ring-carbon/10",
          )}
        />
      ) : (
        <span
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-full border font-display text-[18px] font-semibold",
            active ? "border-carbon bg-carbon text-paper" : "border-carbon/15 text-carbon",
          )}
        >
          {badge}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[18px] font-medium text-carbon">{title}</span>
        <span className="mt-0.5 block font-body text-[12px] text-stone">{sub}</span>
        {meta ? (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-paper-soft px-2.5 py-1 font-body text-[11px] font-medium text-carbon">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {metaLabel ? <span className="text-stone">{metaLabel}:</span> : null} {meta}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-body text-[12px] text-stone">{label}</dt>
      <dd
        className={cn(
          "text-right font-body text-[14px] font-medium",
          accent ? "text-success" : "text-carbon",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
