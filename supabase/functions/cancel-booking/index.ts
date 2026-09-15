import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders, json } from "../_shared/cors.ts";
import { escapeHtml, type Lang, prettyDate, renderEmail, sendEmail } from "../_shared/email.ts";

/**
 * Annulation par le client, depuis son lien de gestion.
 *
 * Le jeton vaut autorisation : il n'ouvre que ce rendez-vous. Le delai
 * d'annulation en ligne (settings.cancel_deadline_hours) est verifie ici,
 * pas seulement dans le navigateur. Passe ce delai, le client doit appeler.
 *
 * Appelable sans JWT (verify_jwt = false dans config.toml), comme
 * create-booking : la validation est dans la fonction.
 */

const COPY: Record<Lang, Record<string, string>> = {
  de: {
    subject: "Dein Termin wurde storniert",
    title: "Termin storniert",
    intro: "wir haben deinen Termin storniert. Schade, aber kein Problem.",
    service: "Leistung",
    date: "Datum",
    time: "Uhrzeit",
    cta: "Neuen Termin buchen",
    footer: "Du bist jederzeit willkommen. Ein Klick genügt für einen neuen Termin.",
    bye: "Bis zum nächsten Mal",
  },
  en: {
    subject: "Your appointment has been cancelled",
    title: "Appointment cancelled",
    intro: "we have cancelled your appointment. A pity, but no problem at all.",
    service: "Service",
    date: "Date",
    time: "Time",
    cta: "Book a new appointment",
    footer: "You are welcome any time. One click is enough for a new appointment.",
    bye: "See you next time",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "NOT_CONFIGURED" }, 500);

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let token = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "").trim();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }
  if (token.length < 16 || token.length > 128) return json({ error: "NOT_FOUND" }, 404);

  const { data: booking } = await admin
    .from("bookings")
    .select("*, booking_services(service_id, position), barbers(name)")
    .eq("manage_token", token)
    .maybeSingle();

  if (!booking) return json({ error: "NOT_FOUND" }, 404);
  if (booking.status === "cancelled") return json({ error: "ALREADY_CANCELLED" }, 409);

  const { data: settings } = await admin
    .from("settings")
    .select("cancel_deadline_hours")
    .eq("id", 1)
    .maybeSingle();
  const deadlineHours = settings?.cancel_deadline_hours ?? 24;

  const nowVienna = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Vienna" }));
  const start = new Date(`${booking.booking_date}T${String(booking.start_time).slice(0, 5)}:00`);
  if (start.getTime() - nowVienna.getTime() < deadlineHours * 3_600_000) {
    return json({ error: "TOO_LATE" }, 409);
  }

  const { error } = await admin
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", booking.id);
  if (error) return json({ error: "UPDATE_FAILED" }, 500);

  /* ---------------------------- notifications ---------------------------- */

  const lang: Lang = booking.language === "en" ? "en" : "de";
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

  const c = COPY[lang];
  const html = renderEmail({
    lang,
    title: c.title,
    intro: c.intro,
    clientName: booking.client_name,
    rows: [
      [c.service, escapeHtml(serviceLabel)],
      [c.date, prettyDate(booking.booking_date, lang)],
      [c.time, `${String(booking.start_time).slice(0, 5)} - ${String(booking.end_time).slice(0, 5)}`],
    ],
    cta: { label: c.cta, href: `${Deno.env.get("SITE_URL") ?? "https://delherren.app"}/termin` },
    footer: c.footer,
    bye: c.bye,
  });

  await Promise.allSettled([
    sendEmail(booking.client_email, c.subject, html),
    fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRole}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "cancellation",
        data: { booking, serviceLabel, barberName, by: "client" },
      }),
    }),
  ]);

  return json({ ok: true });
});
