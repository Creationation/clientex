import { describe, expect, it } from "vitest";
import { buildSlots, findNextSlot, freeBarbersAt, workWindow, type SlotContext } from "./slots";
import { SEED_BARBERS, SEED_OPENING_HOURS, SEED_SETTINGS } from "@/data/seed";
import { toDateKey } from "./utils";

// Mercredi 16 septembre 2026, salon ouvert 09:00-19:00
const WED = new Date(2026, 8, 16);
const WED_KEY = toDateKey(WED);
// "Maintenant" : la veille, pour que le delai minimum ne joue pas
const NOW = new Date(2026, 8, 15, 12, 0);

const base: SlotContext = {
  date: WED,
  durationMin: 30,
  barberId: "brb-ali",
  barbers: SEED_BARBERS,
  openingHours: SEED_OPENING_HOURS,
  barberHours: [],
  absences: [],
  busy: [],
  blocked: [],
  settings: SEED_SETTINGS,
  now: NOW,
};

const available = (ctx: SlotContext) => buildSlots(ctx).filter((s) => s.available).map((s) => s.time);
const unavailable = (ctx: SlotContext) => buildSlots(ctx).filter((s) => !s.available).map((s) => s.time);

describe("buildSlots", () => {
  it("couvre l'amplitude du salon par pas de 15 min, dernier depart a 18:30 pour 30 min", () => {
    const times = available(base);
    expect(times[0]).toBe("09:00");
    expect(times[times.length - 1]).toBe("18:30");
    expect(times).toHaveLength(39);
  });

  it("un rendez-vous bloque tout son intervalle, pas seulement son heure de debut", () => {
    const ctx = {
      ...base,
      durationMin: 45,
      busy: [{ barber_id: "brb-ali", booking_date: WED_KEY, start_time: "17:30", end_time: "18:15" }],
    };
    expect(unavailable(ctx)).toEqual(["17:00", "17:15", "17:30", "17:45", "18:00"]);
    expect(available(ctx)).toContain("16:45");
  });

  it("le buffer apres rendez-vous decale les creneaux suivants", () => {
    const ctx = {
      ...base,
      settings: { ...SEED_SETTINGS, buffer_after_min: 15 },
      busy: [{ barber_id: "brb-ali", booking_date: WED_KEY, start_time: "10:00", end_time: "10:30" }],
    };
    expect(available(ctx)).not.toContain("10:30");
    expect(available(ctx)).toContain("10:45");
  });

  it("un blocage du salon entier vaut pour tous les barbiers", () => {
    const ctx = {
      ...base,
      barberId: null,
      blocked: [{ id: "x", barber_id: null, date: WED_KEY, start_time: "12:00", end_time: "14:00", all_day: false, reason: "" }],
    };
    expect(available(ctx)).not.toContain("12:00");
    expect(available(ctx)).not.toContain("13:30");
    expect(available(ctx)).toContain("14:00");
  });

  it("le delai minimum retire les creneaux trop proches le jour meme", () => {
    const ctx = { ...base, now: new Date(2026, 8, 16, 14, 10) }; // lead 60 min -> 15:10
    expect(available(ctx)).not.toContain("15:00");
    expect(available(ctx)).toContain("15:15");
  });

  it("le salon ferme le dimanche : aucun creneau", () => {
    expect(buildSlots({ ...base, date: new Date(2026, 8, 20) })).toEqual([]);
  });
});

describe("horaires propres au barbier", () => {
  it("les horaires du barbier resserrent la plage du salon", () => {
    const ctx = {
      ...base,
      barberHours: [{ barber_id: "brb-ali", weekday: 3, active: true, start_time: "13:00", end_time: "17:00" }],
    };
    const times = available(ctx);
    expect(times[0]).toBe("13:00");
    expect(times[times.length - 1]).toBe("16:30");
  });

  it("un jour libre (active = false) ne donne aucun creneau a ce barbier", () => {
    const ctx = {
      ...base,
      barberHours: [{ barber_id: "brb-ali", weekday: 3, active: false, start_time: "09:00", end_time: "18:00" }],
    };
    expect(available(ctx)).toEqual([]);
  });

  it("les horaires d'un autre barbier n'affectent pas celui-ci", () => {
    const ctx = {
      ...base,
      barberHours: [{ barber_id: "brb-mehmet", weekday: 3, active: false, start_time: "09:00", end_time: "18:00" }],
    };
    expect(available(ctx)).toHaveLength(39);
  });

  it("une absence couvre la date, bornes incluses", () => {
    const abs = [{ id: "a", barber_id: "brb-ali", start_date: "2026-09-14", end_date: "2026-09-16", reason: "" }];
    expect(workWindow(WED, "brb-ali", SEED_OPENING_HOURS, [], abs)).toBeNull();
    expect(workWindow(new Date(2026, 8, 17), "brb-ali", SEED_OPENING_HOURS, [], abs)).not.toBeNull();
  });
});

describe("egal wer", () => {
  it("un creneau reste libre tant qu'un barbier actif est libre", () => {
    const ctx: SlotContext = {
      ...base,
      barberId: null,
      busy: [
        { barber_id: "brb-ali", booking_date: WED_KEY, start_time: "10:00", end_time: "10:30" },
        { barber_id: "brb-mehmet", booking_date: WED_KEY, start_time: "10:00", end_time: "10:30" },
      ],
    };
    expect(available(ctx)).toContain("10:00"); // Serkan est libre
    expect(freeBarbersAt(ctx, "10:00").map((b) => b.id)).toEqual(["brb-serkan"]);
  });

  it("devient indisponible quand les trois sont pris", () => {
    const ctx: SlotContext = {
      ...base,
      barberId: null,
      busy: SEED_BARBERS.map((b) => ({
        barber_id: b.id, booking_date: WED_KEY, start_time: "10:00", end_time: "10:30",
      })),
    };
    expect(available(ctx)).not.toContain("10:00");
    expect(freeBarbersAt(ctx, "10:00")).toEqual([]);
  });

  it("ignore les barbiers inactifs", () => {
    const ctx: SlotContext = {
      ...base,
      barberId: null,
      barbers: SEED_BARBERS.map((b) => (b.id === "brb-serkan" ? { ...b, active: false } : b)),
      busy: [
        { barber_id: "brb-ali", booking_date: WED_KEY, start_time: "10:00", end_time: "10:30" },
        { barber_id: "brb-mehmet", booking_date: WED_KEY, start_time: "10:00", end_time: "10:30" },
      ],
    };
    expect(available(ctx)).not.toContain("10:00");
  });
});

describe("findNextSlot", () => {
  it("saute le dimanche et les journees d'absence", () => {
    // Depart samedi 19 : samedi complet bloque pour Ali, dimanche ferme -> lundi 21
    const sat = new Date(2026, 8, 19);
    const next = findNextSlot(
      {
        ...base,
        absences: [{ id: "a", barber_id: "brb-ali", start_date: "2026-09-19", end_date: "2026-09-19", reason: "" }],
        now: new Date(2026, 8, 18, 8, 0),
      },
      7,
      sat,
    );
    expect(next).toEqual({ date: "2026-09-21", time: "09:00" });
  });

  it("renvoie null quand rien n'est libre sur l'horizon", () => {
    const next = findNextSlot(
      { ...base, barberHours: [1, 2, 3, 4, 5, 6, 0].map((wd) => ({ barber_id: "brb-ali", weekday: wd, active: false, start_time: "09:00", end_time: "18:00" })) },
      14,
      WED,
    );
    expect(next).toBeNull();
  });
});
