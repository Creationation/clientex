/**
 * Jours feries legaux en Autriche. Le salon est ferme ces jours-la : un
 * commerce n'a pas le droit d'ouvrir un jour ferie, le client l'a confirme.
 *
 * Meme logique dans supabase/functions/_shared/holidays.ts : le navigateur
 * n'affiche pas de creneau, et le serveur refuse quand meme.
 */

/** Dimanche de Paques (calendrier gregorien, algorithme de Meeus). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = mars, 4 = avril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const cache = new Map<number, Map<string, string>>();

/** Tous les feries d'une annee : cle YYYY-MM-DD -> nom allemand. */
export function austrianHolidays(year: number): Map<string, string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const plus = (days: number, name: string): [string, string] => {
    const d = new Date(easter);
    d.setDate(d.getDate() + days);
    return [key(d), name];
  };

  const map = new Map<string, string>([
    [`${year}-01-01`, "Neujahr"],
    [`${year}-01-06`, "Heilige Drei Könige"],
    plus(1, "Ostermontag"),
    [`${year}-05-01`, "Staatsfeiertag"],
    plus(39, "Christi Himmelfahrt"),
    plus(50, "Pfingstmontag"),
    plus(60, "Fronleichnam"),
    [`${year}-08-15`, "Mariä Himmelfahrt"],
    [`${year}-10-26`, "Nationalfeiertag"],
    [`${year}-11-01`, "Allerheiligen"],
    [`${year}-12-08`, "Mariä Empfängnis"],
    [`${year}-12-25`, "Christtag"],
    [`${year}-12-26`, "Stefanitag"],
  ]);
  cache.set(year, map);
  return map;
}

/** Nom du ferie pour une date (YYYY-MM-DD), ou null. */
export function holidayName(dateKey: string): string | null {
  const year = Number(dateKey.slice(0, 4));
  if (!Number.isFinite(year)) return null;
  return austrianHolidays(year).get(dateKey) ?? null;
}

export function isHoliday(dateKey: string): boolean {
  return holidayName(dateKey) !== null;
}
