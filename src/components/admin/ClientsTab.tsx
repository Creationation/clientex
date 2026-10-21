import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, ChevronRight, Mail, Phone, Search, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Barber, Booking, ClientProfile, Service } from "@/data/types";
import { db } from "@/lib/db";
import { buildClientProfiles, matchesQuery, phoneKey } from "@/lib/clients";
import { cn, fromDateKey, toDateKey } from "@/lib/utils";
import { bookingServiceLabel, Empty, STATUS_DOT, StatusBadge } from "./shared";

/**
 * Fiches clients, reconstruites depuis les reservations : nombre de visites,
 * derniere fois, prochain rendez-vous, coordonnees, historique, et une note
 * libre du salon. Le "wie beim letzten Mal" que le patron a en tete, ecrit
 * quelque part.
 *
 * Sur grand ecran la fiche s'affiche a droite de la liste. Sur telephone elle
 * s'ouvre par-dessus : sinon elle atterrit sous une liste qui occupe 70 % de
 * la hauteur, et on croit que le clic n'a rien fait.
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
  const { t } = useLanguage();
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

  if (clients.length === 0) return <Empty text={t.admin.clients.empty} />;

  const detail = open ? (
    <ClientDetail
      client={open}
      history={history}
      services={services}
      barbers={barbers}
      draftNote={draftNote}
      setDraftNote={setDraftNote}
      saveNote={saveNote}
      saved={saved}
      onOpenBooking={onOpenBooking}
      onNewBooking={onNewBooking}
    />
  ) : null;

  return (
    <>
      {/* min-w-0 partout : sans lui, une colonne de grille ne descend jamais
          sous la largeur minimale de son contenu, et c'est toute la page qui
          part en defilement horizontal. */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="min-w-0">
          <label className="flex min-w-0 items-center gap-3 rounded-full border border-carbon/15 bg-white px-4 py-2.5">
            <Search size={14} className="shrink-0 text-stone" />
            <input
              className="w-full min-w-0 bg-transparent font-body text-[14px] text-carbon outline-none placeholder:text-stone/60"
              placeholder={t.admin.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <ul className="mt-3 max-h-[70vh] min-w-0 space-y-1.5 overflow-y-auto pr-1">
            {visible.length === 0 ? (
              <li className="py-8 text-center font-body text-[13px] text-stone/70">
                {t.admin.noResults}
              </li>
            ) : (
              visible.map((c) => (
                <li key={c.key} className="min-w-0">
                  <button
                    onClick={() => setOpenKey(c.key)}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors sm:px-4",
                      openKey === c.key
                        ? "border-carbon bg-white"
                        : "border-carbon/10 bg-paper-soft hover:border-carbon/30",
                    )}
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-carbon font-display text-[15px] font-semibold text-paper">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-body text-[14px] font-medium text-carbon">
                          {c.name}
                        </span>
                        {c.visits === 0 ? (
                          <span className="shrink-0 rounded-full bg-brass/15 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wider text-brass">
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

        {/* Colonne de droite : seulement quand l'ecran est assez large. */}
        <div className="hidden min-w-0 lg:block">
          {detail ?? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-carbon/15">
              <p className="font-body text-[13px] text-stone/60">{t.admin.clients.history}</p>
            </div>
          )}
        </div>
      </div>

      {/* Telephone et tablette : la fiche passe par-dessus la liste. */}
      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/40 p-3 backdrop-blur-sm lg:hidden"
          onClick={() => setOpenKey(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-carbon/10 bg-white p-3 shadow-lift sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setOpenKey(null)}
                className="grid h-10 w-10 place-items-center rounded-full border border-carbon/12 text-stone transition-colors hover:text-carbon"
                aria-label={t.common.close}
              >
                <X size={15} />
              </button>
            </div>
            {detail}
          </div>
        </div>
      ) : null}
    </>
  );
}

function ClientDetail({
  client,
  history,
  services,
  barbers,
  draftNote,
  setDraftNote,
  saveNote,
  saved,
  onOpenBooking,
  onNewBooking,
}: {
  client: ClientProfile;
  history: Booking[];
  services: Service[];
  barbers: Barber[];
  draftNote: string;
  setDraftNote: (v: string) => void;
  saveNote: () => void;
  saved: boolean;
  onOpenBooking: (b: Booking) => void;
  onNewBooking: (prefill: { name: string; phone: string; email: string }) => void;
}) {
  const { t, lang } = useLanguage();

  const fmt = (d: string | null) =>
    d
      ? fromDateKey(d).toLocaleDateString(lang, { day: "2-digit", month: "short", year: "numeric" })
      : t.admin.clients.none;

  return (
    <div className="min-w-0 rounded-3xl border border-carbon/10 bg-paper-soft p-4 sm:p-5">
      <h3 className="break-words font-display text-[22px] font-semibold text-carbon sm:text-[24px]">
        {client.name}
      </h3>

      {/* Coordonnees : un tap pour appeler, un tap pour ecrire. */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <a
          href={`tel:${client.phone.replace(/\s+/g, "")}`}
          className="btn-ghost !min-w-0 !justify-start !px-4 !py-2.5 !text-[12px]"
        >
          <Phone size={12} className="shrink-0" />
          <span className="truncate">{client.phone}</span>
        </a>
        {client.email ? (
          <a
            href={`mailto:${client.email}`}
            className="btn-ghost !min-w-0 !justify-start !px-4 !py-2.5 !text-[12px]"
          >
            <Mail size={12} className="shrink-0" />
            <span className="truncate">{client.email}</span>
          </a>
        ) : (
          <span className="font-body text-[12px] text-stone/70">{t.admin.clients.noEmail}</span>
        )}
      </div>

      <button
        onClick={() =>
          onNewBooking({ name: client.name, phone: client.phone, email: client.email })
        }
        className="btn-solid mt-3 w-full !px-4 !py-2.5 !text-[11px] sm:w-auto"
      >
        <CalendarPlus size={12} /> {t.admin.clients.bookFor}
      </button>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Stat label={t.admin.clients.visits} value={String(client.visits)} />
        <Stat
          label={t.admin.clients.noShows}
          value={String(client.no_shows)}
          warn={client.no_shows > 0}
        />
        <Stat label={t.admin.clients.lastVisit} value={fmt(client.last_visit)} />
        <Stat label={t.admin.clients.nextVisit} value={fmt(client.next_visit)} />
      </dl>

      {client.last_service_ids.length > 0 ? (
        <p className="mt-4 break-words font-body text-[13px] text-stone">
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            {t.admin.clients.lastServices}:
          </span>{" "}
          {client.last_service_ids
            .map((id) => services.find((s) => s.id === id))
            .filter((s): s is Service => Boolean(s))
            .map((s) => (lang === "en" ? s.name_en || s.name_de : s.name_de))
            .join(" + ")}
          {client.last_barber_id
            ? ` · ${barbers.find((b) => b.id === client.last_barber_id)?.name ?? ""}`
            : ""}
        </p>
      ) : null}

      <div className="mt-5">
        <label className="block">
          <span className="font-body text-[10px] font-semibold uppercase tracking-widest text-stone">
            {t.admin.clients.note}
          </span>
          <textarea
            className="field mt-1.5 min-h-[88px] w-full resize-y !py-2.5"
            value={draftNote}
            placeholder={t.admin.clients.notePlaceholder}
            onChange={(e) => setDraftNote(e.target.value)}
          />
        </label>
        <button onClick={saveNote} className="btn-solid mt-2 w-full !px-5 !py-2.5 sm:w-auto">
          {saved ? t.admin.clients.noteSaved : t.common.save}
        </button>
      </div>

      <h4 className="mt-6 font-body text-[10px] font-semibold uppercase tracking-brand text-brass">
        {t.admin.clients.history}
      </h4>
      <ul className="mt-2 min-w-0 space-y-1.5">
        {history.map((b) => (
          <li key={b.id} className="min-w-0">
            <button
              onClick={() => onOpenBooking(b)}
              className="flex w-full min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left transition-colors hover:bg-carbon/[0.04] sm:gap-3"
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[b.status])} />
              <span className="w-[56px] shrink-0 font-body text-[12px] tabular-nums text-carbon">
                {fromDateKey(b.booking_date).toLocaleDateString(lang, {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                })}
              </span>
              <span className="min-w-0 flex-1 truncate font-body text-[12px] text-stone">
                {b.start_time} · {bookingServiceLabel(b, services, lang)}
              </span>
              <span className="shrink-0">
                <StatusBadge status={b.status} label={t.admin.statuses[b.status]} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-3">
      {/* Le libelle passe a la ligne plutot que de finir en points de
          suspension : "Nicht erschienen" ne tient pas sur une demi-largeur. */}
      <dt className="font-body text-[10px] font-semibold uppercase leading-tight tracking-widest text-stone">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 truncate font-display text-[17px] font-semibold sm:text-[20px]",
          warn ? "text-destructive" : "text-carbon",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
