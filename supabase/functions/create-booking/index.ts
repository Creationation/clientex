import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders, json, SALON, toHHMM, toMinutes } from "../_shared/cors.ts";

/**
 * Point d'entree unique pour creer une reservation.
 *
 * Pourquoi une Edge Function plutot qu'un insert direct depuis le navigateur :
 *  1. la table bookings n'accorde AUCUN insert a anon (voir les policies RLS)
 *  2. le prix et la duree sont relus depuis la base, jamais recus du client
 *  3. l'ouverture du salon, les blocages et les conges sont revalides ici
 *  4. si aucun barbier n'est choisi, on en assigne un cote serveur, ce qui
 *     permet a la contrainte d'exclusion Postgres de jouer son role
 *  5. les notifications Telegram et Resend partent d'un endroit sur
 */

interface Payload {
  barber_id: string | null;
  /** Une ou plusieurs prestations pour le meme rendez-vous. */
  service_ids: string[];
  booking_date: string;
  start_time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes?: string;
  language?: "de" | "en";
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return json({ error: "NOT_CONFIGURED" }, 500);

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  /* ------------------------------ validation ------------------------------ */

  const name = (body.client_name ?? "").trim();
  const email = (body.client_email ?? "").trim().toLowerCase();
  const phone = (body.client_phone ?? "").trim();
  const notes = (body.notes ?? "").trim().slice(0, 500);
  const language = body.language === "en" ? "en" : "de";

  if (name.length < 2 || name.length > 120) return json({ error: "INVALID_NAME" }, 400);
  if (!EMAIL_RE.test(email)) return json({ error: "INVALID_EMAIL" }, 400);
  if (phone.length < 6 || phone.length > 40) return json({ error: "INVALID_PHONE" }, 400);
  if (!DATE_RE.test(body.booking_date)) return json({ error: "INVALID_DATE" }, 400);
  if (!TIME_RE.test(body.start_time)) return json({ error: "INVALID_TIME" }, 400);

  /* ---------------------- prestations, prix, duree ------------------------ */

  // Les ids arrivent du client, mais la duree et le prix sont TOUJOURS relus
  // en base : un total envoye par le navigateur n'a aucune valeur.
  const ids = Array.from(new Set(body.service_ids ?? [])).filter(Boolean);
  if (ids.length === 0 || ids.length > 6) return json({ error: "SERVICE_NOT_FOUND" }, 400);

  const { data: services, error: serviceError } = await admin
    .from("services")
    .select("id, name_de, name_en, duration_min, price, active, sort_order")
    .in("id", ids)
    .eq("active", true)
    .order("sort_order");

  if (serviceError) return json({ error: serviceError.message }, 500);
  if (!services || services.length !== ids.length) {
    return json({ error: "SERVICE_NOT_FOUND" }, 400);
  }

  const totalDuration = services.reduce((sum, s) => sum + s.duration_min, 0);
  const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);

  const start = toMinutes(body.start_time);
  const end = start + totalDuration;
  const endTime = toHHMM(end);

  /* ---------------------------- date et horaires --------------------------- */

  const date = new Date(`${body.booking_date}T00:00:00`);
  if (Number.isNaN(date.getTime())) return json({ error: "INVALID_DATE" }, 400);

  const { data: settings } = await admin
    .from("settings")
    .select("min_lead_time_min, max_advance_days, buffer_after_min, auto_confirm")
    .eq("id", 1)
    .maybeSingle();

  const leadTime = settings?.min_lead_time_min ?? 60;
  const maxAdvance = settings?.max_advance_days ?? 60;
  const buffer = settings?.buffer_after_min ?? 0;

  const nowVienna = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Vienna" }),
  );
  const slotStart = new Date(`${body.booking_date}T${body.start_time}:00`);
  if (slotStart.getTime() - nowVienna.getTime() < leadTime * 60_000) {
    return json({ error: "TOO_LATE" }, 409);
  }
  if (slotStart.getTime() - nowVienna.getTime() > maxAdvance * 86_400_000) {
    return json({ error: "TOO_FAR" }, 409);
  }

  const { data: hours } = await admin
    .from("opening_hours")
    .select("is_open, open_time, close_time")
    .eq("weekday", date.getDay())
    .maybeSingle();

  if (!hours?.is_open) return json({ error: "CLOSED" }, 409);
  if (start < toMinutes(hours.open_time.slice(0, 5))) return json({ error: "OUTSIDE_HOURS" }, 409);
  if (end > toMinutes(hours.close_time.slice(0, 5))) return json({ error: "OUTSIDE_HOURS" }, 409);

  /* -------------------------- barbier et conflits -------------------------- */

  const { data: blocked } = await admin
    .from("blocked_slots")
    .select("barber_id, start_time, end_time, all_day")
    .eq("date", body.booking_date);

  const { data: busy } = await admin
    .from("bookings")
    .select("barber_id, start_time, end_time")
    .eq("booking_date", body.booking_date)
    .neq("status", "cancelled");

  const conflicts = (barberId: string) => {
    for (const b of blocked ?? []) {
      if (b.barber_id && b.barber_id !== barberId) continue;
      const bs = b.all_day ? 0 : toMinutes(String(b.start_time).slice(0, 5));
      const be = b.all_day ? 1440 : toMinutes(String(b.end_time).slice(0, 5));
      if (start < be && bs < end) return true;
    }
    for (const b of busy ?? []) {
      if (b.barber_id !== barberId) continue;
      const bs = toMinutes(String(b.start_time).slice(0, 5));
      const be = toMinutes(String(b.end_time).slice(0, 5)) + buffer;
      if (start < be && bs < end) return true;
    }
    return false;
  };

  let barberId = body.barber_id;
  let barberName = "";

  const { data: barbers } = await admin
    .from("barbers")
    .select("id, name, active")
    .eq("active", true)
    .order("sort_order");

  if (!barbers || barbers.length === 0) return json({ error: "NO_BARBER" }, 409);

  if (barberId) {
    const chosen = barbers.find((b) => b.id === barberId);
    if (!chosen) return json({ error: "BARBER_NOT_FOUND" }, 400);
    if (conflicts(chosen.id)) return json({ error: "SLOT_TAKEN" }, 409);
    barberName = chosen.name;
  } else {
    // "Egal wer" : on affecte le premier barbier reellement libre, sinon la
    // contrainte d'exclusion ne pourrait pas proteger le creneau.
    const free = barbers.find((b) => !conflicts(b.id));
    if (!free) return json({ error: "SLOT_TAKEN" }, 409);
    barberId = free.id;
    barberName = free.name;
  }

  /* -------------------------------- insert -------------------------------- */

  const { data: booking, error: insertError } = await admin
    .from("bookings")
    .insert({
      barber_id: barberId,
      booking_date: body.booking_date,
      start_time: body.start_time,
      end_time: endTime,
      duration_min: totalDuration,
      price: totalPrice,
      status: settings?.auto_confirm === false ? "pending" : "confirmed",
      client_name: name,
      client_email: email,
      client_phone: phone,
      notes,
      language,
    })
    .select()
    .single();

  if (insertError) {
    // 23P01 = violation de la contrainte d'exclusion : le creneau a ete pris
    // entre notre verification et l'insert. C'est le filet de securite.
    const code = (insertError as { code?: string }).code;
    if (code === "23P01") return json({ error: "SLOT_TAKEN" }, 409);
    console.error("[create-booking] insert", insertError.message);
    return json({ error: "INSERT_FAILED" }, 500);
  }

  // Lignes de prestations. Si elles echouent, la reservation ne doit pas
  // rester orpheline : on la supprime et on renvoie une erreur franche.
  const { error: linesError } = await admin.from("booking_services").insert(
    services.map((s, i) => ({ booking_id: booking.id, service_id: s.id, position: i })),
  );

  if (linesError) {
    console.error("[create-booking] booking_services", linesError.message);
    await admin.from("bookings").delete().eq("id", booking.id);
    return json({ error: "INSERT_FAILED" }, 500);
  }

  const serviceLabel = services
    .map((s) => (language === "en" ? s.name_en || s.name_de : s.name_de))
    .join(" + ");

  /* ---------------------------- notifications ---------------------------- */

  const notify = { serviceLabel, barberName, booking };

  await Promise.allSettled([
    invoke(supabaseUrl, serviceRole, "send-telegram-notification", {
      type: "new_booking",
      data: notify,
    }),
    invoke(supabaseUrl, serviceRole, "send-booking-confirmation", notify),
  ]);

  return json({
    booking: { ...booking, booking_services: services.map((s) => ({ service_id: s.id })) },
    barberName,
    serviceLabel,
  });
});

async function invoke(url: string, key: string, fn: string, body: unknown) {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`[create-booking] ${fn} failed`, res.status, await res.text());
  }
}

// Evite un avertissement de lint sur l'import non utilise selon la config.
export const _salon = SALON;
