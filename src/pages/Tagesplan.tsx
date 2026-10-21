import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Ban, Download, Loader2, Plus, RefreshCw, Settings2, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useSalonData } from "@/hooks/useSalonData";
import { useTagesplanMode } from "@/hooks/useTagesplanMode";
import { db } from "@/lib/db";
import { buildClientProfiles, phoneKey } from "@/lib/clients";
import { cn, formatPrice, fromDateKey, toDateKey } from "@/lib/utils";
import type { BlockedSlot, Booking } from "@/data/types";
import { DayView } from "@/components/admin/CalendarViews";
import { BookingSheet } from "@/components/admin/BookingSheet";
import { NewBookingSheet } from "@/components/admin/NewBookingSheet";
import { barberColor, bookingServiceLabel, Field } from "@/components/admin/shared";
import { Wordmark } from "@/components/Header";

/**
 * Plan du jour plein ecran, pense pour la tablette posee au salon comme pour
 * le telephone du patron. Toute l'equipe sur un seul ecran, les chiffres du
 * jour en haut, et ce qu'on fait vingt fois par jour a portee de pouce :
 * creer un rendez-vous, bloquer un creneau, ouvrir une fiche pour la modifier.
 *
 * Le bouton en haut a droite sort du mode Tagesplan sans jamais deconnecter.
 */
export default function Tagesplan() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { ready, isAdmin } = useAdminAuth();
  const { setEnabled } = useTagesplanMode();
  const { services, barbers, openingHours, barberHours, settings } = useSalonData(true);

  const [day, setDay] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [clientNotes, setClientNotes] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blocASupprimer, setBlocASupprimer] = useState<BlockedSlot | null>(null);
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
  // En plus du temps reel, un passage par minute couvre les cas ou la
  // connexion Realtime a ete perdue sans que personne ne s'en apercoive.
  useEffect(() => {
    const id = window.setInterval(() => setVersion((v) => v + 1), 60_000);
    const unsubscribe = db.subscribeBookings(() => setVersion((v) => v + 1));
    return () => {
      window.clearInterval(id);
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    db.listClientNotes().then(setClientNotes).catch(() => undefined);
  }, [version]);

  // La fiche ouverte suit les donnees rechargees : si le rendez-vous vient
  // d'etre deplace, ce qui est affiche reste juste.
  useEffect(() => {
    if (!selected) return;
    const fresh = bookings.find((b) => b.id === selected.id);
    if (fresh && fresh !== selected) setSelected(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);

  const activeBarbers = useMemo(() => barbers.filter((b) => b.active), [barbers]);

  const selectedClient = useMemo(() => {
    if (!selected) return null;
    const k = phoneKey(selected.client_phone);
    if (!k || /^0+$/.test(k)) return null;
    const profile = buildClientProfiles(bookings, clientNotes, toDateKey(new Date())).find(
      (c) => c.key === k,
    );
    return profile ? { visits: profile.visits, note: profile.note } : { visits: 0, note: "" };
  }, [selected, bookings, clientNotes]);

  const counts = useMemo(() => {
    const live = bookings.filter((b) => b.status !== "cancelled");
    return {
      total: live.length,
      confirmed: live.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  const exportCsv = useCallback(() => {
    const champ = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lignes = [
      ["Von", "Bis", "Kunde", "Telefon", "Leistung", "Barbier", "Status", "Preis"].join(";"),
      ...bookings
        .slice()
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map((b) =>
          [
            b.start_time,
            b.end_time,
            b.client_name,
            b.client_phone,
            bookingServiceLabel(b, services, lang),
            barbers.find((x) => x.id === b.barber_id)?.name ?? "",
            t.admin.statuses[b.status],
            formatPrice(b.price),
          ]
            .map(champ)
            .join(";"),
        ),
    ].join("\r\n");

    // Le BOM fait ouvrir le fichier en UTF-8 par Excel, sinon les trémas sautent.
    const url = URL.createObjectURL(
      new Blob(["﻿" + lignes], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.admin.tagesplan.exportName}-${key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [bookings, services, barbers, lang, t, key]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-stone">
        {t.common.loading}
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/admin" replace />;

  const quitter = () => {
    // On sort du mode, jamais de la session.
    setEnabled(false);
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-carbon/10 bg-paper/95 backdrop-blur-xl">
        <div className="container flex items-center justify-between gap-3 py-3 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Wordmark compact />
            <span className="hidden font-body text-[10px] font-semibold uppercase tracking-brand text-brass sm:inline">
              {t.admin.tabs.today}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={refresh}
              className="grid h-10 w-10 place-items-center rounded-full border border-carbon/15 text-stone transition-colors hover:text-carbon"
              aria-label={t.common.loading}
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={quitter}
              className="flex items-center gap-2 rounded-full border border-carbon/15 px-3 py-2.5 font-body text-[10px] font-semibold uppercase tracking-widest text-stone transition-colors hover:text-carbon sm:px-4 sm:text-[11px]"
            >
              <Settings2 size={13} />
              <span className="hidden sm:inline">{t.admin.tagesplan.normalMode}</span>
              <span className="sm:hidden">{t.admin.title}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container space-y-5 py-5 sm:py-7">
        {/* Les chiffres du jour, lisibles de loin */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile label={t.admin.tagesplan.total} value={counts.total} />
          <StatTile label={t.admin.tagesplan.confirmed} value={counts.confirmed} tone="success" />
          <StatTile
            label={t.admin.tagesplan.cancelledCount}
            value={counts.cancelled}
            tone={counts.cancelled > 0 ? "danger" : undefined}
          />
        </div>

        {/* Les trois gestes de la journee */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <button onClick={() => setCreating(true)} className="btn-solid !px-4 !py-3 !text-[11px]">
            <Plus size={14} /> {t.admin.newBooking}
          </button>
          <button onClick={() => setBlocking(true)} className="btn-ghost !px-4 !py-3 !text-[11px]">
            <Ban size={14} /> {t.admin.tagesplan.blockTime}
          </button>
          <button
            onClick={exportCsv}
            className="btn-ghost col-span-2 !px-4 !py-3 !text-[11px] sm:col-span-1"
          >
            <Download size={14} /> {t.admin.tagesplan.export}
          </button>
        </div>

        {/* Qui est qui dans la grille */}
        {activeBarbers.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {activeBarbers.map((b, i) => (
              <span key={b.id} className="flex items-center gap-2 font-body text-[12px] text-stone">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: barberColor(i) }}
                />
                {b.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="rounded-3xl border border-carbon/10 bg-white p-3 shadow-soft sm:p-6">
          <DayView
            compact
            defaultLayout="grid"
            services={services}
            barbers={activeBarbers}
            openingHours={openingHours}
            barberHours={barberHours}
            bookings={bookings}
            blocked={blocked}
            onSelect={setSelected}
            onSelectBlock={setBlocASupprimer}
            date={day}
            setDate={setDay}
          />
        </div>
      </main>

      {/* Fiche complete : statut, modification, annulation, e-mail au client */}
      {selected ? (
        <BookingSheet
          booking={selected}
          services={services}
          barbers={activeBarbers}
          client={selectedClient}
          onClose={() => setSelected(null)}
          onChanged={(updated) => {
            if (updated) setSelected(updated);
            refresh();
          }}
        />
      ) : null}

      {creating ? (
        <NewBookingSheet
          services={services}
          barbers={activeBarbers}
          openingHours={openingHours}
          barberHours={barberHours}
          settings={settings}
          initialDate={key}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            refresh();
          }}
        />
      ) : null}

      {blocking ? (
        <BlockSheet
          date={key}
          barbers={activeBarbers}
          onClose={() => setBlocking(false)}
          onCreated={() => {
            setBlocking(false);
            refresh();
          }}
        />
      ) : null}

      {blocASupprimer ? (
        <UnblockSheet
          bloc={blocASupprimer}
          barbers={activeBarbers}
          onClose={() => setBlocASupprimer(null)}
          onDeleted={() => {
            setBlocASupprimer(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Retrait d'un creneau bloque. Sans cet ecran, un blocage pose par erreur
 * restait en place : rien ne permettait de revenir en arriere depuis le plan
 * du jour, la ou il se voit.
 */
function UnblockSheet({
  bloc,
  barbers,
  onClose,
  onDeleted,
}: {
  bloc: BlockedSlot;
  barbers: { id: string; name: string }[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t, lang } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qui = bloc.barber_id
    ? barbers.find((b) => b.id === bloc.barber_id)?.name ?? ""
    : t.admin.allBarbers;

  const supprimer = async () => {
    setBusy(true);
    setError(null);
    try {
      await db.deleteBlocked(bloc.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/40 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-carbon/10 bg-white p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="eyebrow">{t.admin.tagesplan.blockTime}</p>
        <h3 className="mt-1.5 font-display text-[22px] font-semibold text-carbon">
          {t.admin.tagesplan.unblock}
        </h3>

        <div className="mt-4 rounded-2xl border border-dashed border-carbon/25 bg-carbon/[0.03] px-4 py-3">
          <p className="font-body text-[14px] font-medium text-carbon">
            {bloc.all_day ? t.admin.allDay : `${bloc.start_time} - ${bloc.end_time}`}
          </p>
          <p className="mt-0.5 font-body text-[12px] text-stone">
            {fromDateKey(bloc.date).toLocaleDateString(lang, {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
            {qui ? ` · ${qui}` : ""}
            {bloc.reason ? ` · ${bloc.reason}` : ""}
          </p>
        </div>

        <p className="mt-3 font-body text-[13px] text-stone">{t.admin.tagesplan.unblockHint}</p>

        {error ? <p className="mt-4 font-body text-[13px] text-destructive">{error}</p> : null}

        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button onClick={onClose} disabled={busy} className="btn-ghost !px-4 !py-3 sm:!px-5">
            {t.common.cancel}
          </button>
          <button
            onClick={supprimer}
            disabled={busy}
            className="btn-solid !bg-destructive !px-4 !py-3 hover:!bg-destructive/90 sm:!px-5"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {t.common.delete}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-carbon/10 bg-white px-3 py-4 text-center shadow-soft sm:px-4">
      <p
        className={cn(
          "font-display text-[26px] font-semibold tabular-nums sm:text-[32px]",
          tone === "success"
            ? "text-success"
            : tone === "danger"
              ? "text-destructive"
              : "text-carbon",
        )}
      >
        {value}
      </p>
      {/* Interlettrage resserre sur les tres petits ecrans : "Storniert" ne
          tient pas dans un tiers de 320 px avec tracking-widest. */}
      <p className="mt-0.5 font-body text-[9px] uppercase tracking-wide text-stone sm:text-[11px] sm:tracking-widest">
        {label}
      </p>
    </div>
  );
}

/** Blocage d'un creneau sans quitter le plan du jour : pause, course, imprevu. */
function BlockSheet({
  date,
  barbers,
  onClose,
  onCreated,
}: {
  date: string;
  barbers: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useLanguage();
  const [barberId, setBarberId] = useState<string>("");
  const [allDay, setAllDay] = useState(false);
  const [from, setFrom] = useState("12:00");
  const [to, setTo] = useState("13:00");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await db.createBlocked({
        barber_id: barberId || null,
        date,
        start_time: allDay ? "00:00" : from,
        end_time: allDay ? "23:59" : to,
        all_day: allDay,
        reason: reason.trim(),
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const valide = allDay || to > from;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/40 p-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-carbon/10 bg-white p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="eyebrow">{t.admin.tagesplan.blockTime}</p>
        <h3 className="mt-1.5 font-display text-[22px] font-semibold text-carbon">
          {t.admin.newBlock}
        </h3>

        <div className="mt-5 space-y-3">
          <Field label={t.admin.allBarbers}>
            <select
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
              className="w-full rounded-xl border border-carbon/15 bg-white px-4 py-3 font-body text-[14px] text-carbon outline-none focus:border-carbon/45"
            >
              <option value="">{t.admin.allBarbers}</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>

          <label className="flex items-center gap-2.5 font-body text-[13px] text-carbon">
            <input
              type="checkbox"
              className="h-4 w-4 accent-carbon"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            {t.admin.allDay}
          </label>

          {!allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.admin.from}>
                <input
                  type="time"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-xl border border-carbon/15 bg-white px-4 py-3 font-body text-[14px] text-carbon outline-none focus:border-carbon/45"
                />
              </Field>
              <Field label={t.admin.to}>
                <input
                  type="time"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-xl border border-carbon/15 bg-white px-4 py-3 font-body text-[14px] text-carbon outline-none focus:border-carbon/45"
                />
              </Field>
            </div>
          ) : null}

          <Field label={t.admin.reason}>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-carbon/15 bg-white px-4 py-3 font-body text-[14px] text-carbon outline-none focus:border-carbon/45"
            />
          </Field>
        </div>

        {error ? <p className="mt-4 font-body text-[13px] text-destructive">{error}</p> : null}

        {/* Meme disposition que les autres fiches : retour a gauche, action
            principale a droite, deux boutons de largeur egale. */}
        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button onClick={onClose} disabled={busy} className="btn-ghost !px-4 !py-3 sm:!px-5">
            {t.common.close}
          </button>
          <button
            onClick={save}
            disabled={busy || !valide}
            className="btn-solid !px-4 !py-3 sm:!px-5"
          >
            {t.admin.create}
          </button>
        </div>
      </div>
    </div>
  );
}
