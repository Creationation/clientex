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
    subjectThanks: "Danke für deinen Besuch bei DEL Herren",
    titleThanks: "Danke!",
    introThanks: "schön, dass du da warst. Wenn dir der Schnitt gefällt, freuen wir uns über eine kurze Bewertung auf Google. Das hilft uns mehr, als du denkst.",
    review: "Bewertung schreiben",
    rebook: "Nochmal buchen",
    footerThanks: "Mit \"Nochmal buchen\" sind deine Leistungen und dein Barbier schon ausgewählt. Du wählst nur noch den Tag.",
    byeThanks: "Bis zum nächsten Mal",
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
    subjectThanks: "Thank you for visiting DEL Herren",
    titleThanks: "Thank you!",
    introThanks: "great to have had you here. If you like your cut, a short Google review would mean a lot to us.",
    review: "Write a review",
    rebook: "Book again",
    footerThanks: "With \"Book again\" your services and barber are already selected. You only pick the day.",
    byeThanks: "See you next time",
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
    .select("email_reminders, reminder_24h, reminder_2h, followup_email")
    .eq("id", 1)
    .maybeSingle();

  const siteUrl = Deno.env.get("SITE_URL") ?? "https://delherren.app";
  const reviewUrl =
    Deno.env.get("GOOGLE_REVIEW_URL") ??
    "https://www.google.com/maps/search/?api=1&query=DEL+Herren+Friseur+1220+Wien";

  /* -------------------- e-mail "Danke" apres le rendez-vous -------------------- */

  let thanked = 0;
  if (settings?.followup_email) {
    const nowV = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Vienna" }));
    const from = new Date(nowV.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
    const to = nowV.toISOString().slice(0, 10);
    const { data: past } = await admin
      .from("bookings")
      .select("*, booking_services(service_id, position), barbers(name)")
      .in("status", ["done", "confirmed"])
      .eq("followup_sent", false)
      .gte("booking_date", from)
      .lte("booking_date", to);

    for (const b of past ?? []) {
      const endAt = new Date(`${b.booking_date}T${String(b.end_time).slice(0, 5)}:00`);
      const hoursSince = (nowV.getTime() - endAt.getTime()) / 3_600_000;
      // Deux heures apres la fin, et pas plus de deux jours (sinon le cron a
      // ete arrete longtemps et un mail tardif serait deplace).
      if (hoursSince < 2 || hoursSince > 48) continue;

      const lang: Lang = b.language === "en" ? "en" : "de";
      const c = COPY[lang];
      const ids = [...(b.booking_services ?? [])]
        .sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
        .map((x) => x.service_id);
      const rebook = `${siteUrl}/termin?services=${ids.join(",")}${b.barber_id ? `&barber=${b.barber_id}` : ""}`;

      const html = renderEmail({
        lang,
        title: c.titleThanks,
        intro: c.introThanks,
        clientName: b.client_name,
        rows: [[c.barber, escapeHtml(b.barbers?.name ?? "")], [c.date, prettyDate(b.booking_date, lang)]],
        cta: { label: c.review, href: reviewUrl },
        secondary: { label: c.rebook, href: rebook },
        footer: c.footerThanks,
        bye: c.byeThanks,
      });
      const result = await sendEmail(b.client_email, c.subjectThanks, html);
      if (result.ok || result.skipped) {
        await admin.from("bookings").update({ followup_sent: true }).eq("id", b.id);
        if (result.ok) thanked++;
      }
    }
  }

  if (!settings?.email_reminders) return json({ skipped: "email reminders disabled", thanked });

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

  return json({ ok: true, sent, thanked, checked: bookings?.length ?? 0, log });
});
