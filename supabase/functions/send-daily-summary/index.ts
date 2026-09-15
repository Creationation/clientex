import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { corsHeaders, json, WEEKDAY_DE } from "../_shared/cors.ts";

/**
 * Resume du jour sur Telegram, le matin avant l'ouverture.
 *
 *   Dienstag 15.09. · 7 Termine
 *   09:00  Lukas Berger · Schneiden, Föhnen, Stylen · Ali
 *   ...
 *
 * Appelee par pg_cron (voir supabase/cron.sql), bearer service role.
 * Se coupe depuis l'admin : settings.daily_summary.
 */

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

  const { data: settings } = await admin.from("settings").select("daily_summary").eq("id", 1).maybeSingle();
  if (settings && settings.daily_summary === false) return json({ skipped: "daily summary disabled" });

  const nowVienna = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Vienna" }));
  const today = nowVienna.toISOString().slice(0, 10);

  const [{ data: bookings }, { data: services }, { data: absences }] = await Promise.all([
    admin
      .from("bookings")
      .select("start_time, end_time, price, client_name, client_phone, notes, status, barber_id, booking_services(service_id, position), barbers(name)")
      .eq("booking_date", today)
      .in("status", ["confirmed", "pending"])
      .order("start_time"),
    admin.from("services").select("id, name_de"),
    admin.from("barber_absences").select("barber_id, barbers(name)").lte("start_date", today).gte("end_date", today),
  ]);

  const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const time = (v: unknown) => String(v ?? "").slice(0, 5);
  const label = (ids: { service_id: string; position?: number }[]) =>
    [...ids]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((x) => services?.find((s) => s.id === x.service_id)?.name_de ?? "")
      .filter(Boolean)
      .join(" + ");

  const rows = bookings ?? [];
  const day = `${WEEKDAY_DE[nowVienna.getDay()]} ${String(nowVienna.getDate()).padStart(2, "0")}.${String(nowVienna.getMonth() + 1).padStart(2, "0")}.`;
  const revenue = rows.reduce((sum, b) => sum + Number((b as { price?: number }).price ?? 0), 0);

  const lines: string[] = [
    `\u{2600}\u{FE0F} <b>${day} · ${rows.length} ${rows.length === 1 ? "Termin" : "Termine"}</b>`,
    "",
  ];
  if (rows.length === 0) lines.push("<i>Heute keine Termine.</i>");
  for (const b of rows) {
    const flag = b.status === "pending" ? " \u{23F3}" : "";
    lines.push(
      `<b>${time(b.start_time)}</b>  ${esc(b.client_name)} · ${esc(label(b.booking_services ?? []))} · ${esc((b.barbers as { name?: string } | null)?.name ?? "")}${flag}`,
    );
    if (b.notes) lines.push(`      \u{1F4DD} ${esc(b.notes)}`);
  }
  if ((absences ?? []).length > 0) {
    lines.push("", `\u{1F3D6}\u{FE0F} Abwesend: ${(absences ?? []).map((a) => esc((a.barbers as { name?: string } | null)?.name ?? "")).join(", ")}`);
  }
  if (revenue > 0) lines.push("", `<i>Geplant: ${revenue.toFixed(0)} EUR</i>`);

  const res = await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceRole}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "raw", data: { text: lines.join("\n") } }),
  });

  return json({ ok: res.ok, count: rows.length });
});
