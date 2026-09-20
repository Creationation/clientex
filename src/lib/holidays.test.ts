import { describe, expect, it } from "vitest";
import { austrianHolidays, easterSunday, holidayName, isHoliday } from "./holidays";
import { isShopOpen, workWindow } from "./slots";
import { SEED_OPENING_HOURS } from "@/data/seed";

describe("feries autrichiens", () => {
  it("calcule Paques correctement", () => {
    expect(easterSunday(2026).getMonth() + 1).toBe(4);
    expect(easterSunday(2026).getDate()).toBe(5);
    expect(easterSunday(2027).getDate()).toBe(28); // 28 mars 2027
  });
  it("connait les treize feries de 2026", () => {
    const h = austrianHolidays(2026);
    expect(h.size).toBe(13);
    expect(h.get("2026-04-06")).toBe("Ostermontag");
    expect(h.get("2026-05-14")).toBe("Christi Himmelfahrt");
    expect(h.get("2026-06-04")).toBe("Fronleichnam");
    expect(holidayName("2026-10-26")).toBe("Nationalfeiertag");
    expect(isHoliday("2026-10-27")).toBe(false);
  });
  it("ferme le salon et les barbiers un jour ferie", () => {
    const nationalfeiertag = new Date(2026, 9, 26); // un lundi
    expect(isShopOpen(nationalfeiertag, SEED_OPENING_HOURS, [])).toBe(false);
    expect(workWindow(nationalfeiertag, "brb-del", SEED_OPENING_HOURS, [])).toBeNull();
    expect(isShopOpen(new Date(2026, 9, 27), SEED_OPENING_HOURS, [])).toBe(true);
  });
});
