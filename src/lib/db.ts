import type {
  Barber, BlockedSlot, Booking, BusySlot, NewBookingInput, OpeningHour, Service, Settings,
} from "@/data/types";
import { SEED_BARBERS, SEED_OPENING_HOURS, SEED_SERVICES, SEED_SETTINGS } from "@/data/seed";
import { isSupabaseConfigured, supabase } from "./supabase";
import { addDays, toDateKey, toHHMM, toMinutes, uid } from "./utils";

/* ------------------------------------------------------------------ *
 * Couche d'acces aux donnees.
 * Deux implementations derriere la meme interface :
 *   - supabaseDb : la vraie base, avec RLS
 *   - demoDb     : localStorage, pour developper et demontrer sans backend
 * Le reste de l'app ne sait pas laquelle est active.
 * ------------------------------------------------------------------ */

export interface Db {
  isDemo: boolean;
  listServices(includeInactive?: boolean): Promise<Service[]>;
  saveService(s: Service): Promise<void>;
  deleteService(id: string): Promise<void>;
  listBarbers(includeInactive?: boolean): Promise<Barber[]>;
  saveBarber(b: Barber): Promise<void>;
  deleteBarber(id: string): Promise<void>;
  listOpeningHours(): Promise<OpeningHour[]>;
  saveOpeningHour(h: OpeningHour): Promise<void>;
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  listBookings(fromDate: string, toDate: string): Promise<Booking[]>;
  /** Creneaux occupes, sans donnee personnelle. Utilise par le formulaire public. */
  listBusy(fromDate: string, toDate: string): Promise<BusySlot[]>;
  createBooking(input: NewBookingInput): Promise<Booking>;
  updateBooking(id: string, patch: Partial<Booking>): Promise<void>;
  deleteBooking(id: string): Promise<void>;
  listBlocked(fromDate: string, toDate: string): Promise<BlockedSlot[]>;
  createBlocked(b: Omit<BlockedSlot, "id">): Promise<BlockedSlot>;
  deleteBlocked(id: string): Promise<void>;
}

const STORE_KEY = "delherren_demo_v2";

interface DemoStore {
  services: Service[];
  barbers: Barber[];
  openingHours: OpeningHour[];
  settings: Settings;
  bookings: Booking[];
  blocked: BlockedSlot[];
}

function demoBookings(services: Service[]): Booking[] {
  const today = new Date();
  const rows: [number, string, string, string, string, Booking["status"]][] = [
    [0, "10:00", "svc-haircut", "brb-ali", "Lukas Berger", "confirmed"],
    [0, "11:30", "svc-cutbeard", "brb-mehmet", "Deniz Yilmaz", "confirmed"],
    [0, "14:00", "svc-shave", "brb-serkan", "Marco Huber", "pending"],
    [0, "16:15", "svc-haircut", "brb-ali", "Stefan Novak", "confirmed"],
    [1, "09:30", "svc-beard", "brb-mehmet", "Ahmet Kaya", "confirmed"],
    [1, "13:00", "svc-razorcut", "brb-ali", "Philipp Wagner", "confirmed"],
    [2, "15:00", "svc-kids", "brb-serkan", "Familie Gruber", "pending"],
    [3, "17:30", "svc-cutbeard", "brb-ali", "Onur Demir", "confirmed"],
  ];
  return rows.map(([offset, time, serviceId, barberId, name, status], i) => {
    const service = services.find((s) => s.id === serviceId)!;
    const date = addDays(today, offset);
    const booking: Booking = {
      id: `bkg-demo-${i}`,
      barber_id: barberId,
      service_id: serviceId,
      booking_date: toDateKey(date),
      start_time: time,
      end_time: toHHMM(toMinutes(time) + service.duration_min),
      duration_min: service.duration_min,
      price: service.price,
      status,
      client_name: name,
      client_email: `${name.split(" ")[0].toLowerCase()}@example.at`,
      client_phone: "+43 660 0000000",
      notes: "",
      language: "de",
      created_at: new Date().toISOString(),
    };
    return booking;
  });
}

function freshStore(): DemoStore {
  return {
    services: structuredClone(SEED_SERVICES),
    barbers: structuredClone(SEED_BARBERS),
    openingHours: structuredClone(SEED_OPENING_HOURS),
    settings: structuredClone(SEED_SETTINGS),
    bookings: demoBookings(SEED_SERVICES),
    blocked: [],
  };
}

function readStore(): DemoStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      const seeded = freshStore();
      localStorage.setItem(STORE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as DemoStore;
  } catch {
    return freshStore();
  }
}

function writeStore(store: DemoStore) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* quota depasse ou navigation privee : on continue en memoire */
  }
}

function mutate(fn: (s: DemoStore) => void) {
  const store = readStore();
  fn(store);
  writeStore(store);
}

const inRange = (date: string, from: string, to: string) => date >= from && date <= to;

const demoDb: Db = {
  isDemo: true,
  async listServices(includeInactive = false) {
    const all = readStore().services.sort((a, b) => a.sort_order - b.sort_order);
    return includeInactive ? all : all.filter((s) => s.active);
  },
  async saveService(s) {
    mutate((store) => {
      const i = store.services.findIndex((x) => x.id === s.id);
      if (i >= 0) store.services[i] = s;
      else store.services.push(s);
    });
  },
  async deleteService(id) {
    mutate((store) => {
      store.services = store.services.filter((s) => s.id !== id);
    });
  },
  async listBarbers(includeInactive = false) {
    const all = readStore().barbers.sort((a, b) => a.sort_order - b.sort_order);
    return includeInactive ? all : all.filter((b) => b.active);
  },
  async saveBarber(b) {
    mutate((store) => {
      const i = store.barbers.findIndex((x) => x.id === b.id);
      if (i >= 0) store.barbers[i] = b;
      else store.barbers.push(b);
    });
  },
  async deleteBarber(id) {
    mutate((store) => {
      store.barbers = store.barbers.filter((b) => b.id !== id);
    });
  },
  async listOpeningHours() {
    return readStore().openingHours;
  },
  async saveOpeningHour(h) {
    mutate((store) => {
      const i = store.openingHours.findIndex((x) => x.weekday === h.weekday);
      if (i >= 0) store.openingHours[i] = h;
      else store.openingHours.push(h);
    });
  },
  async getSettings() {
    return readStore().settings;
  },
  async saveSettings(s) {
    mutate((store) => {
      store.settings = s;
    });
  },
  async listBookings(from, to) {
    return readStore()
      .bookings.filter((b) => inRange(b.booking_date, from, to))
      .sort((a, b) => (a.booking_date + a.start_time).localeCompare(b.booking_date + b.start_time));
  },
  async listBusy(from, to) {
    return readStore()
      .bookings.filter((b) => inRange(b.booking_date, from, to) && b.status !== "cancelled")
      .map(({ barber_id, booking_date, start_time, end_time }) => ({
        barber_id,
        booking_date,
        start_time,
        end_time,
      }));
  },
  async createBooking(input) {
    const store = readStore();
    const service = store.services.find((s) => s.id === input.service_id);
    if (!service) throw new Error("SERVICE_NOT_FOUND");

    const start = toMinutes(input.start_time);
    const end = start + service.duration_min;

    const conflicts = (barberId: string) => {
      const bookingClash = store.bookings.some(
        (b) =>
          b.booking_date === input.booking_date &&
          b.barber_id === barberId &&
          b.status !== "cancelled" &&
          start < toMinutes(b.end_time) &&
          toMinutes(b.start_time) < end,
      );
      if (bookingClash) return true;
      return store.blocked.some((blk) => {
        if (blk.date !== input.booking_date) return false;
        if (blk.barber_id && blk.barber_id !== barberId) return false;
        const bs = blk.all_day ? 0 : toMinutes(blk.start_time);
        const be = blk.all_day ? 1440 : toMinutes(blk.end_time);
        return start < be && bs < end;
      });
    };

    // Meme regle que l'Edge Function : "egal wer" est resolu en un barbier
    // concret, sinon rien ne protege reellement le creneau.
    let barberId = input.barber_id;
    if (barberId) {
      if (conflicts(barberId)) throw new Error("SLOT_TAKEN");
    } else {
      const free = store.barbers.filter((b) => b.active).find((b) => !conflicts(b.id));
      if (!free) throw new Error("SLOT_TAKEN");
      barberId = free.id;
    }

    const booking: Booking = {
      id: uid("bkg"),
      barber_id: barberId,
      service_id: input.service_id,
      booking_date: input.booking_date,
      start_time: input.start_time,
      end_time: toHHMM(end),
      duration_min: service.duration_min,
      price: service.price,
      status: store.settings.auto_confirm ? "confirmed" : "pending",
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone,
      notes: input.notes,
      language: input.language,
      created_at: new Date().toISOString(),
    };
    store.bookings.push(booking);
    writeStore(store);
    return booking;
  },
  async updateBooking(id, patch) {
    mutate((store) => {
      const i = store.bookings.findIndex((b) => b.id === id);
      if (i >= 0) store.bookings[i] = { ...store.bookings[i], ...patch };
    });
  },
  async deleteBooking(id) {
    mutate((store) => {
      store.bookings = store.bookings.filter((b) => b.id !== id);
    });
  },
  async listBlocked(from, to) {
    return readStore().blocked.filter((b) => inRange(b.date, from, to));
  },
  async createBlocked(b) {
    const row: BlockedSlot = { ...b, id: uid("blk") };
    mutate((store) => {
      store.blocked.push(row);
    });
    return row;
  },
  async deleteBlocked(id) {
    mutate((store) => {
      store.blocked = store.blocked.filter((b) => b.id !== id);
    });
  },
};

/* ------------------------------ Supabase ------------------------------ */

function sb() {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

const supabaseDb: Db = {
  isDemo: false,
  async listServices(includeInactive = false) {
    let q = sb().from("services").select("*").order("sort_order");
    if (!includeInactive) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as Service[];
  },
  async saveService(s) {
    const { error } = await sb().from("services").upsert(s);
    if (error) throw new Error(error.message);
  },
  async deleteService(id) {
    const { error } = await sb().from("services").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
  async listBarbers(includeInactive = false) {
    let q = sb().from("barbers").select("*").order("sort_order");
    if (!includeInactive) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as Barber[];
  },
  async saveBarber(b) {
    const { error } = await sb().from("barbers").upsert(b);
    if (error) throw new Error(error.message);
  },
  async deleteBarber(id) {
    const { error } = await sb().from("barbers").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
  async listOpeningHours() {
    const { data, error } = await sb().from("opening_hours").select("*").order("weekday");
    if (error) throw new Error(error.message);
    return (data ?? []) as OpeningHour[];
  },
  async saveOpeningHour(h) {
    const { error } = await sb().from("opening_hours").upsert(h, { onConflict: "weekday" });
    if (error) throw new Error(error.message);
  },
  async getSettings() {
    const { data, error } = await sb().from("settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Settings) ?? SEED_SETTINGS;
  },
  async saveSettings(s) {
    const { error } = await sb().from("settings").upsert({ ...s, id: 1 });
    if (error) throw new Error(error.message);
  },
  async listBookings(from, to) {
    const { data, error } = await sb()
      .from("bookings")
      .select("*")
      .gte("booking_date", from)
      .lte("booking_date", to)
      .order("booking_date")
      .order("start_time");
    if (error) throw new Error(error.message);
    return (data ?? []) as Booking[];
  },
  async listBusy(from, to) {
    const { data, error } = await sb().rpc("public_busy_slots", { p_from: from, p_to: to });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: Record<string, string>) => ({
      barber_id: r.barber_id ?? null,
      booking_date: r.booking_date,
      start_time: String(r.start_time).slice(0, 5),
      end_time: String(r.end_time).slice(0, 5),
    })) as BusySlot[];
  },
  async createBooking(input) {
    // Passage obligatoire par l'Edge Function : elle valide le creneau cote
    // serveur, ecrit avec la service role, puis notifie Telegram et Resend.
    const { data, error } = await sb().functions.invoke("create-booking", { body: input });
    if (error) throw new Error(error.message);
    const payload = data as { error?: string; booking?: Booking };
    if (payload?.error) throw new Error(payload.error);
    if (!payload?.booking) throw new Error("BOOKING_FAILED");
    return payload.booking;
  },
  async updateBooking(id, patch) {
    const { error } = await sb().from("bookings").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
  },
  async deleteBooking(id) {
    const { error } = await sb().from("bookings").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
  async listBlocked(from, to) {
    const { data, error } = await sb()
      .from("blocked_slots")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date");
    if (error) throw new Error(error.message);
    return (data ?? []) as BlockedSlot[];
  },
  async createBlocked(b) {
    const { data, error } = await sb().from("blocked_slots").insert(b).select().single();
    if (error) throw new Error(error.message);
    return data as BlockedSlot;
  },
  async deleteBlocked(id) {
    const { error } = await sb().from("blocked_slots").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

export const db: Db = isSupabaseConfigured ? supabaseDb : demoDb;

export function resetDemoData() {
  localStorage.removeItem(STORE_KEY);
}
