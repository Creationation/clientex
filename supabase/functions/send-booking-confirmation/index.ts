import { corsHeaders, json } from "../_shared/cors.ts";
import {
  escapeHtml, type Lang, manageUrl, money, prettyDate, renderEmail, sendEmail,
} from "../_shared/email.ts";

/**
 * E-mail de confirmation au client, avec le lien de gestion (voir / annuler).
 * Fonction interne : bearer service role obligatoire.
 */

const COPY: Record<Lang, Record<string, string>> = {
  de: {
    subject: "Dein Termin bei DEL Herren",
    title: "Dein Termin steht",
    intro: "wir freuen uns auf dich. Hier sind deine Termindetails.",
    service: "Leistung",
    barber: "Barbier",
    date: "Datum",
    time: "Uhrzeit",
    duration: "Dauer",
    total: "Gesamt",
    manage: "Termin ansehen",
    cancel: "Stornieren",
    second: "Zweiter Termin",
    follows: "direkt im Anschluss",
    policy: "Kostenlos online stornierbar bis {hours} Stunden vor dem Termin, über den Link oben. Danach genügt ein kurzer Anruf.",
    bye: "Bis bald",
  },
  en: {
    subject: "Your appointment at DEL Herren",
    title: "Your appointment is set",
    intro: "we are looking forward to seeing you. Here are your details.",
    service: "Service",
    barber: "Barber",
    date: "Date",
    time: "Time",
    duration: "Duration",
    total: "Total",
    manage: "View appointment",
    cancel: "Cancel",
    second: "Second appointment",
    follows: "right after",
    policy: "Free online cancellation up to {hours} hours before the appointment, via the link above. After that a quick call is enough.",
    bye: "See you soon",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRole || req.headers.get("Authorization") !== `Bearer ${serviceRole}`) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  const { booking, serviceLabel, barberName, second, cancelDeadlineHours } = await req.json();
  const lang: Lang = booking?.language === "en" ? "en" : "de";
  const c = COPY[lang];
  const deadline = String(cancelDeadlineHours ?? 24);

  const rows: [string, string][] = [
    [c.service, escapeHtml(serviceLabel)],
    [c.barber, escapeHtml(barberName)],
    [c.date, prettyDate(booking.booking_date, lang)],
    [c.time, `${String(booking.start_time).slice(0, 5)} - ${String(booking.end_time).slice(0, 5)}`],
    [c.duration, `${booking.duration_min} min`],
  ];
  rows.push([c.total, `<strong>${money(booking.price)}</strong>`]);
  if (second) {
    rows.push([
      `${c.second} · ${escapeHtml(second.client_name)}`,
      `${escapeHtml(second.serviceLabel)}<br>${String(second.start_time).slice(0, 5)} - ${String(second.end_time).slice(0, 5)} · ${money(second.price)}`,
    ]);
  }

  const url = manageUrl(booking.manage_token);
  const html = renderEmail({
    lang,
    title: c.title,
    intro: c.intro,
    clientName: booking.client_name,
    rows,
    cta: { label: c.manage, href: url },
    secondary: { label: c.cancel, href: url },
    footer: c.policy.replace("{hours}", deadline),
    bye: c.bye,
  });

  const result = await sendEmail(booking.client_email, c.subject, html);
  return json(result, result.ok || result.skipped ? 200 : 502);
});
