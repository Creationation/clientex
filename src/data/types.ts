export type Lang = "de" | "en";

export type BookingStatus = "pending" | "confirmed" | "done" | "no_show" | "cancelled";

/** Origine d'un rendez-vous : formulaire public ou saisie par le salon. */
export type BookingSource = "online" | "admin";

export type ServiceCategory = "hair" | "beard" | "shave" | "color" | "kids" | "extra";

export interface Service {
  id: string;
  slug: string;
  name_de: string;
  name_en: string;
  duration_min: number;
  price: number;
  is_from_price: boolean;
  category: ServiceCategory;
  sort_order: number;
  active: boolean;
}

export interface Barber {
  id: string;
  name: string;
  role_de: string;
  role_en: string;
  image_url: string | null;
  initials: string;
  sort_order: number;
  active: boolean;
}

/** weekday suit getDay() : 0 = dimanche ... 6 = samedi */
export interface OpeningHour {
  weekday: number;
  is_open: boolean;
  open_time: string;  // "09:00"
  close_time: string; // "19:00"
}

/**
 * Horaires propres a un barbier, par jour de semaine.
 * Sans ligne pour un jour donne, le barbier suit les horaires du salon.
 * active = false signifie qu'il ne travaille pas ce jour-la.
 */
export interface BarberHour {
  barber_id: string;
  weekday: number;
  active: boolean;
  start_time: string;
  end_time: string;
}

/** Conge ou absence d'un barbier sur une plage de dates, bornes incluses. */
export interface BarberAbsence {
  id: string;
  barber_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  reason: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  max_uses: number | null;
  current_uses: number;
  active: boolean;
  expires_at: string | null; // YYYY-MM-DD
}

/** Resultat de la validation d'un code, sans exposer la table entiere. */
export interface PromoQuote {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  discount: number; // montant reellement deduit, en euros
}

export interface Booking {
  id: string;
  barber_id: string | null;
  /** Un rendez-vous peut combiner plusieurs prestations. */
  service_ids: string[];
  booking_date: string; // YYYY-MM-DD
  start_time: string;   // HH:MM
  end_time: string;     // HH:MM
  duration_min: number; // somme des prestations
  price: number;        // total apres remise
  discount: number;     // remise appliquee
  promo_code: string | null;
  status: BookingStatus;
  source: BookingSource;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
  language: Lang;
  /** Jeton secret du lien de gestion (voir / annuler). Jamais expose en liste publique. */
  manage_token: string;
  cancelled_at: string | null;
  reminder_sent_24h: boolean;
  reminder_sent_2h: boolean;
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
  /** Le client peut annuler lui-meme jusqu'a X heures avant. Ensuite : appel au salon. */
  cancel_deadline_hours: number;
  email_reminders: boolean;
  reminder_24h: boolean;
  reminder_2h: boolean;
}

export interface NewBookingInput {
  barber_id: string | null;
  service_ids: string[];
  booking_date: string;
  start_time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
  language: Lang;
  promo_code?: string;
}

/**
 * Saisie par le salon (telephone, walk-in). L'e-mail est facultatif, le delai
 * minimum ne s'applique pas, mais le creneau doit rester libre.
 */
export interface AdminBookingInput {
  barber_id: string;
  service_ids: string[];
  booking_date: string;
  start_time: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  notes: string;
  status: BookingStatus;
}

/** Deplacement d'un rendez-vous par le salon. */
export interface ReschedulePatch {
  barber_id: string;
  booking_date: string;
  start_time: string;
  duration_min: number;
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

/**
 * Ce que voit le client depuis son lien de gestion. Pas d'id interne, pas
 * de jeton, seulement ce qui lui appartient.
 */
export interface ManagedBooking {
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  price: number;
  discount: number;
  status: BookingStatus;
  client_name: string;
  barber_name: string;
  service_names_de: string[];
  service_names_en: string[];
  cancel_deadline_hours: number;
}

/** Compte autorise a ouvrir le dashboard. */
export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  created_at: string;
}
