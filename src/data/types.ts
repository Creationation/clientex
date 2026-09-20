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

export interface Booking {
  id: string;
  barber_id: string | null;
  /** Un rendez-vous peut combiner plusieurs prestations. */
  service_ids: string[];
  booking_date: string; // YYYY-MM-DD
  start_time: string;   // HH:MM
  end_time: string;     // HH:MM
  duration_min: number; // somme des prestations
  price: number;        // somme des prestations
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
  /** E-mail "Danke" avec lien avis et rebooking, envoye une fois apres le rendez-vous. */
  followup_sent: boolean;
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
  /** Resume du jour sur Telegram, le matin. */
  daily_summary: boolean;
  /** E-mail "Danke" apres le rendez-vous, avec lien avis Google. */
  followup_email: boolean;
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
  /**
   * Deuxieme personne (pere et fils, deux amis) : un second rendez-vous
   * enchaine juste apres le premier, chez le meme barbier. Cree en meme
   * temps, ou pas du tout.
   */
  second?: { client_name: string; service_ids: string[] };
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

/**
 * Modification d'un rendez-vous par le salon : prestations, moment, barbier,
 * coordonnees, note. La duree et le prix sont recalcules depuis les
 * prestations. Le client est prevenu par e-mail, sauf si le salon decoche.
 */
export interface BookingEdit {
  service_ids: string[];
  barber_id: string;
  booking_date: string;
  start_time: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  notes: string;
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
  status: BookingStatus;
  client_name: string;
  barber_name: string;
  service_names_de: string[];
  service_names_en: string[];
  /** Pour "Nochmal buchen" : memes prestations, meme barbier. */
  service_ids: string[];
  barber_id: string | null;
  cancel_deadline_hours: number;
}

/**
 * Fiche client cote salon, reconstruite a partir des reservations et
 * completee d'une note libre ("Fade 3 mm, links etwas kuerzer").
 * La cle est le telephone normalise : c'est ce que le salon connait.
 */
export interface ClientProfile {
  key: string;         // telephone normalise, ex. 4366012345678
  name: string;
  phone: string;
  email: string;
  visits: number;      // rendez-vous passes non annules
  no_shows: number;
  last_visit: string | null;   // YYYY-MM-DD
  next_visit: string | null;
  last_service_ids: string[];
  last_barber_id: string | null;
  note: string;
}

/** Compte autorise a ouvrir le dashboard. */
export interface AdminAccount {
  id: string;
  email: string;
  name: string;
  created_at: string;
}
