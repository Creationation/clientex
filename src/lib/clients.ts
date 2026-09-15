import type { Booking, ClientProfile } from "@/data/types";

/**
 * Fiches clients reconstruites a partir des reservations.
 * Pas de table "clients" a maintenir en double : le telephone est la cle,
 * et la note libre du salon est la seule donnee stockee a part.
 */

/** "+43 660 12 34 567" -> "4366012 34567" -> "4366012345678". Un 0 initial devient 43. */
export function phoneKey(phone: string): string {
  let digits = phone.replace(/\D+/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "43" + digits.slice(1);
  return digits;
}

export function buildClientProfiles(
  bookings: Booking[],
  notes: Record<string, string>,
  today: string,
): ClientProfile[] {
  const map = new Map<string, ClientProfile & { _lastSeen: string }>();

  const sorted = [...bookings].sort((a, b) =>
    (a.booking_date + a.start_time).localeCompare(b.booking_date + b.start_time),
  );

  for (const b of sorted) {
    const key = phoneKey(b.client_phone);
    // Walk-ins sans telephone : on ne peut rien regrouper, on saute.
    if (!key || /^0+$/.test(key)) continue;

    const cur = map.get(key) ?? {
      key,
      name: b.client_name,
      phone: b.client_phone,
      email: "",
      visits: 0,
      no_shows: 0,
      last_visit: null,
      next_visit: null,
      last_service_ids: [],
      last_barber_id: null,
      note: notes[key] ?? "",
      _lastSeen: "",
    };

    // Le nom et l'e-mail les plus recents font foi. Strictement plus recent :
    // pour deux personnes reservees ensemble le meme jour, c'est le premier
    // rendez-vous (celui qui a reserve) qui donne son nom a la fiche.
    if (b.booking_date > cur._lastSeen) {
      cur.name = b.client_name;
      cur.phone = b.client_phone;
      if (b.client_email && !b.client_email.endsWith("@delherren.local")) cur.email = b.client_email;
      cur._lastSeen = b.booking_date;
    }

    if (b.status === "no_show") cur.no_shows += 1;

    const past = b.booking_date < today || (b.booking_date === today && b.status === "done");
    if (past && (b.status === "done" || b.status === "confirmed")) {
      cur.visits += 1;
      cur.last_visit = b.booking_date;
      cur.last_service_ids = b.service_ids;
      cur.last_barber_id = b.barber_id;
    } else if (!past && (b.status === "confirmed" || b.status === "pending")) {
      if (!cur.next_visit || b.booking_date < cur.next_visit) cur.next_visit = b.booking_date;
      if (cur.last_service_ids.length === 0) {
        cur.last_service_ids = b.service_ids;
        cur.last_barber_id = b.barber_id;
      }
    }

    map.set(key, cur);
  }

  return [...map.values()]
    .map(({ _lastSeen, ...c }) => c)
    .sort((a, b) => (b.last_visit ?? "").localeCompare(a.last_visit ?? "") || a.name.localeCompare(b.name));
}

/** Filtre nom / telephone / e-mail, insensible a la casse et aux espaces du numero. */
export function matchesQuery(c: { name: string; phone: string; email: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const qDigits = q.replace(/\D+/g, "");
  const key = phoneKey(c.phone);
  return (
    c.name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    (qDigits.length >= 3 && (key.includes(qDigits) || key.includes(phoneKey(q))))
  );
}
