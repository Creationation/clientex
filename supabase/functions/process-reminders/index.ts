import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  escapeHtml, type Lang, manageUrl, prettyDate, renderEmail, sendEmail,
} from "../_shared/email.ts";

/**
 * Rappels e-mail avant le rendez-vous : 24 h et 2 h.
 *
 * Appelee toutes les 30 minutes par pg_cron (voir supabase/cron.sql), avec le
 * bearer service role. Chaque rappel n'est envoye qu'une fois grace aux
 * colonnes reminder_sent_24h / reminder_sent_2h. Un rendez-vous deplace est
 * remis a zero par le dashboard, donc rappele a nouveau.
 *
 * Fenetres larges (23-25 h, 1.5-2.5 h) : un cron qui saute une execution ne
 * fait pas perdre le rappel, et un rendez-vous ne recoit jamais deux fois le
 * meme.
 */

const COPY: Record<Lang, Record<string, string>> = {
  de: {
    subject24: "Morgen: dein Termin bei DEL Herren",
    title24: "Bis morgen!",
    intro24: "kleine Erinnerung: dein Termin ist morgen. Wir freuen uns auf dich.",
    subject2: "In 2 Stunden: dein Termin bei DEL Herren",
    title2: "Bis gleich!",
    intro2: "dein Termin ist in etwa zwei Stunden. Wir sind bereit.",
    service: "Leistung",
    barber: "Barbier",
    date: "Datum",
    time: "Uhrzeit",
    manage: "Termin ansehen",
    footer: "Kannst du doch nicht kommen? Sag uns bitte kurz Bescheid, dann bekommt jemand anderes den Platz.",
    bye: "Bis bald",
  },
  en: {
    subject24: "Tomorrow: your appointment at DEL Herren",
    title24: "See you tomorrow!",
    intro24: "a quick reminder: your appointment is tomorrow. We are looking forward to it.",
    subject2: "In 2 hours: your appointment at DEL Herren",
    title2: "See you soon!",
    intro2: "your appointment is in about two hours. We are ready.",
    service: "Service",
    barber: "Barber",
    date: "Date",
    time: "Time",
    manage: "View appointment",
    footer: "Cannot make it after all? Please let us know, so someone else can have the slot.",
    bye: "See you soon",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "NOT_CONFIGURED" }, 500);
  if (req.headers.get("Authorization") !== `Bearer ${serviceRole}`) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: settings } = await admin
    .from("settings")
    .select("email_reminders, reminder_24h, reminder_2h")
    .eq("id", 1)
    .maybeSingle();

  if (!settings?.email_reminders) return json({ skipped: "email reminders disabled" });

  // Heure de Vienne : les rendez-vous sont stockes en heure locale du salon.
  const nowVienna = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Vienna" }));
  const todayKey = nowVienna.toISOString().slice(0, 10);
  const tomorrow = new Date(nowVienna.getTime() + 2 * 86_400_000).toISOString().slice(0, 10);

  const { data: bookings, error } = await admin
    .from("bookings")
    .select("*, booking_services(service_id, position), barbers(name)")
    .eq("status", "confirmed")
    .gte("booking_date", todayKey)
    .lte("booking_date", tomorrow);

  if (error) return json({ error: error.message }, 500);

  const serviceIds = new Set<string>();
  for (const b of bookings ?? []) for (const s of b.booking_services ?? []) serviceIds.add(s.service_id);
  const { data: services } = await admin
    .from("services")
    .select("id, name_de, name_en")
    .in("id", [...serviceIds]);

  let sent = 0;
  const log: string[] = [];

  for (const b of bookings ?? []) {
    const start = new Date(`${b.booking_date}T${String(b.start_time).slice(0, 5)}:00`);
    const hoursUntil = (start.getTime() - nowVienna.getTime()) / 3_600_000;
    const lang: Lang = b.language === "en" ? "en" : "de";
    const c = COPY[lang];

    const kind =
      settings.reminder_24h && !b.reminder_sent_24h && hoursUntil >= 23 && hoursUntil <= 25
        ? "24h"
        : settings.reminder_2h && !b.reminder_sent_2h && hoursUntil >= 1.5 && hoursUntil <= 2.5
          ? "2h"
          : null;
    if (!kind) continue;

    const ids = [...(b.booking_services ?? [])]
      .sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
      .map((s) => s.service_id);
    const serviceLabel = ids
      .map((id) => services?.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => (lang === "en" ? s!.name_en || s!.name_de : s!.name_de))
      .join(" + ");

    const html = renderEmail({
      lang,
      title: kind === "24h" ? c.title24 : c.title2,
      intro: kind === "24h" ? c.intro24 : c.intro2,
      clientName: b.client_name,
      rows: [
        [c.service, escapeHtml(serviceLabel)],
        [c.barber, escapeHtml(b.barbers?.name ?? "")],
        [c.date, prettyDate(b.booking_date, lang)],
        [c.time, `<strong>${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}</strong>`],
      ],
      cta: { label: c.manage, href: manageUrl(b.manage_token) },
      footer: c.footer,
      bye: c.bye,
    });

    const result = await sendEmail(b.client_email, kind === "24h" ? c.subject24 : c.subject2, html);
    if (result.ok || result.skipped) {
      await admin
        .from("bookings")
        .update(kind === "24h" ? { reminder_sent_24h: true } : { reminder_sent_2h: true })
        .eq("id", b.id);
      if (result.ok) {
        sent++;
        log.push(`${kind} -> ${b.client_email}`);
      }
    }
  }

  return json({ ok: true, sent, checked: bookings?.length ?? 0, log });
});
