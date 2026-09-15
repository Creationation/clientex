import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders, json } from "../_shared/cors.ts";
import {
  escapeHtml, type Lang, manageUrl, prettyDate, renderEmail, sendEmail,
} from "../_shared/email.ts";

/**
 * Le salon a deplace ou annule un rendez-vous depuis le dashboard : on
 * previent le client par e-mail, et le salon sur Telegram.
 *
 * Appelee par le navigateur avec le JWT de l'admin (verify_jwt = true) : la
 * fonction verifie elle-meme que l'appelant est bien un admin, puis lit la
 * reservation avec la service role.
 */

interface Payload {
  booking_id: string;
  kind: "rescheduled" | "cancelled";
}

const COPY: Record<Lang, Record<string, string>> = {
  de: {
    subjectMoved: "Dein Termin wurde verschoben",
    titleMoved: "Neue Uhrzeit für deinen Termin",
    introMoved: "wir mussten deinen Termin verschieben. Hier ist die neue Zeit.",
    subjectCancelled: "Dein Termin wurde storniert",
    titleCancelled: "Termin storniert",
    introCancelled: "leider müssen wir deinen Termin absagen. Das tut uns leid.",
    service: "Leistung",
    barber: "Barbier",
    date: "Datum",
    time: "Uhrzeit",
    manage: "Termin ansehen",
    rebook: "Neuen Termin buchen",
    footerMoved: "Passt die neue Zeit nicht? Ruf uns kurz an, wir finden etwas anderes.",
    footerCancelled: "Ruf uns an oder buche online einen neuen Termin, wann es dir passt.",
    bye: "Bis bald",
  },
  en: {
    subjectMoved: "Your appointment has been rescheduled",
    titleMoved: "New time for your appointment",
    introMoved: "we had to move your appointment. Here is the new time.",
    subjectCancelled: "Your appointment has been cancelled",
    titleCancelled: "Appointment cancelled",
    introCancelled: "unfortunately we have to cancel your appointment. We are sorry.",
    service: "Service",
    barber: "Barber",
    date: "Date",
    time: "Time",
    manage: "View appointment",
    rebook: "Book a new appointment",
    footerMoved: "Does the new time not suit you? Give us a quick call and we will find something else.",
    footerCancelled: "Call us or book a new appointment online whenever it suits you.",
    bye: "See you soon",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRole || !anonKey) return json({ error: "NOT_CONFIGURED" }, 500);

  // Qui appelle ? Un admin connecte, ou une autre fonction avec la service role.
  const auth = req.headers.get("Authorization") ?? "";
  const isServiceRole = auth === `Bearer ${serviceRole}`;
  if (!isServiceRole) {
    const asUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: isAdmin } = await asUser.rpc("is_admin");
    if (!isAdmin) return json({ error: "FORBIDDEN" }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }
  if (!body.booking_id || !["rescheduled", "cancelled"].includes(body.kind)) {
    return json({ error: "INVALID_PAYLOAD" }, 400);
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("*, booking_services(service_id, position), barbers(name)")
    .eq("id", body.booking_id)
    .maybeSingle();
  if (!booking) return json({ error: "NOT_FOUND" }, 404);

  const lang: Lang = booking.language === "en" ? "en" : "de";
  const c = COPY[lang];

  const ids = [...(booking.booking_services ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((s) => s.service_id);
  const { data: services } = await admin.from("services").select("id, name_de, name_en").in("id", ids);
  const serviceLabel = ids
    .map((id) => services?.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => (lang === "en" ? s!.name_en || s!.name_de : s!.name_de))
    .join(" + ");
  const barberName = booking.barbers?.name ?? "";
  const time = `${String(booking.start_time).slice(0, 5)} - ${String(booking.end_time).slice(0, 5)}`;

  const moved = body.kind === "rescheduled";
  const html = renderEmail({
    lang,
    title: moved ? c.titleMoved : c.titleCancelled,
    intro: moved ? c.introMoved : c.introCancelled,
    clientName: booking.client_name,
    rows: [
      [c.service, escapeHtml(serviceLabel)],
      [c.barber, escapeHtml(barberName)],
      [c.date, moved ? `<strong>${prettyDate(booking.booking_date, lang)}</strong>` : prettyDate(booking.booking_date, lang)],
      [c.time, moved ? `<strong>${time}</strong>` : time],
    ],
    cta: moved
      ? { label: c.manage, href: manageUrl(booking.manage_token) }
      : { label: c.rebook, href: `${Deno.env.get("SITE_URL") ?? "https://delherren.app"}/termin` },
    footer: moved ? c.footerMoved : c.footerCancelled,
    bye: c.bye,
  });

  const results = await Promise.allSettled([
    sendEmail(booking.client_email, moved ? c.subjectMoved : c.subjectCancelled, html),
    fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRole}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: moved ? "rescheduled" : "cancellation",
        data: { booking, serviceLabel, barberName, by: "salon" },
      }),
    }),
  ]);

  const mail = results[0].status === "fulfilled" ? results[0].value : { ok: false };
  return json({ ok: true, email: mail });
});
