import { SALON } from "./cors.ts";

/**
 * Gabarit d'e-mail commun a toutes les fonctions (confirmation, rappel,
 * deplacement, annulation) et envoi via l'API Resend en appel direct.
 *
 * Secrets attendus :
 *   supabase secrets set RESEND_API_KEY=re_...
 *   supabase secrets set BOOKING_FROM_EMAIL="DEL Herren <termin@delherren.app>"
 */

export type Lang = "de" | "en";

export const LOCALE: Record<Lang, string> = { de: "de-AT", en: "en-GB" };

const INK = "#0A0A0A";
const SURFACE = "#131313";
const BRASS = "#C9A227";
const BONE = "#F4F1EA";
const MUTED = "#9A948C";
const LINE = "#242424";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function prettyDate(dateKey: string, lang: Lang): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString(LOCALE[lang], {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function money(value: unknown): string {
  return `${Number(value ?? 0).toFixed(2).replace(".", ",")} EUR`;
}

export interface EmailSpec {
  lang: Lang;
  title: string;
  /** Phrase d'accroche, apres "Hallo Prenom," */
  intro: string;
  clientName: string;
  rows: [string, string][];
  /** Ligne mise en avant sous les details (ancienne heure barree, remise...) */
  note?: string;
  cta?: { label: string; href: string };
  /** Deuxieme bouton, discret (ex: annuler) */
  secondary?: { label: string; href: string };
  footer: string;
  bye: string;
}

export function renderEmail(spec: EmailSpec): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:9px 0;color:${MUTED};font-size:11px;letter-spacing:1.4px;text-transform:uppercase;">${escapeHtml(label)}</td>
      <td align="right" style="padding:9px 0;color:${BONE};font-size:14px;">${value}</td>
    </tr>`;

  const where = spec.lang === "de" ? "Wo" : "Where";
  const call = spec.lang === "de" ? "Anrufen" : "Call us";

  return `<!doctype html>
<html lang="${spec.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(spec.title)}</title></head>
<body style="margin:0;padding:0;background:#f2f0ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;background:${INK};border:1px solid ${LINE};">

        <tr><td align="center" style="padding:38px 32px 10px;">
          <img src="${SALON.siteUrl}/media/logo-paper.png" width="74" alt=""
               style="display:block;margin:0 auto 16px;width:74px;height:auto;border:0;" />
          <div style="font-family:Georgia,serif;font-size:30px;letter-spacing:6px;color:${BONE};">DEL</div>
          <div style="margin-top:8px;font-size:9px;letter-spacing:6px;color:${BRASS};text-transform:uppercase;">Herren Friseur</div>
        </td></tr>

        <tr><td style="padding:26px 34px 0;">
          <h1 style="margin:0;font-family:Georgia,serif;font-weight:400;font-size:27px;line-height:1.2;color:${BONE};">${escapeHtml(spec.title)}</h1>
          <p style="margin:12px 0 0;color:${MUTED};font-size:14px;line-height:1.6;">${spec.lang === "de" ? "Hallo" : "Hi"} ${escapeHtml(spec.clientName)}, ${escapeHtml(spec.intro)}</p>
        </td></tr>

        <tr><td style="padding:24px 34px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};border:1px solid ${LINE};">
            <tr><td style="padding:18px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${spec.rows.map(([l, v]) => row(l, v)).join("")}
              </table>
              ${spec.note ? `<p style="margin:12px 0 0;color:${BRASS};font-size:13px;line-height:1.5;">${spec.note}</p>` : ""}
            </td></tr>
          </table>
        </td></tr>

        ${
          spec.cta
            ? `<tr><td style="padding:22px 34px 0;">
          <a href="${spec.cta.href}" style="display:inline-block;background:${BRASS};color:${INK};text-decoration:none;padding:12px 26px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(spec.cta.label)}</a>
          ${spec.secondary ? `<a href="${spec.secondary.href}" style="display:inline-block;margin-left:10px;color:${MUTED};text-decoration:underline;padding:12px 4px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;">${escapeHtml(spec.secondary.label)}</a>` : ""}
        </td></tr>`
            : ""
        }

        <tr><td style="padding:22px 34px 0;">
          <p style="margin:0;color:${MUTED};font-size:11px;letter-spacing:1.4px;text-transform:uppercase;">${where}</p>
          <p style="margin:7px 0 0;color:${BONE};font-size:15px;line-height:1.6;">${SALON.address}</p>
          <p style="margin:14px 0 0;">
            <a href="tel:${SALON.phone.replace(/\s/g, "")}" style="display:inline-block;border:1px solid ${BRASS};color:${BRASS};text-decoration:none;padding:11px 24px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">${call}</a>
          </p>
        </td></tr>

        <tr><td style="padding:26px 34px 34px;">
          <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">${escapeHtml(spec.footer)}</p>
          <p style="margin:20px 0 0;font-family:Georgia,serif;font-style:italic;color:${BRASS};font-size:15px;">${escapeHtml(spec.bye)} · ${SALON.shortName}</p>
        </td></tr>

        <tr><td style="padding:16px 34px;border-top:1px solid ${LINE};">
          <p style="margin:0;color:#5f5b56;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;">${SALON.name} · ${SALON.phone}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

/** Envoi via Resend. Sans cle configuree, on ignore sans casser l'appelant. */
export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("BOOKING_FROM_EMAIL") ?? "DEL Herren <onboarding@resend.dev>";
  if (!apiKey) {
    console.warn("[resend] non configure, e-mail ignore");
    return { ok: false, skipped: true };
  }
  if (!to || to.endsWith("@delherren.local")) {
    // Adresse de remplissage d'un walk-in saisi par le salon : rien a envoyer.
    return { ok: false, skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      reply_to: SALON.siteUrl.includes("delherren") ? "termin@delherren.app" : undefined,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("[resend]", res.status, detail);
    return { ok: false, error: detail };
  }
  const body = await res.json().catch(() => ({}));
  return { ok: true, id: body?.id };
}

export function manageUrl(token: string): string {
  return `${SALON.siteUrl}/termin/verwalten/${token}`;
}
