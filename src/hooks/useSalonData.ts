import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/db";
import type { Barber, OpeningHour, Service, Settings } from "@/data/types";
import { SEED_SETTINGS } from "@/data/seed";

interface SalonData {
  services: Service[];
  barbers: Barber[];
  openingHours: OpeningHour[];
  settings: Settings;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Charge en une passe tout ce dont la landing et le booking ont besoin. */
export function useSalonData(includeInactive = false): SalonData {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [settings, setSettings] = useState<Settings>(SEED_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      db.listServices(includeInactive),
      db.listBarbers(includeInactive),
      db.listOpeningHours(),
      db.getSettings(),
    ])
      .then(([s, b, h, st]) => {
        if (cancelled) return;
        setServices(s);
        setBarbers(b);
        setOpeningHours(h);
        setSettings(st);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [includeInactive, tick]);

  return { services, barbers, openingHours, settings, loading, error, reload };
}
