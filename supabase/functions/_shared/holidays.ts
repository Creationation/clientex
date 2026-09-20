/**
 * Jours feries legaux autrichiens, copie de src/lib/holidays.ts pour Deno.
 * Le salon est ferme ces jours-la.
 */
export function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function isAustrianHoliday(dateKey: string): boolean {
  const year = Number(dateKey.slice(0, 4));
  if (!Number.isFinite(year)) return false;
  const easter = easterSunday(year);
  const plus = (days: number) => {
    const d = new Date(easter);
    d.setUTCDate(d.getUTCDate() + days);
    return key(d);
  };
  const fixed = ["01-01", "01-06", "05-01", "08-15", "10-26", "11-01", "12-08", "12-25", "12-26"].map((s) => `${year}-${s}`);
  return fixed.includes(dateKey) || [plus(1), plus(39), plus(50), plus(60)].includes(dateKey);
}
