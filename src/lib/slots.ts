import type {
  Barber, BarberAbsence, BarberHour, BlockedSlot, BusySlot, OpeningHour, Settings,
} from "@/data/types";
import { isHoliday } from "./holidays";
import { addDays, overlaps, toDateKey, toHHMM, toMinutes } from "./utils";

export interface SlotContext {
  date: Date;
  durationMin: number;
  /** null = "egal wer" : un creneau est libre des qu'UN barbier actif est libre */
  barberId: string | null;
  barbers: Barber[];
  openingHours: OpeningHour[];
  barberHours: BarberHour[];
  absences: BarberAbsence[];
  busy: BusySlot[];
  blocked: BlockedSlot[];
  settings: Settings;
  now?: Date;
}

export interface Slot {
  time: string;
  available: boolean;
}

type Interval = [number, number];

/**
 * Plage de travail d'un barbier a une date donnee, en minutes depuis minuit.
 * C'est l'intersection des horaires du salon et de ses propres horaires.
 * null quand le salon est ferme, que le barbier ne travaille pas ce jour-la
 * ou qu'il est absent.
 */
export function workWindow(
  date: Date,
  barberId: string | null,
  openingHours: OpeningHour[],
  barberHours: BarberHour[],
  absences: BarberAbsence[] = [],
): Interval | null {
  const shop = openingHours.find((h) => h.weekday === date.getDay());
  if (!shop || !shop.is_open) return null;
  // Jour ferie legal : ferme, quels que soient les horaires du jour de semaine.
  if (isHoliday(toDateKey(date))) return null;

  let open = toMinutes(shop.open_time);
  let close = toMinutes(shop.close_time);

  if (barberId) {
    const dateKey = toDateKey(date);
    if (isBarberAbsent(barberId, dateKey, absences)) return null;

    const own = barberHours.find((h) => h.barber_id === barberId && h.weekday === date.getDay());
    if (own) {
      if (!own.active) return null;
      open = Math.max(open, toMinutes(own.start_time));
      close = Math.min(close, toMinutes(own.end_time));
    }
  }

  return close > open ? [open, close] : null;
}

export function isBarberAbsent(barberId: string, dateKey: string, absences: BarberAbsence[]): boolean {
  return absences.some(
    (a) => a.barber_id === barberId && a.start_date <= dateKey && dateKey <= a.end_date,
  );
}

/** Intervalles indisponibles d'un barbier a une date : rendez-vous et blocages. */
function busyIntervals(
  barberId: string,
  dateKey: string,
  window: Interval,
  busy: BusySlot[],
  blocked: BlockedSlot[],
  buffer: number,
): Interval[] {
  const out: Interval[] = [];
  for (const b of busy) {
    if (b.booking_date !== dateKey) continue;
    if (b.barber_id && b.barber_id !== barberId) continue;
    out.push([toMinutes(b.start_time), toMinutes(b.end_time) + buffer]);
  }
  for (const blk of blocked) {
    if (blk.date !== dateKey) continue;
    if (blk.barber_id && blk.barber_id !== barberId) continue;
    out.push(blk.all_day ? window : [toMinutes(blk.start_time), toMinutes(blk.end_time)]);
  }
  return out;
}

function earliestStart(date: Date, now: Date, leadTimeMin: number): number {
  return toDateKey(now) === toDateKey(date)
    ? now.getHours() * 60 + now.getMinutes() + leadTimeMin
    : -Infinity;
}

/**
 * Creneaux de debut possibles pour UN barbier, dans sa plage de travail.
 * Un rendez-vous existant bloque tout son intervalle [debut, fin + buffer),
 * pas seulement son heure de debut.
 */
function slotsForBarber(ctx: SlotContext, barberId: string): Map<string, boolean> {
  const out = new Map<string, boolean>();
  const window = workWindow(ctx.date, barberId, ctx.openingHours, ctx.barberHours, ctx.absences);
  if (!window) return out;

  const [open, close] = window;
  const dateKey = toDateKey(ctx.date);
  const step = Math.max(5, ctx.settings.slot_granularity_min);
  const buffer = Math.max(0, ctx.settings.buffer_after_min);
  const taken = busyIntervals(barberId, dateKey, window, ctx.busy, ctx.blocked, buffer);
  const earliest = earliestStart(ctx.date, ctx.now ?? new Date(), ctx.settings.min_lead_time_min);

  for (let start = open; start + ctx.durationMin <= close; start += step) {
    const end = start + ctx.durationMin;
    const conflict = taken.some(([bs, be]) => overlaps(start, end, bs, be));
    out.set(toHHMM(start), !conflict && start >= earliest);
  }
  return out;
}

/**
 * Genere les creneaux de debut possibles pour une date, un barbier (ou
 * n'importe lequel) et une duree totale (somme des prestations choisies).
 *
 * Regles :
 *  - le rendez-vous doit tenir entierement dans la plage de travail
 *  - la plage tient compte des horaires du salon ET de ceux du barbier
 *  - un barbier absent (conge) n'a aucun creneau
 *  - un blocage sans barbier vaut pour tout le salon
 *  - les creneaux trop proches (delai minimum) sont retires
 *  - "egal wer" : un creneau est libre des qu'un barbier actif est libre
 */
export function buildSlots(ctx: SlotContext): Slot[] {
  if (ctx.durationMin <= 0) return [];

  const candidates = ctx.barberId
    ? ctx.barbers.filter((b) => b.id === ctx.barberId)
    : ctx.barbers.filter((b) => b.active);

  if (candidates.length === 0) return [];

  // Grille de reference : la plage du salon, pour que les heures restent
  // alignees quel que soit le barbier.
  const shopWindow = workWindow(ctx.date, null, ctx.openingHours, ctx.barberHours);
  if (!shopWindow) return [];

  const perBarber = candidates.map((b) => slotsForBarber(ctx, b.id));
  const step = Math.max(5, ctx.settings.slot_granularity_min);
  const slots: Slot[] = [];

  for (let start = shopWindow[0]; start + ctx.durationMin <= shopWindow[1]; start += step) {
    const time = toHHMM(start);
    const available = perBarber.some((m) => m.get(time) === true);
    slots.push({ time, available });
  }
  return slots;
}

/** Barbiers reellement libres pour un creneau precis (utile pour "egal wer"). */
export function freeBarbersAt(ctx: SlotContext, time: string): Barber[] {
  return ctx.barbers
    .filter((b) => b.active)
    .filter((b) => slotsForBarber(ctx, b.id).get(time) === true);
}

/** Le salon est-il ouvert a cette date (hors blocage total) ? */
export function isShopOpen(date: Date, openingHours: OpeningHour[], blocked: BlockedSlot[]): boolean {
  const hours = openingHours.find((h) => h.weekday === date.getDay());
  if (!hours || !hours.is_open) return false;
  const dateKey = toDateKey(date);
  if (isHoliday(dateKey)) return false;
  return !blocked.some((b) => b.date === dateKey && b.all_day && b.barber_id === null);
}

/** Statut ouvert / ferme en direct, pour le badge du header. */
export function openStatus(openingHours: OpeningHour[], now = new Date()) {
  const today = openingHours.find((h) => h.weekday === now.getDay());
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (!today || !today.is_open || isHoliday(toDateKey(now))) {
    return { open: false, until: null as string | null };
  }
  const open = toMinutes(today.open_time);
  const close = toMinutes(today.close_time);
  if (minutes >= open && minutes < close) return { open: true, until: today.close_time };
  return { open: false, until: minutes < open ? today.open_time : null };
}

export interface NextSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

/**
 * Premier creneau libre a partir d'aujourd'hui, sur `days` jours.
 * Les listes busy / blocked / absences doivent couvrir toute la periode.
 */
export function findNextSlot(
  base: Omit<SlotContext, "date">,
  days: number,
  from: Date = new Date(),
): NextSlot | null {
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const first = buildSlots({ ...base, date }).find((s) => s.available);
    if (first) return { date: toDateKey(date), time: first.time };
  }
  return null;
}
