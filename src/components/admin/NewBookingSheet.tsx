import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type {
  Barber, BarberAbsence, BarberHour, BlockedSlot, BookingStatus, BusySlot, OpeningHour, Service,
  Settings,
} from "@/data/types";
import { db } from "@/lib/db";
import { buildSlots } from "@/lib/slots";
import { cn, formatPrice, fromDateKey, toDateKey } from "@/lib/utils";
import { serviceName } from "@/components/sections/Services";
import { Field } from "./shared";

interface Props {
  services: Service[];
  barbers: Barber[];
  openingHours: OpeningHour[];
  barberHours: BarberHour[];
  settings: Settings;
  initialDate?: string;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Saisie d'un rendez-vous par le salon : appel telephonique ou client qui
 * passe la porte. Meme moteur de creneaux que le formulaire public, sans le
 * delai minimum : on peut placer quelqu'un dans dix minutes.
 */
export function NewBookingSheet({
  services,
  barbers,
  openingHours,
  barberHours,
  settings,
  initialDate,
  onClose,
  onCreated,
}: Props) {
  const { t, lang } = useLanguage();
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [date, setDate] = useState(initialDate ?? toDateKey(new Date()));
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<BookingStatus>("confirmed");

  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [absences, setAbsences] = useState<BarberAbsence[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = serviceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));
  const duration = selected.reduce((sum, s) => sum + s.duration_min, 0);
  const price = selected.reduce((sum, s) => sum + s.price, 0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([db.listBusy(date, date), db.listBlocked(date, date), db.listAbsences(date, date)])
      .then(([b, blk, abs]) => {
        if (cancelled) return;
        setBusy(b);
        setBlocked(blk);
        setAbsences(abs);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [date]);

  const slots = useMemo(() => {
    if (duration === 0 || !barberId) return [];
    return buildSlots({
      date: fromDateKey(date),
      durationMin: duration,
      barberId,
      barbers,
      openingHours,
      barberHours,
      absences,
      busy,
      blocked,
      // Le salon peut placer un client tout de suite : pas de delai minimum.
      settings: { ...settings, min_lead_time_min: 0 },
    });
  }, [duration, barberId, date, barbers, openingHours, barberHours, absences, busy, blocked, settings]);

  useEffect(() => {
    if (time && !slots.some((s) => s.time === time && s.available)) setTime("");
  }, [slots, time]);

  const toggle = (id: string) =>
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const canSave = selected.length > 0 && barberId && date && time && name.trim().length >= 2;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await db.createAdminBooking({
        barber_id: barberId,
        service_ids: selected.map((s) => s.id),
        booking_date: date,
        start_time: time,
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_email: email.trim(),
        notes: notes.trim(),
        status,
      });
      onCreated();
      onClose();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(code === "SLOT_TAKEN" ? t.admin.slotTaken : t.booking.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/40 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-carbon/10 bg-white p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-[24px] font-semibold text-carbon">{t.admin.newBooking}</h3>
            <p className="mt-1 font-body text-[12px] text-stone">{t.admin.newBookingSub}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-carbon/12 text-stone transition-colors hover:text-carbon"
            aria-label={t.common.close}
          >
            <X size={15} />
          </button>
        </div>

        {/* Client */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Field label={t.admin.walkInName}>
            <input className="field !py-2.5" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label={`${t.admin.walkInPhone} (${t.common.optional})`}>
            <input className="field !py-2.5" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label={`${t.admin.walkInEmail} (${t.common.optional})`}>
            <input className="field !py-2.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>

        {/* Prestations */}
        <p className="eyebrow mt-6">{t.booking.service}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {services.map((s) => {
            const active = serviceIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3.5 py-2 font-body text-[12px] font-medium transition-colors",
                  active ? "border-carbon bg-carbon text-paper" : "border-carbon/15 bg-white text-carbon hover:border-carbon/40",
                )}
              >
                {active ? <Check size={12} /> : <Plus size={12} />}
                {serviceName(s, lang)}
                <span className={cn("text-[11px]", active ? "text-paper/70" : "text-stone")}>
                  {formatPrice(s.price)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Barbier, date */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Field label={t.booking.barber}>
            <select className="field !py-2.5" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.booking.date}>
            <input type="date" className="field !py-2.5" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t.admin.status}>
            <select
              className="field !py-2.5"
              value={status}
              onChange={(e) => setStatus(e.target.value as BookingStatus)}
            >
              {(["confirmed", "pending", "done"] as BookingStatus[]).map((s) => (
                <option key={s} value={s}>
                  {t.admin.statuses[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Heure */}
        <p className="eyebrow mt-6">
          {t.booking.time}
          {duration ? <span className="ml-2 normal-case tracking-normal text-stone">· {duration} {t.common.min}</span> : null}
        </p>
        {selected.length === 0 ? (
          <p className="mt-2 font-body text-[13px] text-stone">{t.booking.noServiceYet}</p>
        ) : slots.filter((s) => s.available).length === 0 ? (
          <p className="mt-2 font-body text-[13px] text-stone">{t.booking.noSlots}</p>
        ) : (
          <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8">
            {slots.map((s) => (
              <button
                key={s.time}
                disabled={!s.available}
                onClick={() => setTime(s.time)}
                className={cn(
                  "rounded-full border py-2 font-body text-[12px] font-medium tabular-nums transition-colors",
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
        )}

        <Field label={t.booking.notes} className="mt-5">
          <input className="field !py-2.5" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error ? (
          <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/[0.07] px-4 py-2.5 font-body text-[13px] text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-carbon/10 pt-5">
          <span className="font-display text-[22px] font-semibold text-carbon">
            {formatPrice(price)} <span className="font-body text-[12px] font-medium text-stone">EUR</span>
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost !px-5 !py-2.5">
              {t.common.cancel}
            </button>
            <button onClick={save} disabled={!canSave || saving} className="btn-solid !px-5 !py-2.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {t.admin.create}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
