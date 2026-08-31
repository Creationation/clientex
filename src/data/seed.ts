import type { Barber, OpeningHour, Service, Settings } from "./types";

/**
 * DONNEES DE DEMO / SEED
 * A confirmer avec le client : durees, prix, prenoms des barbiers, horaires.
 * Editables dans l'admin, repliquees dans supabase/seed.sql.
 */

export const SEED_SERVICES: Service[] = [
  { id: "svc-haircut",    slug: "haarschnitt",        name_de: "Herrenhaarschnitt",       name_en: "Men's haircut",      duration_min: 30, price: 25, is_from_price: false, category: "hair",  sort_order: 1, active: true },
  { id: "svc-cutbeard",   slug: "schnitt-bart",       name_de: "Haarschnitt & Bart",      name_en: "Haircut & beard",           duration_min: 45, price: 38, is_from_price: false, category: "hair",  sort_order: 2, active: true },
  { id: "svc-razorcut",   slug: "rasiermesser-cut",   name_de: "Rasiermesser-Schnitt",    name_en: "Razor cut",          duration_min: 40, price: 30, is_from_price: false, category: "hair",  sort_order: 3, active: true },
  { id: "svc-kids",       slug: "kinderhaarschnitt",  name_de: "Kinderhaarschnitt",       name_en: "Kids haircut",      duration_min: 25, price: 18, is_from_price: false, category: "hair",  sort_order: 4, active: true },
  { id: "svc-beard",      slug: "bartpflege",         name_de: "Bartpflege",              name_en: "Beard trim",          duration_min: 20, price: 15, is_from_price: false, category: "beard", sort_order: 5, active: true },
  { id: "svc-shave",      slug: "messerrasur",        name_de: "Rasur mit Rasiermesser",  name_en: "Straight razor shave",       duration_min: 30, price: 22, is_from_price: false, category: "shave", sort_order: 6, active: true },
  { id: "svc-headshave",  slug: "kopfrasur",          name_de: "Kopfrasur",               name_en: "Head shave",            duration_min: 20, price: 18, is_from_price: false, category: "shave", sort_order: 7, active: true },
  { id: "svc-brows",      slug: "augenbrauen",        name_de: "Augenbrauen",             name_en: "Eyebrow trimming",          duration_min: 10, price: 8,  is_from_price: false, category: "extra", sort_order: 8, active: true },
  { id: "svc-wash",       slug: "waschen-styling",    name_de: "Waschen & Styling",       name_en: "Shampoo & styling", duration_min: 15, price: 10, is_from_price: false, category: "extra", sort_order: 9, active: true },
];

export const SEED_BARBERS: Barber[] = [
  { id: "brb-ali",    name: "Ali",    initials: "A", role_de: "Inhaber & Master Barber",  role_en: "Owner & master barber", image_url: "/media/salon-2.jpg", sort_order: 1, active: true },
  { id: "brb-mehmet", name: "Mehmet", initials: "M", role_de: "Barber & Fade-Spezialist", role_en: "Barber & fade specialist", image_url: "/media/salon-7.jpg", sort_order: 2, active: true },
  { id: "brb-serkan", name: "Serkan", initials: "S", role_de: "Barber & Rasur-Spezialist", role_en: "Barber & shave specialist", image_url: "/media/salon-3.jpg", sort_order: 3, active: true },
];

/** 0 = dimanche ... 6 = samedi. A CONFIRMER avec le client. */
export const SEED_OPENING_HOURS: OpeningHour[] = [
  { weekday: 1, is_open: true,  open_time: "09:00", close_time: "19:00" },
  { weekday: 2, is_open: true,  open_time: "09:00", close_time: "19:00" },
  { weekday: 3, is_open: true,  open_time: "09:00", close_time: "19:00" },
  { weekday: 4, is_open: true,  open_time: "09:00", close_time: "19:00" },
  { weekday: 5, is_open: true,  open_time: "09:00", close_time: "19:00" },
  { weekday: 6, is_open: true,  open_time: "09:00", close_time: "18:00" },
  { weekday: 0, is_open: false, open_time: "09:00", close_time: "18:00" },
];

export const SEED_SETTINGS: Settings = {
  id: 1,
  slot_granularity_min: 15,
  min_lead_time_min: 60,
  max_advance_days: 60,
  buffer_after_min: 0,
  auto_confirm: true,
};

/**
 * Compte admin de demarrage.
 * En mode demo il permet d'ouvrir le dashboard tout de suite.
 * En production, le compte doit exister dans Supabase Auth : ce mot de passe
 * n'est PAS repris cote serveur (voir README, section admin).
 */
export const SEED_ADMIN = {
  email: "renardiego@gmail.com",
  name: "Diego Renard",
  password: "DelHerren2026!",
};

/**
 * Visuels temporaires.
 * ATTENTION : images et video issues de la banque libre Mixkit, en attendant
 * les photos du salon. A remplacer avant la mise en ligne.
 */
export const GALLERY: { id: string; captionKey: string; src: string }[] = [
  { id: "g1", captionKey: "chair",    src: "/media/salon-1.jpg" },
  { id: "g2", captionKey: "fade",     src: "/media/salon-2.jpg" },
  { id: "g3", captionKey: "mirror",   src: "/media/salon-3.jpg" },
  { id: "g4", captionKey: "razor",    src: "/media/salon-4.jpg" },
  { id: "g5", captionKey: "beard",    src: "/media/salon-5.jpg" },
  { id: "g6", captionKey: "interior", src: "/media/salon-6.jpg" },
];

export const MEDIA = {
  heroVideo: "/media/hero-barber.mp4",
  heroVideoMobile: "/media/hero-barber-mobile.mp4",
  heroPoster: "/media/hero-poster.jpg",
  craft: "/media/craft.jpg",
};
