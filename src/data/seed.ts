import type { Barber, OpeningHour, PromoCode, Service, Settings } from "./types";

/**
 * DONNEES DE DEMO / SEED
 *
 * Les prestations et les prix sont ceux de la liste affichee en vitrine du
 * salon (photo du 15 septembre 2026). Les durees ne figurent pas sur la
 * liste : ce sont des estimations raisonnables, modifiables dans l'admin.
 * Repliquees dans supabase/seed.sql.
 */

export const SEED_SERVICES: Service[] = [
  { id: "svc-cut-style",      slug: "schneiden-foehnen-stylen",          name_de: "Schneiden, Föhnen, Stylen",          name_en: "Cut, blow-dry & style",         duration_min: 30, price: 18, is_from_price: false, category: "hair",  sort_order: 1,  active: true },
  { id: "svc-cut-wash-style", slug: "schneiden-waschen-foehnen-stylen",  name_de: "Schneiden, Waschen, Föhnen, Stylen", name_en: "Cut, wash, blow-dry & style",   duration_min: 40, price: 23, is_from_price: false, category: "hair",  sort_order: 2,  active: true },
  { id: "svc-machine",        slug: "maschinenhaarschnitt",              name_de: "Maschinenhaarschnitt",               name_en: "Clipper cut",                   duration_min: 20, price: 14, is_from_price: false, category: "hair",  sort_order: 3,  active: true },
  { id: "svc-wash-style",     slug: "waschen-foehnen-stylen",            name_de: "Waschen, Föhnen, Stylen",            name_en: "Wash, blow-dry & style",        duration_min: 15, price: 7,  is_from_price: false, category: "hair",  sort_order: 4,  active: true },
  { id: "svc-beardshave",     slug: "bartrasur",                         name_de: "Bartrasur",                          name_en: "Beard shave",                   duration_min: 15, price: 10, is_from_price: false, category: "beard", sort_order: 5,  active: true },
  { id: "svc-modelshave",     slug: "modellrasur",                       name_de: "Modellrasur",                        name_en: "Beard shaping",                 duration_min: 20, price: 12, is_from_price: false, category: "beard", sort_order: 6,  active: true },
  { id: "svc-headshave",      slug: "kopfrasur",                         name_de: "Kopf rasieren",                      name_en: "Head shave",                    duration_min: 20, price: 14, is_from_price: false, category: "shave", sort_order: 7,  active: true },
  { id: "svc-wash-cut-color", slug: "waschen-schneiden-faerben",         name_de: "Waschen, Schneiden, Färben",         name_en: "Wash, cut & colour",            duration_min: 60, price: 33, is_from_price: false, category: "color", sort_order: 8,  active: true },
  { id: "svc-haircolor",      slug: "haare-faerben",                     name_de: "Haare färben",                       name_en: "Hair colouring",                duration_min: 30, price: 15, is_from_price: false, category: "color", sort_order: 9,  active: true },
  { id: "svc-beardcolor",     slug: "bart-faerben",                      name_de: "Bart färben",                        name_en: "Beard colouring",               duration_min: 15, price: 10, is_from_price: false, category: "color", sort_order: 10, active: true },
  { id: "svc-kids",           slug: "kinder-bis-12",                     name_de: "Kinder bis 12 Jahre",                name_en: "Kids up to 12 years",           duration_min: 25, price: 12, is_from_price: false, category: "kids",  sort_order: 11, active: true },
  { id: "svc-brows",          slug: "augenbrauen-zupfen",                name_de: "Augenbrauen zupfen",                 name_en: "Eyebrow plucking",              duration_min: 10, price: 7,  is_from_price: false, category: "extra", sort_order: 12, active: true },
  { id: "svc-facemask",       slug: "gesichtsmaske",                     name_de: "Gesichtsmaske",                      name_en: "Face mask",                     duration_min: 15, price: 7,  is_from_price: false, category: "extra", sort_order: 13, active: true },
  { id: "svc-facewax",        slug: "gesichtsharzen",                    name_de: "Gesichtsharzen",                     name_en: "Face waxing",                   duration_min: 15, price: 7,  is_from_price: false, category: "extra", sort_order: 14, active: true },
];

export const SEED_BARBERS: Barber[] = [
  { id: "brb-ali",    name: "Ali",    initials: "A", role_de: "Inhaber & Master Barber",  role_en: "Owner & master barber", image_url: "/media/salon-2.jpg", sort_order: 1, active: true },
  { id: "brb-mehmet", name: "Mehmet", initials: "M", role_de: "Barber & Fade-Spezialist", role_en: "Barber & fade specialist", image_url: "/media/salon-7.jpg", sort_order: 2, active: true },
  { id: "brb-serkan", name: "Serkan", initials: "S", role_de: "Barber & Rasur-Spezialist", role_en: "Barber & shave specialist", image_url: "/media/salon-3.jpg", sort_order: 3, active: true },
];

/** 0 = dimanche ... 6 = samedi. Horaires releves sur la vitrine du salon. */
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
  cancel_deadline_hours: 24,
  email_reminders: true,
  reminder_24h: true,
  reminder_2h: true,
};

/** Codes de demonstration, pour montrer la mecanique. A remplacer par le salon. */
export const SEED_PROMO_CODES: PromoCode[] = [
  { id: "prm-welcome", code: "WILLKOMMEN10", description: "10 % für Neukunden", discount_type: "percent", discount_value: 10, min_order: 0,  max_uses: null, current_uses: 0, active: true, expires_at: null },
  { id: "prm-del5",    code: "DEL5",         description: "5 EUR ab 25 EUR",    discount_type: "fixed",   discount_value: 5,  min_order: 25, max_uses: 100,  current_uses: 0, active: true, expires_at: null },
];

/**
 * Compte admin de demarrage.
 * En mode demo il permet d'ouvrir le dashboard tout de suite.
 * En production, le compte doit exister dans Supabase Auth : ce mot de passe
 * n'est PAS repris cote serveur (voir README, section admin).
 *
 * Le depot est public : ce mot de passe est donc lisible par tout le monde.
 * Il n'ouvre que les donnees de demonstration stockees dans le navigateur du
 * visiteur, jamais une base distante. Ne pas le reutiliser dans Supabase Auth.
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
