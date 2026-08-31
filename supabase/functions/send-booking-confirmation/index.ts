import { corsHeaders, json, SALON } from "../_shared/cors.ts";

/**
 * E-mail de confirmation au client, via Resend en appel direct.
 *
 * Secrets attendus :
 *   supabase secrets set RESEND_API_KEY=re_...
 *   supabase secrets set BOOKING_FROM_EMAIL="DEL Herren <termin@delherren.app>"
 *
 * Le domaine expediteur doit etre verifie dans Resend, sinon l'envoi echoue.
 * Fonction interne : bearer service role obligatoire.
 */

type Lang = "de" | "en";

const COPY: Record<Lang, Record<string, string>> = {
  de: {
    subject: "Dein Termin bei DEL Herren",
    title: "Dein Termin steht",
    hello: "Hallo",
    intro: "wir freuen uns auf dich. Hier sind deine Termindetails.",
    service: "Leistung",
    barber: "Barbier",
    date: "Datum",
    time: "Uhrzeit",
    duration: "Dauer",
    total: "Gesamt",
    where: "Wo",
    policy:
      "Wenn du nicht kommen kannst, sag uns bitte rechtzeitig Bescheid. Ein kurzer Anruf genugt.",
    bye: "Bis bald",
    call: "Anrufen",
  },
  en: {
    subject: "Your appointment at DEL Herren",
    title: "Your appointment is set",
    hello: "Hi",
    intro: "we are looking forward to seeing you. Here are your details.",
    service: "Service",
    barber: "Barber",
    date: "Date",
    time: "Time",
    duration: "Duration",
    total: "Total",
    where: "Where",
    policy: "If you cannot make it, please let us know in good time. A quick call is enough.",
    bye: "See you soon",
    call: "Call us",
  },
};

const LOCALE: Record<Lang, string> = { de: "de-AT", en: "en-GB" };

const INK = "#0A0A0A";
const SURFACE = "#131313";
const BRASS = "#C9A227";
const BONE = "#F4F1EA";
const MUTED = "#9A948C";
const LINE = "#242424";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRole || req.headers.get("Authorization") !== `Bearer ${serviceRole}`) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("BOOKING_FROM_EMAIL") ?? `DEL Herren <onboarding@resend.dev>`;
  if (!apiKey) {
    console.warn("[resend] non configure, e-mail ignore");
    return json({ ok: false, skipped: true });
  }

  const { booking, serviceLabel, barberName } = await req.json();
  const lang: Lang = (["de", "en"] as const).includes(booking?.language)
    ? booking.language
    : "de";
  const c = COPY[lang];

  const prettyDate = new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString(LOCALE[lang], {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:9px 0;color:${MUTED};font-size:11px;letter-spacing:1.4px;text-transform:uppercase;">${label}</td>
      <td align="right" style="padding:9px 0;color:${BONE};font-size:14px;">${value}</td>
    </tr>`;

  const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${c.title}</title></head>
<body style="margin:0;padding:0;background:#f2f0ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;background:${INK};border:1px solid ${LINE};">

        <tr><td align="center" style="padding:38px 32px 10px;">
          <div style="font-family:Georgia,serif;font-size:30px;letter-spacing:6px;color:${BONE};">DEL</div>
          <div style="margin-top:8px;font-size:9px;letter-spacing:6px;color:${BRASS};text-transform:uppercase;">Herren Friseur</div>
        </td></tr>

        <tr><td style="padding:26px 34px 0;">
          <h1 style="margin:0;font-family:Georgia,serif;font-weight:400;font-size:27px;line-height:1.2;color:${BONE};">${c.title}</h1>
          <p style="margin:12px 0 0;color:${MUTED};font-size:14px;line-height:1.6;">${c.hello} ${escapeHtml(booking.client_name)}, ${c.intro}</p>
        </td></tr>

        <tr><td style="padding:24px 34px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};border:1px solid ${LINE};">
            <tr><td style="padding:18px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row(c.service, escapeHtml(serviceLabel))}
                ${row(c.barber, escapeHtml(barberName))}
                ${row(c.date, prettyDate)}
                ${row(c.time, `${booking.start_time} - ${booking.end_time}`)}
                ${row(c.duration, `${booking.duration_min} min`)}
                <tr><td colspan="2" style="border-top:1px solid ${LINE};padding-top:4px;"></td></tr>
                ${row(c.total, `${Number(booking.price).toFixed(2).replace(".", ",")} EUR`)}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:22px 34px 0;">
          <p style="margin:0;color:${MUTED};font-size:11px;letter-spacing:1.4px;text-transform:uppercase;">${c.where}</p>
          <p style="margin:7px 0 0;color:${BONE};font-size:15px;line-height:1.6;">${SALON.address}</p>
          <p style="margin:14px 0 0;">
            <a href="tel:${SALON.phone.replace(/\s/g, "")}" style="display:inline-block;background:${BRASS};color:${INK};text-decoration:none;padding:12px 26px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${c.call}</a>
          </p>
        </td></tr>

        <tr><td style="padding:26px 34px 34px;">
          <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">${c.policy}</p>
          <p style="margin:20px 0 0;font-family:Georgia,serif;font-style:italic;color:${BRASS};font-size:15px;">${c.bye} · ${SALON.shortName}</p>
        </td></tr>

        <tr><td style="padding:16px 34px;border-top:1px solid ${LINE};">
          <p style="margin:0;color:#5f5b56;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;">${SALON.name} · ${SALON.phone}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [booking.client_email],
      subject: c.subject,
      html,
      reply_to: SALON.siteUrl.includes("delherren") ? "termin@delherren.app" : undefined,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("[resend]", res.status, detail);
    return json({ ok: false, error: detail }, 502);
  }

  return json({ ok: true, id: (await res.json())?.id });
});

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
