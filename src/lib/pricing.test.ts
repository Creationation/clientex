import { describe, expect, it } from "vitest";
import { canSelfCancel, checkPromo, discountFor, normalizeCode } from "./pricing";
import type { PromoCode } from "@/data/types";

const percent: PromoCode = {
  id: "p", code: "WILLKOMMEN10", description: "", discount_type: "percent", discount_value: 10,
  min_order: 0, max_uses: null, current_uses: 0, active: true, expires_at: null,
};
const fixed: PromoCode = { ...percent, id: "f", code: "DEL5", discount_type: "fixed", discount_value: 5, min_order: 25, max_uses: 100 };

describe("discountFor", () => {
  it("pourcentage arrondi a l'euro", () => {
    expect(discountFor(percent, 23)).toBe(2); // 2,3 -> 2
    expect(discountFor(percent, 25)).toBe(3); // 2,5 -> 3
  });
  it("montant fixe, jamais au-dela du total", () => {
    expect(discountFor(fixed, 33)).toBe(5);
    expect(discountFor(fixed, 3)).toBe(3);
  });
  it("rien sur un panier vide", () => {
    expect(discountFor(percent, 0)).toBe(0);
  });
});

describe("checkPromo", () => {
  const today = "2026-09-15";
  it("accepte un code valide", () => {
    expect(checkPromo(percent, 18, today)).toBeNull();
  });
  it("refuse un code inconnu ou inactif", () => {
    expect(checkPromo(undefined, 18, today)).toBe("NOT_FOUND");
    expect(checkPromo({ ...percent, active: false }, 18, today)).toBe("NOT_FOUND");
  });
  it("refuse un code expire, mais l'accepte le jour meme", () => {
    expect(checkPromo({ ...percent, expires_at: "2026-09-14" }, 18, today)).toBe("EXPIRED");
    expect(checkPromo({ ...percent, expires_at: "2026-09-15" }, 18, today)).toBeNull();
  });
  it("refuse un code epuise", () => {
    expect(checkPromo({ ...fixed, current_uses: 100 }, 30, today)).toBe("EXHAUSTED");
  });
  it("refuse sous le montant minimum", () => {
    expect(checkPromo(fixed, 18, today)).toBe("MIN_ORDER");
    expect(checkPromo(fixed, 25, today)).toBeNull();
  });
});

describe("normalizeCode", () => {
  it("majuscules, sans espaces", () => {
    expect(normalizeCode("  del 5 ")).toBe("DEL5");
  });
});

describe("canSelfCancel", () => {
  const now = new Date(2026, 8, 15, 10, 0);
  it("possible a plus de 24 h", () => {
    expect(canSelfCancel("2026-09-16", "10:30", 24, now)).toBe(true);
  });
  it("impossible a moins de 24 h", () => {
    expect(canSelfCancel("2026-09-16", "09:30", 24, now)).toBe(false);
  });
  it("delai a zero : toujours possible avant le debut", () => {
    expect(canSelfCancel("2026-09-15", "10:15", 0, now)).toBe(true);
    expect(canSelfCancel("2026-09-15", "09:45", 0, now)).toBe(false);
  });
});
