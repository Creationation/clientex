import { corsHeaders, json, SALON, WEEKDAY_DE } from "../_shared/cors.ts";

/**
 * Notification Telegram instantanee au salon.
 *
 * Appel direct de l'API Bot Telegram, sans passerelle tierce : le projet doit
 * pouvoir tourner sur n'importe quel hebergement.
 *
 * Secrets attendus :
 *   supabase secrets set TELEGRAM_BOT_TOKEN=123456:ABC...
 *   supabase secrets set TELEGRAM_CHAT_ID=-1001234567890
 *   supabase secrets set TELEGRAM_CHAT_ID_2=...   (optionnel)
 *
 * Fonction interne : elle exige le bearer service role, elle n'est jamais
 * appelable depuis le navigateur.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRole || req.headers.get("Authorization") !== `Bearer ${serviceRole}`) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatIds = [
    Deno.env.get("TELEGRAM_CHAT_ID"),
    Deno.env.get("TELEGRAM_CHAT_ID_2"),
    Deno.env.get("TELEGRAM_CHAT_ID_3"),
  ].filter((id): id is string => Boolean(id && id.trim()));

  if (!token || chatIds.length === 0) {
    console.warn("[telegram] non configure, notification ignoree");
    return json({ ok: false, skipped: true });
  }

  const { type, data } = await req.json();
  const b = data?.booking ?? {};

  const date = new Date(`${b.booking_date}T00:00:00`);
  const prettyDate = `${WEEKDAY_DE[date.getDay()]} ${String(date.getDate()).padStart(2, "0")}.${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}.${date.getFullYear()}`;

  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  let text: string;

  if (type === "cancellation") {
    text = [
      "❌ <b>Termin storniert</b>",
      "",
      `\u{1F464} ${esc(b.client_name)}`,
      `\u{1F4C5} ${prettyDate} um ${esc(b.start_time)}`,
      `✂️ ${esc(data.serviceLabel)} bei ${esc(data.barberName)}`,
    ].join("\n");
  } else {
    text = [
      "✂️ <b>Neuer Termin</b>",
      "",
      `\u{1F464} <b>${esc(b.client_name)}</b>`,
      `\u{1F4F1} ${esc(b.client_phone)}`,
      `\u{1F4E7} ${esc(b.client_email)}`,
      "",
      `\u{1F4C5} <b>${prettyDate}</b>`,
      `\u{1F551} ${esc(b.start_time)} - ${esc(b.end_time)} (${esc(b.duration_min)} Min)`,
      `\u{1F488} ${esc(data.serviceLabel)} · ${esc(b.price)} EUR`,
      `\u{1F9D4} ${esc(data.barberName)}`,
      b.notes ? `\n\u{1F4DD} ${esc(b.notes)}` : "",
      "",
      `<i>${SALON.name}</i>`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const results = await Promise.allSettled(
    chatIds.map(async (chatId) => {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) throw new Error(`telegram ${res.status} ${await res.text()}`);
      return true;
    }),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .forEach((r) => console.error("[telegram]", r.reason));

  return json({ ok: sent > 0, sent, total: chatIds.length });
});
