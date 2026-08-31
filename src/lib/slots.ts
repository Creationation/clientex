import type { BlockedSlot, BusySlot, OpeningHour, Settings } from "@/data/types";
import { overlaps, toDateKey, toHHMM, toMinutes } from "./utils";

export interface SlotContext {
  date: Date;
  durationMin: number;
  barberId: string | null;
  openingHours: OpeningHour[];
  busy: BusySlot[];
  blocked: BlockedSlot[];
  settings: Settings;
  now?: Date;
}

export interface Slot {
  time: string;
  available: boolean;
}

/**
 * Genere les creneaux de debut possibles pour une date, un barbier et une
 * duree totale (somme des prestations choisies).
 *
 * Regles appliquees :
 *  - le rendez-vous doit tenir entierement dans l'amplitude d'ouverture
 *  - un rendez-vous existant bloque tout son intervalle [debut, fin + buffer),
 *    pas uniquement son heure de debut
 *  - les blocages manuels et les conges bloquent leur intervalle
 *  - un blocage sans barbier vaut pour tout le salon
 *  - les creneaux trop proches (delai minimum) sont retires
 */
export function buildSlots(ctx: SlotContext): Slot[] {
  const { date, durationMin, barberId, openingHours, busy: busySlots, blocked, settings } = ctx;
  const now = ctx.now ?? new Date();
  const dateKey = toDateKey(date);

  const hours = openingHours.find((h) => h.weekday === date.getDay());
  if (!hours || !hours.is_open) return [];

  const open = toMinutes(hours.open_time);
  const close = toMinutes(hours.close_time);
  const step = Math.max(5, settings.slot_granularity_min);
  const buffer = Math.max(0, settings.buffer_after_min);

  const busy: [number, number][] = [];

  for (const b of busySlots) {
    if (b.booking_date !== dateKey) continue;
    if (barberId && b.barber_id && b.barber_id !== barberId) continue;
    busy.push([toMinutes(b.start_time), toMinutes(b.end_time) + buffer]);
  }

  for (const blk of blocked) {
    if (blk.date !== dateKey) continue;
    if (blk.barber_id && barberId && blk.barber_id !== barberId) continue;
    busy.push(blk.all_day ? [open, close] : [toMinutes(blk.start_time), toMinutes(blk.end_time)]);
  }

  const earliest =
    toDateKey(now) === dateKey
      ? now.getHours() * 60 + now.getMinutes() + settings.min_lead_time_min
      : -Infinity;

  const slots: Slot[] = [];
  for (let start = open; start + durationMin <= close; start += step) {
    const end = start + durationMin;
    const conflict = busy.some(([bs, be]) => overlaps(start, end, bs, be));
    slots.push({ time: toHHMM(start), available: !conflict && start >= earliest });
  }
  return slots;
}

/** Le salon est-il ouvert a cette date (hors blocage total) ? */
export function isShopOpen(date: Date, openingHours: OpeningHour[], blocked: BlockedSlot[]): boolean {
  const hours = openingHours.find((h) => h.weekday === date.getDay());
  if (!hours || !hours.is_open) return false;
  const dateKey = toDateKey(date);
  return !blocked.some((b) => b.date === dateKey && b.all_day && b.barber_id === null);
}

/** Statut ouvert / ferme en direct, pour le badge du header. */
export function openStatus(openingHours: OpeningHour[], now = new Date()) {
  const today = openingHours.find((h) => h.weekday === now.getDay());
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (!today || !today.is_open) return { open: false, until: null as string | null };
  const open = toMinutes(today.open_time);
  const close = toMinutes(today.close_time);
  if (minutes >= open && minutes < close) return { open: true, until: today.close_time };
  return { open: false, until: minutes < open ? today.open_time : null };
}
