import type {
  AdminAccount, AdminBookingInput, Barber, BarberAbsence, BarberHour, BlockedSlot, Booking,
  BusySlot, ManagedBooking, NewBookingInput, OpeningHour,
  ReschedulePatch, Service, Settings,
} from "@/data/types";
import {
  SEED_ADMIN, SEED_BARBER_HOURS, SEED_BARBERS, SEED_OPENING_HOURS, SEED_SERVICES,
  SEED_SETTINGS,
} from "@/data/seed";
import { isSupabaseConfigured, supabase } from "./supabase";
import { canSelfCancel } from "./pricing";
import { workWindow } from "./slots";
import { addDays, fromDateKey, toDateKey, toHHMM, toMinutes, uid } from "./utils";

/* ------------------------------------------------------------------ *
 * Couche d'acces aux donnees.
 * Deux implementations derriere la meme interface :
 *   - supabaseDb : la vraie base, avec RLS et Edge Functions
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

  /** Horaires propres a chaque barbier. Public : aucune donnee personnelle. */
  listBarberHours(): Promise<BarberHour[]>;
  saveBarberHours(barberId: string, hours: BarberHour[]): Promise<void>;

  /** Conges. Le motif n'est renvoye qu'aux admins. */
  listAbsences(fromDate: string, toDate: string): Promise<BarberAbsence[]>;
  createAbsence(a: Omit<BarberAbsence, "id">): Promise<BarberAbsence>;
  deleteAbsence(id: string): Promise<void>;

  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;

  listBookings(fromDate: string, toDate: string): Promise<Booking[]>;
  /** Creneaux occupes, sans donnee personnelle. Utilise par le formulaire public. */
  listBusy(fromDate: string, toDate: string): Promise<BusySlot[]>;
  createBooking(input: NewBookingInput): Promise<Booking>;
  /** Saisie par le salon : telephone, walk-in. Pas de delai minimum, pas d'e-mail. */
  createAdminBooking(input: AdminBookingInput): Promise<Booking>;
  updateBooking(id: string, patch: Partial<Booking>): Promise<void>;
  /** Deplacement par le salon. Le client est prevenu par e-mail cote Supabase. */
  rescheduleBooking(id: string, patch: ReschedulePatch): Promise<void>;
  /** Annulation par le salon, avec e-mail au client cote Supabase. */
  cancelBooking(id: string): Promise<void>;
  deleteBooking(id: string): Promise<void>;

  /** Lien de gestion du client : lecture limitee, puis annulation si le delai le permet. */
  getManagedBooking(token: string): Promise<ManagedBooking | null>;
  cancelByToken(token: string): Promise<void>;

  listBlocked(fromDate: string, toDate: string): Promise<BlockedSlot[]>;
  createBlocked(b: Omit<BlockedSlot, "id">): Promise<BlockedSlot>;
  deleteBlocked(id: string): Promise<void>;

  /** Notes libres du salon par client (cle = telephone normalise). */
  listClientNotes(): Promise<Record<string, string>>;
  saveClientNote(key: string, name: string, note: string): Promise<void>;
  /** Passe en "done" les rendez-vous confirmes dont l'heure est passee. Renvoie le nombre. */
  closePastBookings(): Promise<number>;

  listAdmins(): Promise<AdminAccount[]>;
  createAdmin(input: { email: string; name: string; password: string }): Promise<void>;
  deleteAdmin(id: string): Promise<void>;
  /** Mode demo uniquement : en production c'est Supabase Auth qui valide. */
  verifyDemoLogin(email: string, password: string): Promise<AdminAccount | null>;

  /** Notifie le dashboard quand une reservation change. Renvoie la fonction de desabonnement. */
  subscribeBookings(onChange: () => void): () => void;
}

/* ================================ DEMO ================================ */

const STORE_KEY = "delherren_demo_v5";

interface DemoAdmin extends AdminAccount {
  password: string;
}

interface DemoStore {
  services: Service[];
  barbers: Barber[];
  openingHours: OpeningHour[];
  barberHours: BarberHour[];
  absences: BarberAbsence[];
  settings: Settings;
  bookings: Booking[];
  blocked: BlockedSlot[];
  clientNotes: Record<string, string>;
  admins: DemoAdmin[];
}

const token = () => uid("tok") + Math.random().toString(36).slice(2, 10);

/**
 * Deux semaines et demie de rendez-vous de demonstration, pour que le
 * Tagesplan, les statistiques et les fiches clients aient quelque chose a
 * montrer. Respecte le dimanche ferme, le mardi de Del et le mercredi de
 * Mustafa. Le passe est "erledigt" (avec deux no-shows), le futur "bestaetigt"
 * (avec quelques "offen").
 */
function demoBookings(services: Service[]): Booking[] {
  const today = new Date();
  const names = [
    "Lukas Berger", "Deniz Yilmaz", "Marco Huber", "Stefan Novak", "Ahmet Kaya", "Philipp Wagner",
    "Familie Gruber", "Onur Demir", "Jonas Maier", "Paul Steiner", "Daniel Hofer", "Emre Sahin",
    "Florian Bauer", "Tobias Leitner", "Kerem Aydin", "Michael Pichler", "Sebastian Wolf",
    "Amir Hassan", "Nikolaus Auer", "David Schmid", "Yusuf Koc", "Matthias Egger", "Adrian Mandic",
    "Samir Nasser", "Georg Steiner",
  ];
  // Combinaisons de prestations, dans l'esprit de ce qui se vend vraiment.
  const combos: string[][] = [
    ["svc-cut-style"], ["svc-cut-style"], ["svc-cut-wash-style"], ["svc-machine"],
    ["svc-cut-style", "svc-beardshave"], ["svc-cut-wash-style", "svc-modelshave"],
    ["svc-kids"], ["svc-headshave", "svc-beardshave"], ["svc-wash-cut-color"],
    ["svc-cut-style", "svc-brows"], ["svc-modelshave"], ["svc-beardcolor"],
  ];
  const starts = [["09:00", "10:15", "11:30", "14:00", "15:30", "17:00"], ["09:30", "11:00", "13:00", "14:45", "16:15", "17:45"]];
  const barbers = ["brb-del", "brb-mustafa"];
  const offDay: Record<string, number> = { "brb-del": 2, "brb-mustafa": 3 };

  const out: Booking[] = [];
  let n = 0;
  for (let offset = -8; offset <= 10; offset++) {
    const date = addDays(today, offset);
    if (date.getDay() === 0) continue;
    barbers.forEach((barberId, bi) => {
      if (date.getDay() === offDay[barberId]) return;
      // Entre 2 et 4 rendez-vous par barbier et par jour, plus dense en fin de semaine.
      const count = 2 + ((((offset + bi + date.getDay()) % 3) + 3) % 3);
      for (let k = 0; k < count; k++) {
        const combo = combos[(n + k) % combos.length]
          .map((id) => services.find((x) => x.id === id))
          .filter((x): x is Service => Boolean(x));
        if (combo.length === 0) continue;
        const time = starts[bi][(k * 2 + offset + 20) % starts[bi].length];
        const duration = combo.reduce((sum, x) => sum + x.duration_min, 0);
        const price = combo.reduce((sum, x) => sum + x.price, 0);
        const name = names[n % names.length];
        const past = offset < 0;
        const status: Booking["status"] = past
          ? (n % 9 === 4 ? "no_show" : "done")
          : (offset > 4 && n % 6 === 1 ? "pending" : "confirmed");
        out.push({
          id: `bkg-demo-${n}`,
          barber_id: barberId,
          service_ids: combo.map((x) => x.id),
          booking_date: toDateKey(date),
          start_time: time,
          end_time: toHHMM(toMinutes(time) + duration),
          duration_min: duration,
          price,
          status,
          source: n % 5 === 0 ? "admin" : "online",
          client_name: name,
          client_email: `${name.split(" ")[0].toLowerCase()}@example.at`,
          client_phone: `+43 660 1${String(100000 + (n % names.length) * 7919).slice(-6)}`,
          notes: n % 7 === 3 ? "Fade auf 3 mm, wie beim letzten Mal" : "",
          language: "de",
          manage_token: `demo-token-${n}`,
          cancelled_at: null,
          reminder_sent_24h: past,
          reminder_sent_2h: past,
          followup_sent: past,
          created_at: addDays(date, -3).toISOString(),
        });
        n++;
      }
    });
  }
  // Eviter deux rendez-vous du meme barbier qui se chevauchent le meme jour.
  return out.filter((bk, i) =>
    !out.slice(0, i).some(
      (o) =>
        o.barber_id === bk.barber_id &&
        o.booking_date === bk.booking_date &&
        toMinutes(bk.start_time) < toMinutes(o.end_time) &&
        toMinutes(o.start_time) < toMinutes(bk.end_time),
    ),
  );
}

function freshStore(): DemoStore {
  return {
    services: structuredClone(SEED_SERVICES),
    barbers: structuredClone(SEED_BARBERS),
    openingHours: structuredClone(SEED_OPENING_HOURS),
    barberHours: structuredClone(SEED_BARBER_HOURS),
    absences: [],
    settings: structuredClone(SEED_SETTINGS),
    bookings: demoBookings(SEED_SERVICES),
    blocked: [],
    clientNotes: { "436601100000": "Fade auf 3 mm, links etwas kürzer." },
    admins: [
      {
        id: "adm-owner",
        email: SEED_ADMIN.email,
        name: SEED_ADMIN.name,
        password: SEED_ADMIN.password,
        created_at: new Date().toISOString(),
      },
    ],
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
    const parsed = JSON.parse(raw) as Partial<DemoStore>;
    const base = freshStore();
    return {
      ...base,
      ...parsed,
      admins: parsed.admins && parsed.admins.length > 0 ? parsed.admins : base.admins,
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
    };
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

const strip = (a: DemoAdmin): AdminAccount => ({
  id: a.id,
  email: a.email,
  name: a.name,
  created_at: a.created_at,
});

/**
 * Meme regle que l'Edge Function : un barbier est en conflit si un autre
 * rendez-vous actif ou un blocage recouvre l'intervalle demande, ou si le
 * creneau sort de sa plage de travail.
 */
function demoConflicts(
  store: DemoStore,
  barberId: string,
  date: string,
  start: number,
  end: number,
  ignoreBookingId?: string,
): "SLOT_TAKEN" | "OUTSIDE_HOURS" | null {
  const window = workWindow(
    fromDateKey(date), barberId, store.openingHours, store.barberHours, store.absences,
  );
  if (!window || start < window[0] || end > window[1]) return "OUTSIDE_HOURS";

  const buffer = store.settings.buffer_after_min;
  const bookingClash = store.bookings.some(
    (b) =>
      b.id !== ignoreBookingId &&
      b.booking_date === date &&
      b.barber_id === barberId &&
      b.status !== "cancelled" &&
      start < toMinutes(b.end_time) + buffer &&
      toMinutes(b.start_time) < end,
  );
  if (bookingClash) return "SLOT_TAKEN";

  const blockClash = store.blocked.some((blk) => {
    if (blk.date !== date) return false;
    if (blk.barber_id && blk.barber_id !== barberId) return false;
    const bs = blk.all_day ? 0 : toMinutes(blk.start_time);
    const be = blk.all_day ? 1440 : toMinutes(blk.end_time);
    return start < be && bs < end;
  });
  return blockClash ? "SLOT_TAKEN" : null;
}

function pickServices(store: DemoStore, ids: string[]): Service[] {
  const picked = ids
    .map((id) => store.services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));
  if (picked.length === 0) throw new Error("SERVICE_NOT_FOUND");
  return picked;
}

function managedView(store: DemoStore, b: Booking): ManagedBooking {
  const picked = b.service_ids
    .map((id) => store.services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));
  return {
    booking_date: b.booking_date,
    start_time: b.start_time,
    end_time: b.end_time,
    duration_min: b.duration_min,
    price: b.price,
    status: b.status,
    client_name: b.client_name,
    barber_name: store.barbers.find((x) => x.id === b.barber_id)?.name ?? "",
    service_names_de: picked.map((s) => s.name_de),
    service_names_en: picked.map((s) => s.name_en || s.name_de),
    service_ids: picked.map((s) => s.id),
    barber_id: b.barber_id,
    cancel_deadline_hours: store.settings.cancel_deadline_hours,
  };
}

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
      store.barberHours = store.barberHours.filter((h) => h.barber_id !== id);
      store.absences = store.absences.filter((a) => a.barber_id !== id);
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

  async listBarberHours() {
    return readStore().barberHours;
  },
  async saveBarberHours(barberId, hours) {
    mutate((store) => {
      store.barberHours = [
        ...store.barberHours.filter((h) => h.barber_id !== barberId),
        ...hours.map((h) => ({ ...h, barber_id: barberId })),
      ];
    });
  },

  async listAbsences(from, to) {
    return readStore().absences.filter((a) => a.start_date <= to && a.end_date >= from);
  },
  async createAbsence(a) {
    const row: BarberAbsence = { ...a, id: uid("abs") };
    mutate((store) => {
      store.absences.push(row);
    });
    return row;
  },
  async deleteAbsence(id) {
    mutate((store) => {
      store.absences = store.absences.filter((a) => a.id !== id);
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
    const picked = pickServices(store, input.service_ids);
    const duration = picked.reduce((sum, s) => sum + s.duration_min, 0);
    const price = picked.reduce((sum, s) => sum + s.price, 0);
    const start = toMinutes(input.start_time);
    const end = start + duration;

    // "Egal wer" est resolu en un barbier concret, sinon rien ne protege
    // reellement le creneau.
    let barberId = input.barber_id;
    if (barberId) {
      const problem = demoConflicts(store, barberId, input.booking_date, start, end);
      if (problem) throw new Error(problem);
    } else {
      const free = store.barbers
        .filter((b) => b.active)
        .find((b) => !demoConflicts(store, b.id, input.booking_date, start, end));
      if (!free) throw new Error("SLOT_TAKEN");
      barberId = free.id;
    }

    // Deuxieme personne : son rendez-vous commence quand le premier finit,
    // chez le meme barbier. Verifie avant d'ecrire quoi que ce soit.
    let secondPicked: Service[] = [];
    if (input.second && input.second.service_ids.length > 0) {
      secondPicked = pickServices(store, input.second.service_ids);
      const d2 = secondPicked.reduce((sum, s) => sum + s.duration_min, 0);
      const problem2 = demoConflicts(store, barberId, input.booking_date, end, end + d2);
      if (problem2) throw new Error(problem2);
    }

    const status = store.settings.auto_confirm ? "confirmed" : "pending";
    const now = new Date().toISOString();
    const booking: Booking = {
      id: uid("bkg"),
      barber_id: barberId,
      service_ids: picked.map((s) => s.id),
      booking_date: input.booking_date,
      start_time: input.start_time,
      end_time: toHHMM(end),
      duration_min: duration,
      price,
      status,
      source: "online",
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone,
      notes: input.notes,
      language: input.language,
      manage_token: token(),
      cancelled_at: null,
      reminder_sent_24h: false,
      reminder_sent_2h: false,
      followup_sent: false,
      created_at: now,
    };
    store.bookings.push(booking);

    if (secondPicked.length > 0 && input.second) {
      const d2 = secondPicked.reduce((sum, s) => sum + s.duration_min, 0);
      store.bookings.push({
        ...booking,
        id: uid("bkg"),
        service_ids: secondPicked.map((s) => s.id),
        start_time: toHHMM(end),
        end_time: toHHMM(end + d2),
        duration_min: d2,
        price: secondPicked.reduce((sum, s) => sum + s.price, 0),
        client_name: input.second.client_name,
        notes: `${input.language === "en" ? "Booked together with" : "Gemeinsam gebucht mit"} ${input.client_name}`,
        manage_token: token(),
      });
    }

    writeStore(store);
    return booking;
  },

  async createAdminBooking(input) {
    const store = readStore();
    const picked = pickServices(store, input.service_ids);
    const duration = picked.reduce((sum, s) => sum + s.duration_min, 0);
    const price = picked.reduce((sum, s) => sum + s.price, 0);
    const start = toMinutes(input.start_time);
    const end = start + duration;

    const problem = demoConflicts(store, input.barber_id, input.booking_date, start, end);
    if (problem === "SLOT_TAKEN") throw new Error(problem);

    const booking: Booking = {
      id: uid("bkg"),
      barber_id: input.barber_id,
      service_ids: picked.map((s) => s.id),
      booking_date: input.booking_date,
      start_time: input.start_time,
      end_time: toHHMM(end),
      duration_min: duration,
      price,
      status: input.status,
      source: "admin",
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone,
      notes: input.notes,
      language: "de",
      manage_token: token(),
      cancelled_at: null,
      reminder_sent_24h: false,
      reminder_sent_2h: false,
      followup_sent: false,
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

  async rescheduleBooking(id, patch) {
    const store = readStore();
    const i = store.bookings.findIndex((b) => b.id === id);
    if (i < 0) throw new Error("NOT_FOUND");
    const start = toMinutes(patch.start_time);
    const end = start + patch.duration_min;
    const problem = demoConflicts(store, patch.barber_id, patch.booking_date, start, end, id);
    if (problem === "SLOT_TAKEN") throw new Error(problem);
    store.bookings[i] = {
      ...store.bookings[i],
      barber_id: patch.barber_id,
      booking_date: patch.booking_date,
      start_time: patch.start_time,
      end_time: toHHMM(end),
      duration_min: patch.duration_min,
      // Un rendez-vous deplace redevient a rappeler.
      reminder_sent_24h: false,
      reminder_sent_2h: false,
    };
    writeStore(store);
  },

  async cancelBooking(id) {
    mutate((store) => {
      const i = store.bookings.findIndex((b) => b.id === id);
      if (i >= 0) {
        store.bookings[i] = {
          ...store.bookings[i],
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        };
      }
    });
  },

  async deleteBooking(id) {
    mutate((store) => {
      store.bookings = store.bookings.filter((b) => b.id !== id);
    });
  },

  async getManagedBooking(tok) {
    const store = readStore();
    const b = store.bookings.find((x) => x.manage_token === tok);
    return b ? managedView(store, b) : null;
  },

  async cancelByToken(tok) {
    const store = readStore();
    const i = store.bookings.findIndex((x) => x.manage_token === tok);
    if (i < 0) throw new Error("NOT_FOUND");
    const b = store.bookings[i];
    if (b.status === "cancelled") throw new Error("ALREADY_CANCELLED");
    if (!canSelfCancel(b.booking_date, b.start_time, store.settings.cancel_deadline_hours)) {
      throw new Error("TOO_LATE");
    }
    store.bookings[i] = { ...b, status: "cancelled", cancelled_at: new Date().toISOString() };
    writeStore(store);
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

  async listClientNotes() {
    return readStore().clientNotes ?? {};
  },
  async saveClientNote(key, _name, note) {
    mutate((store) => {
      store.clientNotes = { ...(store.clientNotes ?? {}), [key]: note };
      if (!note.trim()) delete store.clientNotes[key];
    });
  },
  async closePastBookings() {
    const now = new Date();
    const today = toDateKey(now);
    const minutes = now.getHours() * 60 + now.getMinutes();
    let count = 0;
    mutate((store) => {
      store.bookings = store.bookings.map((b) => {
        const past =
          b.booking_date < today ||
          (b.booking_date === today && toMinutes(b.end_time) <= minutes);
        if (b.status === "confirmed" && past) {
          count++;
          return { ...b, status: "done" as const };
        }
        return b;
      });
    });
    return count;
  },

  async listAdmins() {
    return readStore().admins.map(strip);
  },
  async createAdmin({ email, name, password }) {
    mutate((store) => {
      const normalized = email.trim().toLowerCase();
      const existing = store.admins.find((a) => a.email === normalized);
      if (existing) {
        existing.name = name;
        if (password) existing.password = password;
        return;
      }
      store.admins.push({
        id: uid("adm"),
        email: normalized,
        name,
        password,
        created_at: new Date().toISOString(),
      });
    });
  },
  async deleteAdmin(id) {
    mutate((store) => {
      // On ne laisse jamais le dashboard sans aucun compte.
      if (store.admins.length <= 1) return;
      store.admins = store.admins.filter((a) => a.id !== id);
    });
  },
  async verifyDemoLogin(email, password) {
    const found = readStore().admins.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password,
    );
    return found ? strip(found) : null;
  },

  subscribeBookings(onChange) {
    // En demo, seule une autre fenetre du meme navigateur peut modifier le
    // store : l'evenement storage suffit pour rafraichir le dashboard.
    const handler = (e: StorageEvent) => {
      if (e.key === STORE_KEY) onChange();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};

/* ============================== SUPABASE ============================== */

function sb() {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

interface BookingRow extends Omit<Booking, "service_ids" | "price"> {
  price: number | string;
  booking_services?: { service_id: string; position?: number }[] | null;
}

function mapBooking(row: BookingRow): Booking {
  const { booking_services, ...rest } = row;
  const lines = [...(booking_services ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return {
    ...rest,
    price: Number(row.price),
    start_time: String(row.start_time).slice(0, 5),
    end_time: String(row.end_time).slice(0, 5),
    service_ids: lines.map((s) => s.service_id),
  };
}

const hhmm = (v: unknown) => String(v ?? "").slice(0, 5);

/** Erreur Postgres 23P01 = contrainte d'exclusion : le creneau vient d'etre pris. */
function mapPgError(error: { code?: string; message: string }): Error {
  return new Error(error.code === "23P01" ? "SLOT_TAKEN" : error.message);
}

const supabaseDb: Db = {
  isDemo: false,

  async listServices(includeInactive = false) {
    let q = sb().from("services").select("*").order("sort_order");
    if (!includeInactive) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Service[]).map((s) => ({ ...s, price: Number(s.price) }));
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
    return ((data ?? []) as OpeningHour[]).map((h) => ({
      ...h,
      open_time: hhmm(h.open_time),
      close_time: hhmm(h.close_time),
    }));
  },
  async saveOpeningHour(h) {
    const { error } = await sb().from("opening_hours").upsert(h, { onConflict: "weekday" });
    if (error) throw new Error(error.message);
  },

  async listBarberHours() {
    const { data, error } = await sb().from("barber_hours").select("*");
    if (error) throw new Error(error.message);
    return ((data ?? []) as BarberHour[]).map((h) => ({
      ...h,
      start_time: hhmm(h.start_time),
      end_time: hhmm(h.end_time),
    }));
  },
  async saveBarberHours(barberId, hours) {
    const client = sb();
    const { error: delError } = await client.from("barber_hours").delete().eq("barber_id", barberId);
    if (delError) throw new Error(delError.message);
    if (hours.length === 0) return;
    const { error } = await client
      .from("barber_hours")
      .insert(hours.map((h) => ({ ...h, barber_id: barberId })));
    if (error) throw new Error(error.message);
  },

  async listAbsences(from, to) {
    // Fonction SECURITY DEFINER : le motif n'est renvoye qu'aux admins.
    const { data, error } = await sb().rpc("list_absences", { p_from: from, p_to: to });
    if (error) throw new Error(error.message);
    return (data ?? []) as BarberAbsence[];
  },
  async createAbsence(a) {
    const { data, error } = await sb().from("barber_absences").insert(a).select().single();
    if (error) throw new Error(error.message);
    return data as BarberAbsence;
  },
  async deleteAbsence(id) {
    const { error } = await sb().from("barber_absences").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async getSettings() {
    const { data, error } = await sb().from("settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return { ...SEED_SETTINGS, ...((data as Partial<Settings>) ?? {}) };
  },
  async saveSettings(s) {
    const { error } = await sb().from("settings").upsert({ ...s, id: 1 });
    if (error) throw new Error(error.message);
  },

  async listBookings(from, to) {
    const { data, error } = await sb()
      .from("bookings")
      .select("*, booking_services(service_id, position)")
      .gte("booking_date", from)
      .lte("booking_date", to)
      .order("booking_date")
      .order("start_time");
    if (error) throw new Error(error.message);
    return ((data ?? []) as BookingRow[]).map(mapBooking);
  },
  async listBusy(from, to) {
    const { data, error } = await sb().rpc("public_busy_slots", { p_from: from, p_to: to });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, string>[]).map((r) => ({
      barber_id: r.barber_id ?? null,
      booking_date: r.booking_date,
      start_time: hhmm(r.start_time),
      end_time: hhmm(r.end_time),
    }));
  },

  async createBooking(input) {
    // Passage obligatoire par l'Edge Function : elle valide le creneau cote
    // serveur, ecrit avec la service role, puis notifie Telegram et Resend.
    const { data, error } = await sb().functions.invoke("create-booking", { body: input });
    if (error) throw new Error(error.message);
    const payload = data as { error?: string; booking?: BookingRow };
    if (payload?.error) throw new Error(payload.error);
    if (!payload?.booking) throw new Error("BOOKING_FAILED");
    return mapBooking(payload.booking);
  },

  async createAdminBooking(input) {
    // L'admin ecrit directement, sous RLS. Duree et prix sont recalcules
    // depuis la table services, comme dans l'Edge Function.
    const client = sb();
    const { data: services, error: svcError } = await client
      .from("services")
      .select("id, duration_min, price")
      .in("id", input.service_ids);
    if (svcError) throw new Error(svcError.message);
    if (!services || services.length === 0) throw new Error("SERVICE_NOT_FOUND");

    const duration = services.reduce((sum, s) => sum + s.duration_min, 0);
    const price = services.reduce((sum, s) => sum + Number(s.price), 0);
    const end = toHHMM(toMinutes(input.start_time) + duration);

    const { data: booking, error } = await client
      .from("bookings")
      .insert({
        barber_id: input.barber_id,
        booking_date: input.booking_date,
        start_time: input.start_time,
        end_time: end,
        duration_min: duration,
        price,
        status: input.status,
        source: "admin",
        client_name: input.client_name,
        client_email: input.client_email || "walkin@delherren.local",
        client_phone: input.client_phone || "000000",
        notes: input.notes,
        language: "de",
      })
      .select()
      .single();
    if (error) throw mapPgError(error);

    const { error: linesError } = await client.from("booking_services").insert(
      input.service_ids.map((service_id, position) => ({ booking_id: booking.id, service_id, position })),
    );
    if (linesError) {
      await client.from("bookings").delete().eq("id", booking.id);
      throw new Error(linesError.message);
    }
    return mapBooking({
      ...(booking as BookingRow),
      booking_services: input.service_ids.map((service_id, position) => ({ service_id, position })),
    });
  },

  async updateBooking(id, patch) {
    const { service_ids, ...rest } = patch;
    void service_ids;
    const { error } = await sb().from("bookings").update(rest).eq("id", id);
    if (error) throw mapPgError(error);
  },

  async rescheduleBooking(id, patch) {
    const end = toHHMM(toMinutes(patch.start_time) + patch.duration_min);
    const { error } = await sb()
      .from("bookings")
      .update({
        barber_id: patch.barber_id,
        booking_date: patch.booking_date,
        start_time: patch.start_time,
        end_time: end,
        duration_min: patch.duration_min,
        reminder_sent_24h: false,
        reminder_sent_2h: false,
      })
      .eq("id", id);
    if (error) throw mapPgError(error);
    // Le client est prevenu. Si l'e-mail echoue, le deplacement reste valide.
    await sb().functions.invoke("send-booking-update", {
      body: { booking_id: id, kind: "rescheduled" },
    }).catch(() => undefined);
  },

  async cancelBooking(id) {
    const { error } = await sb()
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await sb().functions.invoke("send-booking-update", {
      body: { booking_id: id, kind: "cancelled" },
    }).catch(() => undefined);
  },

  async deleteBooking(id) {
    const { error } = await sb().from("bookings").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async getManagedBooking(tok) {
    const { data, error } = await sb().rpc("booking_by_token", { p_token: tok });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return {
      ...(row as ManagedBooking),
      price: Number(row.price),
      start_time: hhmm(row.start_time),
      end_time: hhmm(row.end_time),
    };
  },
  async cancelByToken(tok) {
    const { data, error } = await sb().functions.invoke("cancel-booking", { body: { token: tok } });
    if (error) throw new Error(error.message);
    const payload = data as { error?: string };
    if (payload?.error) throw new Error(payload.error);
  },

  async listBlocked(from, to) {
    const { data, error } = await sb()
      .from("blocked_slots")
      .select("*")
      .gte("date", from)
      .lte("date", to)
      .order("date");
    if (error) throw new Error(error.message);
    return ((data ?? []) as BlockedSlot[]).map((b) => ({
      ...b,
      start_time: hhmm(b.start_time),
      end_time: hhmm(b.end_time),
    }));
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

  async listClientNotes() {
    const { data, error } = await sb().from("client_notes").select("phone_key, note");
    if (error) throw new Error(error.message);
    return Object.fromEntries(((data ?? []) as { phone_key: string; note: string }[]).map((r) => [r.phone_key, r.note]));
  },
  async saveClientNote(key, name, note) {
    const client = sb();
    if (!note.trim()) {
      const { error } = await client.from("client_notes").delete().eq("phone_key", key);
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await client
      .from("client_notes")
      .upsert({ phone_key: key, name, note }, { onConflict: "phone_key" });
    if (error) throw new Error(error.message);
  },
  async closePastBookings() {
    const { data, error } = await sb().rpc("close_past_bookings");
    if (error) throw new Error(error.message);
    return Number(data ?? 0);
  },

  async listAdmins() {
    const { data, error } = await sb()
      .from("admin_users")
      .select("user_id, email, name, created_at")
      .order("created_at");
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, string>[]).map((r) => ({
      id: r.user_id,
      email: r.email ?? "",
      name: r.name ?? "",
      created_at: r.created_at,
    }));
  },
  async createAdmin({ email, name }) {
    // Cote Supabase, le compte doit d'abord exister dans Auth. On rattache
    // simplement l'utilisateur existant a la table des admins.
    const { error } = await sb().rpc("grant_admin", {
      p_email: email.trim().toLowerCase(),
      p_name: name,
    });
    if (error) throw new Error(error.message);
  },
  async deleteAdmin(id) {
    const { error } = await sb().from("admin_users").delete().eq("user_id", id);
    if (error) throw new Error(error.message);
  },
  async verifyDemoLogin() {
    return null;
  },

  subscribeBookings(onChange) {
    const channel = sb()
      .channel("bookings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, onChange)
      .subscribe();
    return () => {
      void sb().removeChannel(channel);
    };
  },
};

export const db: Db = isSupabaseConfigured ? supabaseDb : demoDb;

export function resetDemoData() {
  localStorage.removeItem(STORE_KEY);
}
