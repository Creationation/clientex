import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronRight, Mail, Phone, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Barber, Booking, ClientProfile, Service } from "@/data/types";
import { db } from "@/lib/db";
import { buildClientProfiles, matchesQuery, phoneKey } from "@/lib/clients";
import { cn, fromDateKey, toDateKey } from "@/lib/utils";
import { bookingServiceLabel, Empty, STATUS_DOT, StatusBadge } from "./shared";

/**
 * Fiches clients, reconstruites depuis les reservations : nombre de visites,
 * derniere fois, prochain rendez-vous, et une note libre du salon.
 * Le "wie beim letzten Mal" que le patron a en tete, ecrit quelque part.
 */
export function ClientsTab({
  bookings,
  services,
  barbers,
  onOpenBooking,
  onNewBooking,
}: {
  bookings: Booking[];
  services: Service[];
  barbers: Barber[];
  onOpenBooking: (b: Booking) => void;
  onNewBooking: (prefill: { name: string; phone: string; email: string }) => void;
}) {
  const { t, lang } = useLanguage();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    db.listClientNotes().then(setNotes).catch(() => undefined);
  }, []);

  const clients = useMemo(
    () => buildClientProfiles(bookings, notes, toDateKey(new Date())),
    [bookings, notes],
  );
  const visible = clients.filter((c) => matchesQuery(c, query));
  const open = clients.find((c) => c.key === openKey) ?? null;

  useEffect(() => {
    setDraftNote(open?.note ?? "");
    setSaved(false);
  }, [openKey, open?.note]);

  const history = open
    ? bookings
        .filter((b) => phoneKey(b.client_phone) === open.key)
        .sort((a, b) => (b.booking_date + b.start_time).localeCompare(a.booking_date + a.start_time))
    : [];

  const saveNote = async () => {
    if (!open) return;
    await db.saveClientNote(open.key, open.name, draftNote.trim());
    setNotes((n) => ({ ...n, [open.key]: draftNote.trim() }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const fmt = (d: string | null) =>
    d ? fromDateKey(d).toLocaleDateString(lang, { day: "2-digit", month: "short", year: "numeric" }) : t.admin.clients.none;

  if (clients.length === 0) return <Empty text={t.admin.clients.empty} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <label className="flex items-center gap-3 rounded-full border border-carbon/15 bg-white px-4 py-2.5">
          <Search size={14} className="shrink-0 text-stone" />
          <input
            className="w-full bg-transparent font-body text-[14px] text-carbon outline-none placeholder:text-stone/60"
            placeholder={t.admin.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <ul className="mt-3 max-h-[70vh] space-y-1.5 overflow-y-auto pr-1">
          {visible.length === 0 ? (
            <li className="py-8 text-center font-body text-[13px] text-stone/70">{t.admin.noResults}</li>
          ) : (
            visible.map((c) => (
              <li key={c.key}>
                <button
                  onClick={() => setOpenKey(c.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                    openKey === c.key ? "border-carbon bg-white" : "border-carbon/10 bg-paper-soft hover:border-carbon/30",
                  )}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-carbon font-display text-[15px] font-semibold text-paper">
                    {c.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-body text-[14px] font-medium text-carbon">
                      {c.name}
                      {c.visits === 0 ? (
                        <span className="ml-2 rounded-full bg-brass/15 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wider text-brass">
                          {t.admin.clients.newClient}
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate font-body text-[12px] text-stone">
                      {c.phone} · {c.visits} {t.admin.clients.visits}
                      {c.no_shows > 0 ? ` · ${c.no_shows} ${t.admin.statuses.no_show}` : ""}
                    </span>
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-stone" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {open ? (
        <div className="rounded-3xl border border-carbon/10 bg-paper-soft p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[24px] font-semibold text-carbon">{open.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`tel:${open.phone.replace(/\s+/g, "")}`} className="btn-ghost !px-4 !py-2 !text-[11px]">
                  <Phone size={12} /> {open.phone}
                </a>
                {open.email ? (
                  <a href={`mailto:${open.email}`} className="btn-ghost !px-4 !py-2 !text-[11px]">
                    <Mail size={12} /> {open.email}
                  </a>
                ) : null}
              </div>
            </div>
            <button
              onClick={() => onNewBooking({ name: open.name, phone: open.phone, email: open.email })}
              className="btn-solid !px-4 !py-2 !text-[11px]"
            >
              <CalendarPlus size={12} /> {t.admin.clients.bookFor}
            </button>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t.admin.clients.visits} value={String(open.visits)} />
            <Stat label={t.admin.clients.noShows} value={String(open.no_shows)} warn={open.no_shows > 0} />
            <Stat label={t.admin.clients.lastVisit} value={fmt(open.last_visit)} />
            <Stat label={t.admin.clients.nextVisit} value={fmt(open.next_visit)} />
          </dl>

          {open.last_service_ids.length > 0 ? (
            <p className="mt-4 font-body text-[13px] text-stone">
              <span className="font-semibold uppercase tracking-widest text-[10px]">{t.admin.clients.lastServices}:</span>{" "}
              {open.last_service_ids
                .map((id) => services.find((s) => s.id === id))
                .filter(Boolean)
                .map((s) => (lang === "en" ? s!.name_en || s!.name_de : s!.name_de))
                .join(" + ")}
              {open.last_barber_id ? ` · ${barbers.find((b) => b.id === open.last_barber_id)?.name ?? ""}` : ""}
            </p>
          ) : null}

          <div className="mt-5">
            <label className="block">
              <span className="font-body text-[10px] font-semibold uppercase tracking-widest text-stone">
                {t.admin.clients.note}
              </span>
              <textarea
                className="field mt-1.5 min-h-[88px] resize-y !py-2.5"
                value={draftNote}
                placeholder={t.admin.clients.notePlaceholder}
                onChange={(e) => setDraftNote(e.target.value)}
              />
            </label>
            <button onClick={saveNote} className="btn-solid mt-2 !px-5 !py-2.5">
              {saved ? t.admin.clients.noteSaved : t.common.save}
            </button>
          </div>

          <h4 className="mt-6 font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
            {t.admin.clients.history}
          </h4>
          <ul className="mt-2 space-y-1.5">
            {history.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => onOpenBooking(b)}
                  className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left transition-colors hover:bg-carbon/[0.04]"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[b.status])} />
                  <span className="w-24 shrink-0 font-body text-[12px] tabular-nums text-carbon">
                    {fromDateKey(b.booking_date).toLocaleDateString(lang, { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-body text-[12px] text-stone">
                    {b.start_time} · {bookingServiceLabel(b, services, lang)}
                  </span>
                  <StatusBadge status={b.status} label={t.admin.statuses[b.status]} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="hidden items-center justify-center rounded-3xl border border-dashed border-carbon/15 lg:flex">
          <p className="font-body text-[13px] text-stone/60">{t.admin.clients.history}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <dt className="font-body text-[10px] font-semibold uppercase tracking-widest text-stone">{label}</dt>
      <dd className={cn("mt-1 font-display text-[20px] font-semibold", warn ? "text-destructive" : "text-carbon")}>
        {value}
      </dd>
    </div>
  );
}
