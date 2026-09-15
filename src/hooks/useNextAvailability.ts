import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { findNextSlot, type NextSlot } from "@/lib/slots";
import { addDays, toDateKey } from "@/lib/utils";
import type { Barber, BarberHour, OpeningHour, Settings } from "@/data/types";

const HORIZON_DAYS = 14;

/**
 * Prochain creneau libre par barbier, pour une duree donnee (par defaut la
 * prestation la plus courte). La cle "any" correspond a "egal wer".
 */
export function useNextAvailability(
  barbers: Barber[],
  openingHours: OpeningHour[],
  barberHours: BarberHour[],
  settings: Settings,
  durationMin: number,
): Record<string, NextSlot | null> {
  const [result, setResult] = useState<Record<string, NextSlot | null>>({});

  useEffect(() => {
    if (barbers.length === 0 || openingHours.length === 0 || durationMin <= 0) return;
    let cancelled = false;

    const from = toDateKey(new Date());
    const to = toDateKey(addDays(new Date(), HORIZON_DAYS));

    Promise.all([db.listBusy(from, to), db.listBlocked(from, to), db.listAbsences(from, to)])
      .then(([busy, blocked, absences]) => {
        if (cancelled) return;
        const base = { durationMin, barbers, openingHours, barberHours, absences, busy, blocked, settings };
        const next: Record<string, NextSlot | null> = {
          any: findNextSlot({ ...base, barberId: null }, HORIZON_DAYS),
        };
        for (const b of barbers) {
          next[b.id] = findNextSlot({ ...base, barberId: b.id }, HORIZON_DAYS);
        }
        setResult(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [barbers, openingHours, barberHours, settings, durationMin]);

  return result;
}
