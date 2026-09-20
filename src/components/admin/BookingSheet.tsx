import { useEffect, useState } from "react";
import { Check, Loader2, Mail, Pencil, Phone, Plus, X, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Barber, Booking, Service } from "@/data/types";
import { db } from "@/lib/db";
import { cn, formatPrice, fromDateKey } from "@/lib/utils";
import { serviceName } from "@/components/sections/Services";
import { bookingServiceLabel, Field, StatusBadge } from "./shared";

interface Props {
  booking: Booking;
  services: Service[];
  barbers: Barber[];
  /** Ce que le salon sait deja de ce client : nombre de visites et note. */
  client?: { visits: number; note: string } | null;
  onClose: () => void;
  onChanged: (updated?: Booking) => void;
}

const isPlaceholderPhone = (v: string) => /^0+$/.test(v.replace(/\D+/g, ""));
const isPlaceholderEmail = (v: string) => !v || v.endsWith("@delherren.local");

/**
 * Fiche d'un rendez-vous cote salon : contact rapide, changement de statut,
 * edition complete (prestations, barbier, date, heure, coordonnees, note) et
 * annulation. A chaque modification, le client recoit un e-mail, sauf si le
 * salon decoche la case.
 */
export function BookingSheet({ booking, services, barbers, client, onClose, onChanged }: Props) {
  const { t, lang } = useLanguage();
  const [mode, setMode] = useState<"view" | "edit" | "cancel">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [serviceIds, setServiceIds] = useState<string[]>(booking.service_ids);
  const [barberId, setBarberId] = useState(booking.barber_id ?? barbers[0]?.id ?? "");
  const [date, setDate] = useState(booking.booking_date);
  const [time, setTime] = useState(booking.start_time);
  const [name, setName] = useState(booking.client_name);
  const [phone, setPhone] = useState(isPlaceholderPhone(booking.client_phone) ? "" : booking.client_phone);
  const [email, setEmail] = useState(isPlaceholderEmail(booking.client_email) ? "" : booking.client_email);
  const [notes, setNotes] = useState(booking.notes);
  const [notify, setNotify] = useState(true);

  useEffect(() => {
    setServiceIds(booking.service_ids);
    setBarberId(booking.barber_id ?? barbers[0]?.id ?? "");
    setDate(booking.booking_date);
    setTime(booking.start_time);
    setName(booking.client_name);
    setPhone(isPlaceholderPhone(booking.client_phone) ? "" : booking.client_phone);
    setEmail(isPlaceholderEmail(booking.client_email) ? "" : booking.client_email);
    setNotes(booking.notes);
    setMode("view");
    setError(null);
  }, [booking, barbers]);

  const shownPhone = isPlaceholderPhone(booking.client_phone) ? "" : booking.client_phone;
  const shownEmail = isPlaceholderEmail(booking.client_email) ? "" : booking.client_email;
  const canNotify = Boolean(mode === "edit" ? email.trim() : shownEmail);

  const barberName = barbers.find((b) => b.id === booking.barber_id)?.name ?? t.team.anyBarber;
  const closed = booking.status === "cancelled";

  const picked = serviceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));
  const duration = picked.reduce((sum, s) => sum + s.duration_min, 0);
  const price = picked.reduce((sum, s) => sum + s.price, 0);
  const toggle = (id: string) =>
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const canSave = picked.length > 0 && barberId && date && time && name.trim().length >= 2;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      await db.editBooking(
        booking.id,
        {
          service_ids: picked.map((s) => s.id),
          barber_id: barberId,
          booking_date: date,
          start_time: time,
          client_name: name.trim(),
          client_phone: phone.trim(),
          client_email: email.trim(),
          notes: notes.trim(),
        },
        notify && canNotify,
      );
      setNotice(t.admin.editSaved);
      setMode("view");
      onChanged();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(
        code === "SLOT_TAKEN"
          ? t.admin.slotTaken
          : code === "OUTSIDE_HOURS"
            ? t.admin.outsideHours
            : t.booking.errorGeneric,
      );
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await db.cancelBooking(booking.id, notify && canNotify);
      setNotice(t.admin.cancelled);
      setMode("view");
      onChanged({ ...booking, status: "cancelled" });
    } catch {
      setError(t.booking.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: Booking["status"]) => {
    if (status === "cancelled") {
      setMode("cancel");
      return;
    }
    await db.updateBooking(booking.id, { status });
    onChanged({ ...booking, status });
  };

  const notifyToggle = (
    <label className="flex items-center gap-2.5 font-body text-[13px] text-carbon">
      <input
        type="checkbox"
        className="h-4 w-4 accent-carbon"
        checked={notify && canNotify}
        disabled={!canNotify}
        onChange={(e) => setNotify(e.target.checked)}
      />
      {t.admin.notifyClient}
      {!canNotify ? <span className="text-stone">· {t.admin.notifyNoEmail}</span> : null}
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/40 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-carbon/10 bg-white p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t.admin.client}</p>
            <h3 className="mt-1.5 font-display text-[24px] font-semibold text-carbon">
              {booking.client_name}
            </h3>
            <p className="mt-1 font-body text-[11px] uppercase tracking-widest text-stone">
              {client
                ? client.visits === 0
                  ? t.admin.clients.newClient
                  : t.admin.clients.visitNo.replace("{n}", String(client.visits + 1))
                : null}
              {client ? " · " : ""}
              {t.admin.sources[booking.source]} · {t.admin.bookedAt}{" "}
              {new Date(booking.created_at).toLocaleDateString(lang, {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
            {client?.note ? (
              <p className="mt-2 rounded-xl border border-brass/25 bg-brass/[0.07] px-3 py-2 font-body text-[13px] text-carbon">
                {client.note}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-carbon/12 text-stone transition-colors hover:text-carbon"
            aria-label={t.common.close}
          >
            <X size={15} />
          </button>
        </div>

        {mode !== "edit" ? (
          <>
            {/* Contact rapide */}
            {shownPhone || shownEmail ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {shownPhone ? (
                  <a href={`tel:${shownPhone.replace(/\s+/g, "")}`} className="btn-ghost !px-4 !py-2 !text-[11px]">
                    <Phone size={12} /> {shownPhone}
                  </a>
                ) : null}
                {shownEmail ? (
                  <a href={`mailto:${shownEmail}`} className="btn-ghost !px-4 !py-2 !text-[11px]">
                    <Mail size={12} /> {shownEmail}
                  </a>
                ) : null}
              </div>
            ) : null}

            <dl className="mt-5 space-y-3 border-t border-carbon/10 pt-5">
              <DetailRow
                label={t.booking.date}
                value={fromDateKey(booking.booking_date).toLocaleDateString(lang, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              />
              <DetailRow label={t.booking.time} value={`${booking.start_time} - ${booking.end_time}`} />
              <DetailRow label={t.booking.service} value={bookingServiceLabel(booking, services, lang)} />
              <DetailRow label={t.booking.barber} value={barberName} />
              <DetailRow label={t.booking.duration} value={`${booking.duration_min} ${t.common.min}`} />
              <DetailRow label={t.booking.total} value={`${formatPrice(booking.price)} EUR`} />
              {booking.notes ? <DetailRow label={t.booking.notes} value={booking.notes} /> : null}
            </dl>
          </>
        ) : null}

        {notice ? (
          <p className="mt-5 rounded-xl border border-success/35 bg-success/[0.08] px-4 py-2.5 font-body text-[13px] text-success">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/[0.07] px-4 py-2.5 font-body text-[13px] text-destructive">
            {error}
          </p>
        ) : null}

        {/* Edition complete */}
        {mode === "edit" ? (
          <div className="mt-5 rounded-2xl border border-carbon/10 bg-paper-soft p-4">
            <p className="font-display text-[18px] font-medium text-carbon">{t.admin.editTitle}</p>
            <p className="mt-1 font-body text-[12px] text-stone">{t.admin.editSub}</p>

            <p className="eyebrow mt-4">{t.booking.service}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((s) => {
                const active = serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 font-body text-[12px] font-medium transition-colors",
                      active ? "border-carbon bg-carbon text-paper" : "border-carbon/15 bg-white text-carbon hover:border-carbon/40",
                    )}
                  >
                    {active ? <Check size={12} /> : <Plus size={12} />}
                    {serviceName(s, lang)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 font-body text-[12px] text-stone">
              {duration} {t.common.min} · {formatPrice(price)} EUR
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
              <Field label={t.booking.time}>
                <input type="time" step={300} className="field !py-2.5" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
              <Field label={t.admin.walkInName}>
                <input className="field !py-2.5" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label={t.admin.walkInPhone}>
                <input type="tel" className="field !py-2.5" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label={t.admin.walkInEmail}>
                <input type="email" className="field !py-2.5" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label={t.booking.notes} className="sm:col-span-3">
                <input className="field !py-2.5" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              {notifyToggle}
              <div className="flex gap-2">
                <button onClick={() => setMode("view")} disabled={busy} className="btn-ghost !px-5 !py-2.5">
                  {t.common.cancel}
                </button>
                <button onClick={save} disabled={busy || !canSave} className="btn-solid !px-5 !py-2.5">
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {t.common.save}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Annulation */}
        {mode === "cancel" ? (
          <div className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/[0.05] p-4">
            <p className="font-display text-[18px] font-medium text-carbon">{t.admin.cancelConfirm}</p>
            <div className="mt-3">{notifyToggle}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={cancel}
                disabled={busy}
                className="btn-solid !bg-destructive !px-5 !py-2.5 hover:!bg-destructive/90"
              >
                {busy ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                {t.admin.cancelBooking}
              </button>
              <button onClick={() => setMode("view")} disabled={busy} className="btn-ghost !px-5 !py-2.5">
                {t.manage.cancelKeep}
              </button>
            </div>
          </div>
        ) : null}

        {/* Statut et actions */}
        {mode === "view" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-carbon/10 pt-5">
            <div className="flex items-center gap-3">
              <StatusBadge status={booking.status} label={t.admin.statuses[booking.status]} />
              <select
                value={booking.status}
                onChange={(e) => setStatus(e.target.value as Booking["status"])}
                className="rounded-full border border-carbon/15 bg-white px-4 py-2 font-body text-[12px] font-medium text-carbon outline-none focus:border-carbon/45"
              >
                {(Object.keys(t.admin.statuses) as Booking["status"][]).map((s) => (
                  <option key={s} value={s}>
                    {t.admin.statuses[s]}
                  </option>
                ))}
              </select>
            </div>
            {!closed ? (
              <div className="flex gap-2">
                <button onClick={() => setMode("edit")} className="btn-ghost !px-4 !py-2 !text-[11px]">
                  <Pencil size={12} /> {t.admin.edit}
                </button>
                <button
                  onClick={() => setMode("cancel")}
                  className="btn-ghost !px-4 !py-2 !text-[11px] hover:!border-destructive/50 hover:!text-destructive"
                >
                  <XCircle size={12} /> {t.admin.cancelBooking}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <dt className="shrink-0 font-body text-[12px] text-stone">{label}</dt>
      <dd className="text-right font-body text-[14px] font-medium text-carbon">{value}</dd>
    </div>
  );
}
