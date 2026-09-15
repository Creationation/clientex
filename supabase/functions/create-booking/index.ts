import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders, json, toHHMM, toMinutes } from "../_shared/cors.ts";

/**
 * Point d'entree unique pour creer une reservation depuis le site.
 *
 * Pourquoi une Edge Function plutot qu'un insert direct depuis le navigateur :
 *  1. la table bookings n'accorde AUCUN insert a anon (voir les policies RLS)
 *  2. le prix, la duree et la remise sont recalcules ici, jamais recus du client
 *  3. l'ouverture du salon, les horaires du barbier, ses absences, les
 *     blocages et les conges sont revalides ici
 *  4. si aucun barbier n'est choisi, on en assigne un cote serveur, ce qui
 *     permet a la contrainte d'exclusion Postgres de jouer son role
 *  5. les notifications Telegram et Resend partent d'un endroit sur
 */

interface Payload {
  barber_id: string | null;
  service_ids: string[];
  booking_date: string;
  start_time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes?: string;
  language?: "de" | "en";
  promo_code?: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const hhmm = (v: unknown) => String(v ?? "").slice(0, 5);

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
  const subtotal = services.reduce((sum, s) => sum + Number(s.price), 0);

  const start = toMinutes(body.start_time);
  const end = start + totalDuration;
  const endTime = toHHMM(end);

  /* ---------------------------- date et horaires --------------------------- */

  const date = new Date(`${body.booking_date}T00:00:00`);
  if (Number.isNaN(date.getTime())) return json({ error: "INVALID_DATE" }, 400);
  const weekday = date.getDay();

  const { data: settings } = await admin
    .from("settings")
    .select("min_lead_time_min, max_advance_days, buffer_after_min, auto_confirm, cancel_deadline_hours")
    .eq("id", 1)
    .maybeSingle();

  const leadTime = settings?.min_lead_time_min ?? 60;
  const maxAdvance = settings?.max_advance_days ?? 60;
  const buffer = settings?.buffer_after_min ?? 0;

  const nowVienna = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Vienna" }));
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
    .eq("weekday", weekday)
    .maybeSingle();

  if (!hours?.is_open) return json({ error: "CLOSED" }, 409);
  const shopOpen = toMinutes(hhmm(hours.open_time));
  const shopClose = toMinutes(hhmm(hours.close_time));
  if (start < shopOpen || end > shopClose) return json({ error: "OUTSIDE_HOURS" }, 409);

  /* -------------------------- code promo (optionnel) ----------------------- */

  let discount = 0;
  let promoCode: string | null = null;
  const rawCode = (body.promo_code ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (rawCode) {
    const { data: quote } = await admin.rpc("quote_promo", { p_code: rawCode, p_subtotal: subtotal });
    const q = Array.isArray(quote) ? quote[0] : quote;
    if (!q || q.rejection) return json({ error: `PROMO_${q?.rejection ?? "NOT_FOUND"}` }, 409);
    discount = Number(q.discount);
    promoCode = q.code;
  }
  const totalPrice = Math.max(0, subtotal - discount);

  /* -------------------------- barbier et conflits -------------------------- */

  const [{ data: blocked }, { data: busy }, { data: barberHours }, { data: absences }] =
    await Promise.all([
      admin.from("blocked_slots").select("barber_id, start_time, end_time, all_day").eq("date", body.booking_date),
      admin.from("bookings").select("barber_id, start_time, end_time").eq("booking_date", body.booking_date).neq("status", "cancelled"),
      admin.from("barber_hours").select("barber_id, active, start_time, end_time").eq("weekday", weekday),
      admin.from("barber_absences").select("barber_id").lte("start_date", body.booking_date).gte("end_date", body.booking_date),
    ]);

  const absent = new Set((absences ?? []).map((a) => a.barber_id));

  // "OUTSIDE_HOURS" si le barbier ne travaille pas a ce moment, "SLOT_TAKEN"
  // si quelque chose occupe deja l'intervalle. Meme logique que src/lib/slots.ts.
  const problemFor = (barberId: string): "OUTSIDE_HOURS" | "SLOT_TAKEN" | null => {
    if (absent.has(barberId)) return "OUTSIDE_HOURS";
    const own = (barberHours ?? []).find((h) => h.barber_id === barberId);
    if (own) {
      if (!own.active) return "OUTSIDE_HOURS";
      if (start < toMinutes(hhmm(own.start_time)) || end > toMinutes(hhmm(own.end_time))) {
        return "OUTSIDE_HOURS";
      }
    }
    for (const b of blocked ?? []) {
      if (b.barber_id && b.barber_id !== barberId) continue;
      const bs = b.all_day ? 0 : toMinutes(hhmm(b.start_time));
      const be = b.all_day ? 1440 : toMinutes(hhmm(b.end_time));
      if (start < be && bs < end) return "SLOT_TAKEN";
    }
    for (const b of busy ?? []) {
      if (b.barber_id !== barberId) continue;
      const bs = toMinutes(hhmm(b.start_time));
      const be = toMinutes(hhmm(b.end_time)) + buffer;
      if (start < be && bs < end) return "SLOT_TAKEN";
    }
    return null;
  };

  const { data: barbers } = await admin
    .from("barbers")
    .select("id, name, active")
    .eq("active", true)
    .order("sort_order");

  if (!barbers || barbers.length === 0) return json({ error: "NO_BARBER" }, 409);

  let barberId = body.barber_id;
  let barberName = "";

  if (barberId) {
    const chosen = barbers.find((b) => b.id === barberId);
    if (!chosen) return json({ error: "BARBER_NOT_FOUND" }, 400);
    const problem = problemFor(chosen.id);
    if (problem) return json({ error: problem }, 409);
    barberName = chosen.name;
  } else {
    // "Egal wer" : on affecte le premier barbier reellement libre, sinon la
    // contrainte d'exclusion ne pourrait pas proteger le creneau.
    const free = barbers.find((b) => !problemFor(b.id));
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
      discount,
      promo_code: promoCode,
      source: "online",
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

  const { error: linesError } = await admin.from("booking_services").insert(
    services.map((s, i) => ({ booking_id: booking.id, service_id: s.id, position: i })),
  );

  if (linesError) {
    console.error("[create-booking] booking_services", linesError.message);
    await admin.from("bookings").delete().eq("id", booking.id);
    return json({ error: "INSERT_FAILED" }, 500);
  }

  // Le code est consomme apres l'insert reussi, jamais avant.
  if (promoCode) {
    const { data: promo } = await admin
      .from("promo_codes")
      .select("id, current_uses")
      .eq("code", promoCode)
      .maybeSingle();
    if (promo) {
      await admin.from("promo_codes").update({ current_uses: promo.current_uses + 1 }).eq("id", promo.id);
    }
  }

  const serviceLabel = services
    .map((s) => (language === "en" ? s.name_en || s.name_de : s.name_de))
    .join(" + ");

  /* ---------------------------- notifications ---------------------------- */

  const notify = {
    serviceLabel,
    barberName,
    booking,
    cancelDeadlineHours: settings?.cancel_deadline_hours ?? 24,
  };

  await Promise.allSettled([
    invoke(supabaseUrl, serviceRole, "send-telegram-notification", { type: "new_booking", data: notify }),
    invoke(supabaseUrl, serviceRole, "send-booking-confirmation", notify),
  ]);

  return json({
    booking: { ...booking, booking_services: services.map((s, i) => ({ service_id: s.id, position: i })) },
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
