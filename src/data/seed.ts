import type { Barber, OpeningHour, Service, Settings } from "./types";

/**
 * DONNEES DE DEMO / SEED
 * A confirmer avec le client : durees, prix, prenoms des barbiers, horaires.
 * Ces valeurs sont editables dans l'admin et sont repliquees dans
 * supabase/seed.sql pour l'environnement Supabase.
 */

export const SEED_SERVICES: Service[] = [
  { id: "svc-haircut",    slug: "haarschnitt",        name_de: "Herrenhaarschnitt",       name_en: "Men's haircut",        name_tr: "Erkek sac kesimi",      duration_min: 30, price: 25, is_from_price: false, category: "hair",  sort_order: 1, active: true },
  { id: "svc-cutbeard",   slug: "schnitt-bart",       name_de: "Haarschnitt & Bart",      name_en: "Haircut & beard",      name_tr: "Sac & sakal",           duration_min: 45, price: 38, is_from_price: false, category: "hair",  sort_order: 2, active: true },
  { id: "svc-razorcut",   slug: "rasiermesser-cut",   name_de: "Rasiermesser-Schnitt",    name_en: "Razor cut",            name_tr: "Ustura kesim",          duration_min: 40, price: 30, is_from_price: false, category: "hair",  sort_order: 3, active: true },
  { id: "svc-kids",       slug: "kinderhaarschnitt",  name_de: "Kinderhaarschnitt",       name_en: "Kids haircut",         name_tr: "Cocuk sac kesimi",      duration_min: 25, price: 18, is_from_price: false, category: "hair",  sort_order: 4, active: true },
  { id: "svc-beard",      slug: "bartpflege",         name_de: "Bartpflege",              name_en: "Beard trim",           name_tr: "Sakal bakimi",          duration_min: 20, price: 15, is_from_price: false, category: "beard", sort_order: 5, active: true },
  { id: "svc-shave",      slug: "messerrasur",        name_de: "Rasur mit Rasiermesser",  name_en: "Straight razor shave", name_tr: "Ustura ile tras",       duration_min: 30, price: 22, is_from_price: false, category: "shave", sort_order: 6, active: true },
  { id: "svc-headshave",  slug: "kopfrasur",          name_de: "Kopfrasur",               name_en: "Head shave",           name_tr: "Kafa trasi",            duration_min: 20, price: 18, is_from_price: false, category: "shave", sort_order: 7, active: true },
  { id: "svc-brows",      slug: "augenbrauen",        name_de: "Augenbrauen",             name_en: "Eyebrow trimming",     name_tr: "Kas duzeltme",          duration_min: 10, price: 8,  is_from_price: false, category: "extra", sort_order: 8, active: true },
  { id: "svc-wash",       slug: "waschen-styling",    name_de: "Waschen & Styling",       name_en: "Shampoo & styling",    name_tr: "Yikama & sekillendirme", duration_min: 15, price: 10, is_from_price: false, category: "extra", sort_order: 9, active: true },
];

export const SEED_BARBERS: Barber[] = [
  { id: "brb-ali",    name: "Ali",    initials: "A", role_de: "Inhaber & Master Barber", role_en: "Owner & master barber", role_tr: "Sahibi & usta berber", image_url: null, sort_order: 1, active: true },
  { id: "brb-mehmet", name: "Mehmet", initials: "M", role_de: "Barber & Fade-Spezialist", role_en: "Barber & fade specialist", role_tr: "Berber & fade uzmani", image_url: null, sort_order: 2, active: true },
  { id: "brb-serkan", name: "Serkan", initials: "S", role_de: "Barber & Rasur-Spezialist", role_en: "Barber & shave specialist", role_tr: "Berber & tras uzmani", image_url: null, sort_order: 3, active: true },
];

/** 0 = Sonntag ... 6 = Samstag. A CONFIRMER avec le client. */
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

/** Galerie : placeholders generes en CSS tant que les photos HD ne sont pas fournies. */
export const GALLERY: { id: string; captionKey: string; tone: string }[] = [
  { id: "g1", captionKey: "chair",    tone: "from-[#141210] to-[#050505]" },
  { id: "g2", captionKey: "fade",     tone: "from-[#1a1611] to-[#070707]" },
  { id: "g3", captionKey: "mirror",   tone: "from-[#12100e] to-[#040404]" },
  { id: "g4", captionKey: "razor",    tone: "from-[#181410] to-[#060606]" },
  { id: "g5", captionKey: "beard",    tone: "from-[#151310] to-[#050505]" },
  { id: "g6", captionKey: "interior", tone: "from-[#191512] to-[#070707]" },
];
