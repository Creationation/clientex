import type { PromoCode } from "@/data/types";

/**
 * Regles de remise, partagees entre le mode demo, les tests et le rendu.
 * Cote Supabase, la meme logique vit dans quote_promo() et dans l'Edge
 * Function create-booking : le navigateur n'a jamais le dernier mot.
 */

export type PromoRejection = "NOT_FOUND" | "EXPIRED" | "EXHAUSTED" | "MIN_ORDER";

/** Montant deduit pour un code valide, borne au total. Toujours en euros entiers. */
export function discountFor(
  promo: Pick<PromoCode, "discount_type" | "discount_value">,
  subtotal: number,
): number {
  if (subtotal <= 0) return 0;
  const raw =
    promo.discount_type === "percent"
      ? Math.round((subtotal * promo.discount_value) / 100)
      : promo.discount_value;
  return Math.max(0, Math.min(raw, subtotal));
}

/** Verifie un code contre les regles metier. `today` au format YYYY-MM-DD. */
export function checkPromo(
  promo: PromoCode | undefined,
  subtotal: number,
  today: string,
): PromoRejection | null {
  if (!promo || !promo.active) return "NOT_FOUND";
  if (promo.expires_at && promo.expires_at < today) return "EXPIRED";
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) return "EXHAUSTED";
  if (subtotal < promo.min_order) return "MIN_ORDER";
  return null;
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Le client peut-il encore annuler lui-meme ? Vrai tant que le rendez-vous
 * est a plus de `deadlineHours` heures.
 */
export function canSelfCancel(
  bookingDate: string,
  startTime: string,
  deadlineHours: number,
  now: Date = new Date(),
): boolean {
  const start = new Date(`${bookingDate}T${startTime}:00`);
  return start.getTime() - now.getTime() >= deadlineHours * 3_600_000;
}
