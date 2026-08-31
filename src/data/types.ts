export type Lang = "de" | "en" | "tr";

export type BookingStatus = "pending" | "confirmed" | "done" | "no_show" | "cancelled";

export interface Service {
  id: string;
  slug: string;
  name_de: string;
  name_en: string;
  name_tr: string;
  duration_min: number;
  price: number;
  is_from_price: boolean;
  category: "hair" | "beard" | "shave" | "extra";
  sort_order: number;
  active: boolean;
}

export interface Barber {
  id: string;
  name: string;
  role_de: string;
  role_en: string;
  role_tr: string;
  image_url: string | null;
  initials: string;
  sort_order: number;
  active: boolean;
}

/** weekday follows JS getDay(): 0 = Sonntag ... 6 = Samstag */
export interface OpeningHour {
  weekday: number;
  is_open: boolean;
  open_time: string;  // "09:00"
  close_time: string; // "19:00"
}

export interface Booking {
  id: string;
  barber_id: string | null;
  service_id: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string;   // HH:MM
  end_time: string;     // HH:MM
  duration_min: number;
  price: number;
  status: BookingStatus;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
  language: Lang;
  created_at: string;
}

export interface BlockedSlot {
  id: string;
  barber_id: string | null; // null = tout le salon
  date: string;             // YYYY-MM-DD
  start_time: string;
  end_time: string;
  all_day: boolean;
  reason: string;
}

export interface Settings {
  id: number;
  slot_granularity_min: number;
  min_lead_time_min: number;
  max_advance_days: number;
  buffer_after_min: number;
  auto_confirm: boolean;
}

export interface NewBookingInput {
  barber_id: string | null;
  service_id: string;
  booking_date: string;
  start_time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
  language: Lang;
}

/**
 * Creneau occupe, expose publiquement sans aucune donnee personnelle.
 * Cote Supabase il provient de la fonction public_busy_slots().
 */
export interface BusySlot {
  barber_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
}
